import { createClient } from '@supabase/supabase-js';

// 서버 측 Supabase 클라이언트 생성 (service_role 키 사용)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // POST 요청만 처리
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 요청 본문에서 필요한 데이터 추출
    const { userId, displayName, userToken } = req.body;

    if (!userId || !displayName) {
      return res.status(400).json({ error: 'userId와 displayName이 필요합니다.' });
    }

    // 사용자 인증 확인 (호출자가 관리자인지 확인)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(userToken);
    
    if (authError || !user) {
      return res.status(401).json({ error: '인증되지 않은 요청입니다.' });
    }

    // 관리자 권한 확인 (데이터베이스에서 사용자 역할 확인)
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || userData.role !== 'admin') {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }

    // 1. Auth API를 통한 사용자 메타데이터 업데이트
    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { user_metadata: { name: displayName } }
    );

    if (updateAuthError) {
      return res.status(500).json({ error: `Auth 업데이트 실패: ${updateAuthError.message}` });
    }

    // 2. 데이터베이스 nickname 필드도 업데이트
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .update({ nickname: displayName })
      .eq('id', userId);

    if (dbError) {
      // Auth는 업데이트되었지만 DB 업데이트 실패
      console.error('DB 사용자 이름 업데이트 실패:', dbError.message);
      return res.status(500).json({ error: `DB 업데이트 실패: ${dbError.message}`, partialSuccess: true });
    }

    // 성공 응답
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('사용자 업데이트 오류:', error);
    return res.status(500).json({ error: `서버 오류: ${error.message}` });
  }
} 