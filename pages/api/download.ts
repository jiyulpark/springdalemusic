import type { NextApiRequest, NextApiResponse } from 'next';
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
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const user = session?.user || null;
    const userId = user?.id || null;

    // 게시글 권한 확인
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('download_permission')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    }

    const requiredRole = post.download_permission || 'guest';

    // 사용자 권한 조회
    let userRole = 'guest';
    if (userId) {
      const { data: userInfo, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();
      if (userError) {
        console.error('❌ 유저 권한 조회 실패:', userError.message);
      }
      if (userInfo?.role) userRole = userInfo.role;
    }

    // 권한 비교
    if (roleLevels[userRole] < roleLevels[requiredRole]) {
      console.warn(`⛔ 사용자 권한 부족: ${userRole} < ${requiredRole}`);
      return res.status(403).json({ error: '다운로드 권한이 없습니다.' });
    }

    // 파일 경로 확인
    const { data: storageData } = supabase.storage.from('uploads').getPublicUrl(filePath);
    console.log('📦 파일 public URL:', storageData?.publicUrl);

    if (!storageData?.publicUrl) {
      return res.status(500).json({ error: '파일 URL 생성 실패' });
    }

    // 다운로드 수 증가
    const { error: rpcError } = await supabase.rpc('increment_downloads', {
      post_id_input: postId,
    });
    if (rpcError) {
      console.error('❌ 다운로드 수 증가 실패:', rpcError.message);
    }

    // 리디렉션
    return res.redirect(storageData.publicUrl);
  } catch (err: any) {
    console.error('❌ 다운로드 API 전체 실패:', err.message || err);
    return res.status(500).json({ error: '서버 내부 오류' });
  }
}
