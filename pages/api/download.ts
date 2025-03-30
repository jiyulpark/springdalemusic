import { supabase } from '../../lib/supabase';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '허용되지 않은 메서드입니다.' });
  }

  const { postId, filePath } = req.body;

  // 🔥 filePath가 string이 아니라 객체일 수도 있음!
  const finalPath = typeof filePath === 'string' 
    ? filePath 
    : filePath?.file_url;

  if (!postId) {
    return res.status(400).json({ error: 'postId가 없습니다.' });
  }
  if (!finalPath) {
    return res.status(400).json({ error: '파일 경로가 없습니다.' });
  }

  try {
    // 🔐 세션 토큰 처리
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: '로그인이 필요합니다.' });

    const { data: userInfo, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userInfo?.user) {
      return res.status(401).json({ error: '세션이 유효하지 않습니다.' });
    }

    const userId = userInfo.user.id;

    const { data: userData, error: userFetchError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (userFetchError || !userData) {
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

    const roleOrder = ['guest', 'user', 'verified_user', 'admin'];
    const userLevel = roleOrder.indexOf(userRole);
    const requiredLevel = roleOrder.indexOf(download_permission);

    if (userLevel < requiredLevel) {
      return res.status(403).json({ error: '다운로드 권한이 없습니다.' });
    }

    await supabase
      .from('posts')
      .update({ downloads: downloads + 1 })
      .eq('id', postId);

    const { data: fileData, error: fileError } = await supabase.storage
      .from('uploads') // 버킷명 정확히 확인
      .createSignedUrl(finalPath.replace('uploads/', ''), 60); // 🔥 경로에서 'uploads/' 제거

    if (fileError || !fileData?.signedUrl) {
      return res.status(500).json({ error: '다운로드 URL 생성 실패' });
    }

    return res.status(200).json({ success: true, url: fileData.signedUrl });
  } catch (error) {
    console.error('🔥 서버 오류:', error);
    return res.status(500).json({ error: '서버 오류 발생' });
  }
}
