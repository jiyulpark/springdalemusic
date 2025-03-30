// pages/api/download.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { supabase } from '../../lib/supabase';

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
    // 1️⃣ 게시글 정보 조회
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('download_permission')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    }

    const requiredLevel = roleLevels[post.download_permission ?? 'guest'];

    // 2️⃣ guest는 누구나 허용
    if (requiredLevel === 0) {
      return await downloadAndTrack(res, postId, filePath);
    }

    // 3️⃣ 서버용 Supabase 클라이언트로 세션 확인
    const supabaseServer = createServerSupabaseClient({ req, res });
    const {
      data: { session },
    } = await supabaseServer.auth.getSession();

    if (!session || !session.user) {
      return res.status(403).json({ error: '로그인이 필요합니다.' });
    }

    const userId = session.user.id;

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(403).json({ error: '유저 정보를 찾을 수 없습니다.' });
    }

    const userLevel = roleLevels[user.role ?? 'guest'];

    if (userLevel < requiredLevel) {
      return res.status(403).json({ error: '다운로드 권한이 없습니다.' });
    }

    // 4️⃣ 다운로드 허용
    return await downloadAndTrack(res, postId, filePath);
  } catch (err) {
    console.error('다운로드 오류:', err);
    return res.status(500).json({ error: '서버 오류 발생' });
  }
}

async function downloadAndTrack(res: NextApiResponse, postId: string, filePath: string) {
  await supabase.rpc('increment_downloads', { post_id_input: postId });

  const { data } = supabase.storage.from('uploads').getPublicUrl(filePath);
  const publicUrl = data?.publicUrl;

  if (!publicUrl) {
    return res.status(500).json({ error: '파일 경로를 찾을 수 없습니다.' });
  }

  return res.redirect(publicUrl);
}
