// pages/api/download.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';

const roleLevels = {
  guest: 0,
  user: 1,
  verified_user: 2,
  admin: 3,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createServerSupabaseClient({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session || !session.user) {
    console.log("❌ 세션 없음. 비회원 접근.");
    return res.status(403).json({ error: '로그인이 필요합니다.' });
  }

  const { postId, filePath } = req.query;

  if (!postId || typeof postId !== 'string' || !filePath || typeof filePath !== 'string') {
    return res.status(400).json({ error: '잘못된 요청입니다.' });
  }

  try {
    const userId = session.user.id;

    // 🔍 현재 로그인한 유저 role 가져오기
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    console.log("🔍 유저 ID:", userId);
    console.log("📤 유저 정보:", userData);
    console.log("🐞 userError:", userError);

    if (!userData || !userData.role) {
      return res.status(403).json({ error: '사용자 권한 정보를 불러올 수 없습니다.' });
    }

    const userRole = userData.role;
    console.log("✅ userRole 확인:", userRole);

    const { data: postData, error: postError } = await supabase
      .from('posts')
      .select('download_permission, downloads')
      .eq('id', postId)
      .single();

    if (postError || !postData) {
      console.log("❌ 게시글 조회 실패:", postError);
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    }

    const requiredRole = postData.download_permission || 'guest';
    console.log("🛡 게시글 필요 권한:", requiredRole);

    if (roleLevels[userRole] < roleLevels[requiredRole]) {
      console.log("🚫 다운로드 권한 부족");
      return res.status(403).json({ error: '다운로드 권한이 없습니다.' });
    }

    // ✅ 다운로드 수 증가
    const { error: updateError } = await supabase
      .rpc('increment_downloads', { post_id_input: postId });

    if (updateError) {
      console.log("❌ 다운로드 수 증가 실패:", updateError.message);
      return res.status(500).json({ error: '다운로드 수 업데이트 실패' });
    }

    // ✅ 파일 URL 생성
    const { data: publicUrlData } = supabase
      .storage
      .from('uploads')
      .getPublicUrl(filePath);

    if (!publicUrlData?.publicUrl) {
      return res.status(500).json({ error: '파일 링크 생성 실패' });
    }

    // 🔁 파일 링크로 리디렉션
    return res.redirect(302, publicUrlData.publicUrl);

  } catch (error) {
    console.error('🔥 서버 에러:', error);
    return res.status(500).json({ error: '서버 에러가 발생했습니다.' });
  }
}
