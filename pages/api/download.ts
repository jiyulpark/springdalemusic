// pages/api/download.ts
import { supabase } from '../../lib/supabase'; // 경로 절대확신
import type { NextApiRequest, NextApiResponse } from 'next';

const roleLevels = {
  guest: 0,
  user: 1,
  verified_user: 2,
  admin: 3,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { postId, filePath } = req.query;

  if (!postId || !filePath || typeof postId !== 'string' || typeof filePath !== 'string') {
    return res.status(400).json({ error: '필수 정보가 누락되었습니다.' });
  }

  try {
    // 1️⃣ 게시글 정보 가져오기
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('download_permission')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    }

    const requiredLevel = roleLevels[post.download_permission] ?? 0;

    // 2️⃣ guest이면 로그인 체크 없이 다운로드 허용
    if (requiredLevel === 0) {
      return await downloadAndTrack(res, postId, filePath);
    }

    // 3️⃣ 세션 가져오기
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session || !session.user) {
      return res.status(403).json({ error: '로그인이 필요합니다.' });
    }

    const userId = session.user.id;

    // 4️⃣ 유저 role 확인
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(403).json({ error: '유저 정보를 찾을 수 없습니다.' });
    }

    const userLevel = roleLevels[user.role] ?? 0;

    if (userLevel < requiredLevel) {
      return res.status(403).json({ error: '다운로드 권한이 없습니다.' });
    }

    // 5️⃣ 다운로드 허용
    return await downloadAndTrack(res, postId, filePath);
  } catch (err) {
    console.error('다운로드 에러:', err);
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}

// 🎯 실제 다운로드 및 다운로드 수 증가 처리
async function downloadAndTrack(res: NextApiResponse, postId: string, filePath: string) {
  // 1. 다운로드 수 증가
  await supabase.rpc('increment_downloads', { post_id_input: postId });

  // 2. public URL 생성
  const { data } = supabase.storage.from('uploads').getPublicUrl(filePath);
  const publicUrl = data?.publicUrl;

  if (!publicUrl) {
    return res.status(500).json({ error: '파일 경로를 찾을 수 없습니다.' });
  }

  // 3. 리다이렉트
  return res.redirect(publicUrl);
}
