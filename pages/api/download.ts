// pages/api/download.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase'; // 절대경로 대신 상대경로

const roleLevels: Record<string, number> = {
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

    // 게시글 다운로드 권한 불러오기
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('download_permission')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      console.error('❌ 게시글 조회 실패:', postError?.message);
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    }

    const requiredRole = post.download_permission?.toLowerCase() || 'guest';

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

      if (userInfo?.role) {
        userRole = userInfo.role.toLowerCase();
      }
    }

    // ✅ 디버깅 로그
    console.log('🧑‍💻 로그인 유저 ID:', userId);
    console.log('📌 유저 권한:', userRole);
    console.log('📌 게시글 다운로드 요구 권한:', requiredRole);

    // ✅ 관리자 우선 허용
    if (userRole !== 'admin' && roleLevels[userRole] < roleLevels[requiredRole]) {
      console.warn(`⛔ 다운로드 권한 부족: ${userRole} < ${requiredRole}`);
      return res.status(403).json({ error: '다운로드 권한이 없습니다.' });
    }

    // ✅ Public URL 생성
    const storageResult = supabase.storage.from('uploads').getPublicUrl(filePath);
    const publicUrl = storageResult?.data?.publicUrl;

    if (!publicUrl) {
      console.error('❌ 파일 URL 생성 실패:', filePath);
      return res.status(500).json({ error: '파일 URL 생성 실패' });
    }

    // ✅ 다운로드 수 증가 (RPC)
    const { error: rpcError } = await supabase.rpc('increment_downloads', {
      post_id_input: postId,
    });

    if (rpcError) {
      console.error('❌ 다운로드 수 증가 실패:', rpcError.message);
    } else {
      console.log(`✅ 다운로드 수 증가 완료 (postId: ${postId})`);
    }

    // ✅ 다운로드 리디렉션
    return res.redirect(publicUrl);
  } catch (err: any) {
    console.error('❌ 다운로드 API 처리 중 에러:', err.message || err);
    return res.status(500).json({ error: '서버 내부 오류 발생' });
  }
}
