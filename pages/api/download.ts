import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '허용되지 않은 메서드입니다.' });
  }

  const { postId, filePath } = req.query;

  if (!postId || typeof postId !== 'string' || !filePath || typeof filePath !== 'string') {
    return res.status(400).json({ error: '요청 파라미터가 유효하지 않습니다.' });
  }

  const supabase = createServerSupabaseClient({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const userId = session?.user?.id || null;

  // 유저 role 가져오기
  let userRole = 'guest';
  if (userId) {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (userData?.role) userRole = userData.role;
  }

  // 게시글 다운로드 권한 확인
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('download_permission')
    .eq('id', postId)
    .single();

  if (postError || !post) {
    return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
  }

  const requiredPermission = post.download_permission;

  // ✅ 등급 숫자 비교 함수
  const isAuthorized = (userRole: string, required: string) => {
    const levels: Record<string, number> = {
      guest: 0,
      user: 1,
      verified_user: 2,
      admin: 3,
    };
    return (levels[userRole] ?? 0) >= (levels[required] ?? 0);
  };

  // 🔒 권한 부족
  if (!isAuthorized(userRole, requiredPermission)) {
    return res.status(403).json({ error: '다운로드 권한이 없습니다.' });
  }

  // 📊 다운로드 수 증가 RPC 호출
  await supabase.rpc('increment_downloads', { post_id_input: postId });

  // ✅ Storage에서 서명된 URL 생성
  const { data: urlData, error: urlError } = await supabase.storage
    .from('uploads')
    .createSignedUrl(filePath, 60); // 유효 시간: 60초

  if (urlError || !urlData?.signedUrl) {
    return res.status(500).json({ error: '파일 다운로드 URL 생성 실패' });
  }

  return res.redirect(urlData.signedUrl);
}
