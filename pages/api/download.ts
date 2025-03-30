// pages/api/download.ts
import { supabase } from '../../lib/supabase';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '허용되지 않은 메서드입니다.' });
  }

  const { postId, filePath } = req.body;

  if (!postId || !filePath) {
    return res.status(400).json({ error: '잘못된 요청입니다.' });
  }

  // 세션 가져오기
  const token = req.headers.authorization?.split(' ')[1] || '';
  let userId = null;
  let userRole = 'guest';

  if (token) {
    const { data, error } = await supabase.auth.getUser(token);
    if (data?.user) {
      userId = data.user.id;
      const { data: userInfo } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();
      if (userInfo?.role) userRole = userInfo.role;
    }
  }

  // 게시물 확인
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('download_permission')
    .eq('id', postId)
    .single();

  if (postError || !post) {
    return res.status(404).json({ error: '게시물을 찾을 수 없습니다.' });
  }

  // 권한 확인
  const requiredLevel = {
    guest: 0,
    user: 1,
    verified_user: 2,
    admin: 3,
  };

  const userLevel = requiredLevel[userRole] ?? 0;
  const postLevel = requiredLevel[post.download_permission] ?? 0;

  if (userLevel < postLevel) {
    return res.status(403).json({ error: '다운로드 권한이 없습니다.' });
  }

  // 다운로드 수 증가
  await supabase.rpc('increment_downloads', { post_id_input: postId });

  // 파일 URL 반환
  const { data: storage } = supabase.storage.from('uploads').getPublicUrl(filePath);
  const downloadUrl = storage?.publicUrl;

  if (!downloadUrl) {
    return res.status(500).json({ error: '파일 URL을 가져올 수 없습니다.' });
  }

  return res.status(200).json({ url: downloadUrl });
}
