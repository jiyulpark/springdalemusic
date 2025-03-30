// pages/api/download.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase'; // ✅ 여기!! 완벽하게 고쳤사옵니다

const roleLevels: Record<string, number> = {
  guest: 0,
  user: 1,
  verified_user: 2,
  admin: 99,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { postId, filePath } = req.query;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!postId || typeof postId !== 'string' || !filePath || typeof filePath !== 'string') {
    return res.status(400).json({ error: '잘못된 요청입니다.' });
  }

  // 세션 확인
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? null;

  // 게시글 정보 조회
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('download_permission')
    .eq('id', postId)
    .single();

  if (postError || !post) {
    console.error('❌ 게시글 정보 조회 실패:', postError);
    return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
  }

  const requiredRole = post.download_permission ?? 'guest';

  let userRole = 'guest';

  if (userId) {
    const { data: userInfo, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (userInfo?.role) {
      userRole = String(userInfo.role).toLowerCase();
    }

    if (userError) {
      console.warn('⚠️ 유저 정보 조회 실패:', userError.message);
    }
  }

  const normalizedUserRole = userRole.toLowerCase();
  const isAdmin = normalizedUserRole === 'admin';

  if (!isAdmin && (roleLevels[normalizedUserRole] ?? 0) < roleLevels[requiredRole]) {
    return res.status(403).json({ error: '다운로드 권한이 없습니다.' });
  }

  // 다운로드 수 증가
  await supabase.rpc('increment_downloads', { post_id_input: postId });

  // 파일 URL 생성
  const { data: storageData } = supabase.storage.from('uploads').getPublicUrl(filePath);
  const publicUrl = storageData?.publicUrl;

  if (!publicUrl) {
    return res.status(500).json({ error: '파일을 찾을 수 없습니다.' });
  }

  return res.redirect(publicUrl);
}
