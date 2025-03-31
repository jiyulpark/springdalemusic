import supabase from '../../lib/supabase'; // ✅ default export 사용
import { getUserRoleFromRequest } from '@/utils/auth'; // 세션 기반 유저 역할 판별 함수

export default async function handler(req, res) {
  const { postId, fileUrl, fileName, requiredRole } = req.body;

  if (!postId || !fileUrl || !fileName || !requiredRole) {
    return res.status(400).json({ error: '필수 파라미터 누락' });
  }

  try {
    // 1. 유저 권한 확인
    const userRole = await getUserRoleFromRequest(req);

    const rolePriority = {
      guest: 0,
      user: 1,
      verified_user: 2,
      admin: 3,
    };

    if (!userRole || rolePriority[userRole] < rolePriority[requiredRole]) {
      return res.status(403).json({ error: '다운로드 권한이 없습니다.' });
    }

    // 2. Supabase Storage에서 signed URL 생성
    const { data, error } = await supabase.storage
      .from('uploads') // 버킷 이름
      .createSignedUrl(fileUrl, 60); // 60초간 유효한 URL

    if (error || !data) {
      return res.status(500).json({ error: 'Signed URL 생성 실패' });
    }

    // 3. 다운로드 카운트 증가 (RPC 호출)
    await supabase.rpc('increment_downloads', { post_id_input: postId });

    return res.status(200).json({ url: data.signedUrl });
  } catch (err) {
    console.error('Download API 오류:', err);
    return res.status(500).json({ error: '서버 오류 발생' });
  }
}
