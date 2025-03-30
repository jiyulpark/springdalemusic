// pages/api/download.ts

import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { supabase } from '@/lib/supabase';

const roleLevels = {
  guest: 0,
  user: 1,
  verified_user: 2,
  admin: 3,
};

export default async function handler(req, res) {
  const { postId, filePath } = req.query;

  if (!postId || !filePath) {
    return res.status(400).json({ error: '잘못된 요청입니다.' });
  }

  const supabaseServerClient = createServerSupabaseClient({ req, res });
  const {
    data: { session },
  } = await supabaseServerClient.auth.getSession();

  // 세션 없을 경우 guest로 간주
  const user = session?.user || null;
  const userId = user?.id || null;

  // 1. 게시글의 다운로드 권한 가져오기
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('download_permission')
    .eq('id', postId)
    .single();

  if (postError || !post) {
    return res.status(404).json({ error: '게시물을 찾을 수 없습니다.' });
  }

  const requiredRole = post.download_permission || 'guest';

  // 2. 유저 권한 가져오기
  let userRole = 'guest';
  if (userId) {
    const { data: userInfo, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    if (userInfo?.role) userRole = userInfo.role;
  }

  // 3. 권한 레벨 비교
  if (roleLevels[userRole] < roleLevels[requiredRole]) {
    return res.status(403).json({ error: '다운로드 권한이 없습니다.' });
  }

  // 4. Storage에서 다운로드 URL 발급
  const { data } = supabase.storage.from('uploads').getPublicUrl(filePath);
  if (!data?.publicUrl) {
    return res.status(500).json({ error: '파일 URL을 찾을 수 없습니다.' });
  }

  // 5. 다운로드 수 증가 (RPC 호출)
  await supabase.rpc('increment_downloads', { post_id_input: postId });

  // 6. 실제 파일로 리디렉션
  return res.redirect(data.publicUrl);
}
