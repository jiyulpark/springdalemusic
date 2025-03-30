import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase'; // ← 중요!!

const roleLevels = {
  guest: 0,
  user: 1,
  verified_user: 2,
  admin: 3,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { postId, filePath } = req.query;

  if (!postId || !filePath || typeof postId !== 'string' || typeof filePath !== 'string') {
    return res.status(400).json({ error: '잘못된 요청입니다.' });
  }

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const user = session?.user || null;
    const userId = user?.id || null;

    const { data: post } = await supabase
      .from('posts')
      .select('download_permission')
      .eq('id', postId)
      .single();

    if (!post) return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });

    const requiredRole = post.download_permission || 'guest';

    let userRole = 'guest';
    if (userId) {
      const { data: userInfo } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();
      if (userInfo?.role) userRole = userInfo.role;
    }

    if (roleLevels[userRole] < roleLevels[requiredRole]) {
      return res.status(403).json({ error: '다운로드 권한이 없습니다.' });
    }

    const { data } = supabase.storage.from('uploads').getPublicUrl(filePath);
    if (!data?.publicUrl) {
      return res.status(500).json({ error: '파일 URL 생성 실패' });
    }

    await supabase.rpc('increment_downloads', { post_id_input: postId });

    return res.redirect(data.publicUrl);
  } catch (err: any) {
    console.error('❌ 다운로드 처리 중 오류:', err.message || err);
    return res.status(500).json({ error: '서버 오류' });
  }
}
