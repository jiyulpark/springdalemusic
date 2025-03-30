// pages/api/download.ts
import { supabase } from '../../lib/supabase';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '허용되지 않은 메서드입니다.' });
  }

  const { postId, filePath } = req.body;

  if (!postId || !filePath) {
    return res.status(400).json({ error: 'postId 또는 filePath가 없습니다.' });
  }

  try {
    // 🛡️ 권한 체크 생략 불가 - 유지
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: '로그인이 필요합니다.' });

    const { data: userInfo, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userInfo?.user) {
      return res.status(401).json({ error: '세션이 유효하지 않습니다.' });
    }

    const userId = userInfo.user.id;

    const { data: userData, error: fetchUserError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (fetchUserError || !userData) {
      return res.status(403).json({ error: '권한 조회 실패' });
    }

    const userRole = userData.role;

    const { data: postData, error: postError } = await supabase
      .from('posts')
      .select('download_permission, downloads')
      .eq('id', postId)
      .single();

    if (postError || !postData) {
      return res.status(404).json({ error: '게시글이 존재하지 않습니다.' });
    }

    const { download_permission, downloads } = postData;

    // ✅ 권한 순서 비교
    const roleOrder = ['guest', 'user', 'verified_user', 'admin'];
    const userLevel = roleOrder.indexOf(userRole);
    const requiredLevel = roleOrder.indexOf(download_permission);

    if (userLevel < requiredLevel) {
      return res.status(403).json({ error: '다운로드 권한이 없습니다.' });
    }

    // 🔼 다운로드 수 증가
    await supabase
      .from('posts')
      .update({ downloads: downloads + 1 })
      .eq('id', postId);

    // ✅ public 버킷이므로 getPublicUrl 사용
    const { data: fileData } = supabase.storage
      .from('uploads')
      .getPublicUrl(filePath);

    if (!fileData?.publicUrl) {
      return res.status(500).json({ error: '다운로드 URL 생성 실패' });
    }

    return res.status(200).json({
      success: true,
      url: fileData.publicUrl,
    });
  } catch (error) {
    console.error('🔥 다운로드 처리 중 오류:', error);
    return res.status(500).json({ error: '서버 오류 발생' });
  }
}
