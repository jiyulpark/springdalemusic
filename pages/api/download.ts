// pages/api/download.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { supabase } from '../../lib/supabase';

const roleLevels = {
  guest: 0,
  user: 1,
  verified_user: 2,
  admin: 3
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { postId, filePath } = req.query;

  if (!postId || !filePath || typeof postId !== 'string' || typeof filePath !== 'string') {
    return res.status(400).json({ error: 'Invalid parameters' });
  }

  const supabaseServerClient = createServerSupabaseClient({ req, res });
  const {
    data: { session },
  } = await supabaseServerClient.auth.getSession();

  const userId = session?.user?.id || null;

  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('id, download_permission')
    .eq('id', postId)
    .single();

  if (postError || !post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  let userRole = 'guest';

  if (userId) {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (userError) {
      console.warn('⚠️ 사용자 권한 조회 실패:', userError.message);
    } else {
      userRole = user.role || 'guest';
    }
  }

  const requiredRole = post.download_permission || 'guest';

  if (roleLevels[userRole] < roleLevels[requiredRole]) {
    return res.status(403).json({ error: '다운로드 권한이 없습니다.' });
  }

  const { data: storageData } = supabase.storage
    .from('uploads')
    .getPublicUrl(filePath);

  const publicUrl = storageData?.publicUrl;

  if (!publicUrl) {
    return res.status(500).json({ error: '파일 URL을 가져올 수 없습니다.' });
  }

  await supabase.rpc('increment_downloads', { post_id_input: postId });

  res.writeHead(302, { Location: publicUrl });
  res.end();
}
