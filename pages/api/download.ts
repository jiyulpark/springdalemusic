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
    // ✅ 토큰 추출
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    // ✅ 사용자 인증
    const { data: userInfo, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userInfo?.user) {
      return res.status(401).json({ error: '세션이 유효하지 않습니다.' });
    }

    const userId = userInfo.user.id;

    // ✅ 유저 역할 확인
    const { data: userData, error: fetchUserError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (fetchUserError || !userData) {
      return res.status(403).json({ error: '권한 조회 실패' });
    }

    const userRole = userData.role; // admin, verified_user, user, guest

    // ✅ 게시글 다운로드 권한 확인
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

    // ✅ 파일 경로 정리
    const rawPath = typeof filePath === 'string'
      ? filePath
      : filePath?.file_url;

    const finalPath = rawPath?.startsWith('uploads/')
      ? rawPath.replace('uploads/', '')
      : rawPath;

    // ✅ 다운로드 수 증가
    await supabase
      .from('posts')
      .update({ downloads: downloads + 1 })
      .eq('id', postId);

    // ✅ 서명된 URL 생성
    const { data: fileData, error: fileError } = await supabase.storage
      .from('uploads') // 🔥 uploads = 버킷 이름
      .createSignedUrl(finalPath, 60);

    if (fileError || !fileData?.signedUrl) {
      return res.status(500).json({ error: '다운로드 URL 생성 실패' });
    }

    return res.status(200).json({
      success: true,
      url: fileData.signedUrl,
    });
  } catch (error) {
    console.error('🔥 서버 오류:', error);
    return res.status(500).json({ error: '서버 오류 발생' });
  }
}
