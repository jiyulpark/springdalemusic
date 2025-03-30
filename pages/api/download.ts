// pages/api/download.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { roleLevels } from '../../utils/roleLevels';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '허용되지 않은 메서드입니다.' });
  }

  const supabase = createServerSupabaseClient({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return res.status(401).json({ error: '로그인이 필요합니다.' });
  }

  const { postId, filePath } = req.body;

  if (!postId || !filePath) {
    return res.status(400).json({ error: '필수 정보가 누락되었습니다.' });
  }

  // 게시물 정보 가져오기
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('id, downloads, download_permission')
    .eq('id', postId)
    .single();

  if (postError || !post) {
    return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
  }

  // 사용자 권한 조회
  const { data: userInfo, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (userError || !userInfo) {
    return res.status(403).json({ error: '권한 정보를 가져오지 못했습니다.' });
  }

  const userRoleLevel = roleLevels[userInfo.role] ?? 0;
  const requiredLevel = roleLevels[post.download_permission] ?? 0;

  if (userRoleLevel < requiredLevel) {
    return res.status(403).json({ error: '다운로드 권한이 없습니다.' });
  }

  // 다운로드 수 증가
  await supabase.rpc('increment_downloads', { post_id_input: postId });

  // 파일 공개 URL 생성
  const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(filePath);
  const downloadUrl = urlData?.publicUrl;

  if (!downloadUrl) {
    return res.status(500).json({ error: '다운로드 URL 생성 실패' });
  }

  return res.status(200).json({ url: downloadUrl });
}
