// pages/api/download.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';

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
    // 1️⃣ Supabase 세션 가져오기
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const user = session?.user || null;
    const userId = user?.id || null;

    // 2️⃣ 게시글에서 권한 확인
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('download_permission')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      console.error('❌ 게시글 조회 실패:', postError?.message);
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    }

    const requiredRole = (post.download_permission ?? 'guest').toLowerCase();

    // 3️⃣ 유저 권한 확인
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
        userRole = userInfo.role.toLowerCase(); // 대소문자 방지
      }
    }

    // ✅ 로그 출력 for 디버깅
    console.log('🧑‍💻 로그인 유저 ID:', userId);
    console.log('📌 유저 권한:', userRole);
    console.log('📌 게시글 권한:', requiredRole);
    console.log('📊 비교:', {
      userLevel: roleLevels[userRole],
      requiredLevel: roleLevels[requiredRole],
      isAdmin: userRole === 'admin',
    });

    // 4️⃣ 권한 체크
    const isAdmin = userRole === 'admin';

    if (!isAdmin && roleLevels[userRole] < roleLevels[requiredRole]) {
      console.warn(`⛔ 다운로드 차단: ${userRole} < ${requiredRole}`);
      return res.status(403).json({ error: '다운로드 권한이 없습니다.' });
    }

    // 5️⃣ 파일 URL 생성
    const { data: storageData } = supabase.storage.from('uploads').getPublicUrl(filePath);
    const publicUrl = storageData?.publicUrl;

    if (!publicUrl) {
      console.error('❌ 파일 URL 생성 실패:', filePath);
      return res.status(500).json({ error: '파일 URL 생성 실패' });
    }

    // 6️⃣ 다운로드 수 증가
    const { error: rpcError } = await supabase.rpc('increment_downloads', {
      post_id_input: postId,
    });

    if (rpcError) {
      console.error('❌ 다운로드 수 증가 실패:', rpcError.message);
    } else {
      console.log(`✅ 다운로드 수 증가 완료 (postId: ${postId})`);
    }

    // 7️⃣ 다운로드 시작
    return res.redirect(publicUrl);
  } catch (err: any) {
    console.error('❌ 다운로드 API 처리 중 에러:', err.message || err);
    return res.status(500).json({ error: '서버 내부 오류 발생' });
  }
}
