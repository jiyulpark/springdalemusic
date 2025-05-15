import { createClient } from '@supabase/supabase-js';

// 서버 측 Supabase 클라이언트 생성 (service_role 키 사용)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONS 요청 처리 (CORS preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ success: true });
  }

  // POST 요청만 처리
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('API 호출 시작: /api/account/delete');

  try {
    // 요청 데이터 검증
    if (!req.body) {
      return res.status(400).json({ error: '요청 본문이 비어 있습니다.' });
    }

    // 요청 본문에서 필요한 데이터 추출
    const { userId, userToken } = req.body;

    console.log('요청 데이터:', { userId, hasToken: !!userToken });

    if (!userId) {
      return res.status(400).json({ error: 'userId가 필요합니다.' });
    }

    if (!userToken) {
      return res.status(400).json({ error: '인증 토큰이 필요합니다.' });
    }

    // 사용자 인증 확인
    console.log('사용자 인증 확인 시작');
    
    let authResponse;
    try {
      authResponse = await supabaseAdmin.auth.getUser(userToken);
    } catch (authApiError) {
      console.error('Auth API 호출 오류:', authApiError);
      return res.status(500).json({ error: `인증 API 오류: ${authApiError.message}` });
    }
    
    const { data: { user }, error: authError } = authResponse;
    
    if (authError) {
      console.error('인증 오류:', authError);
      return res.status(401).json({ error: `인증되지 않은 요청입니다: ${authError.message}` });
    }
    
    if (!user) {
      console.error('사용자를 찾을 수 없음');
      return res.status(401).json({ error: '인증되지 않은 요청입니다: 사용자를 찾을 수 없음' });
    }
    
    // 자신의 계정만 삭제할 수 있음
    if (user.id !== userId) {
      console.error('권한 오류: 다른 사용자의 계정을 삭제하려고 시도');
      return res.status(403).json({ error: '자신의 계정만 삭제할 수 있습니다.' });
    }
    
    console.log('인증된 사용자:', user.id);

    // 1. 데이터베이스에서 사용자 데이터 삭제
    let dbResponse;
    try {
      dbResponse = await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', userId);
    } catch (dbApiError) {
      console.error('DB API 호출 오류:', dbApiError);
      return res.status(500).json({ error: `데이터베이스 API 오류: ${dbApiError.message}` });
    }
    
    const { error: dbError } = dbResponse;
    
    if (dbError) {
      console.error('DB 사용자 삭제 실패:', dbError);
      // DB 삭제 실패해도 계속 진행 (Auth 계정은 삭제)
    } else {
      console.log('데이터베이스 사용자 삭제 성공');
    }

    // 2. Auth에서 사용자 계정 삭제
    console.log('Auth 사용자 삭제 시작');
    
    let deleteResponse;
    try {
      deleteResponse = await supabaseAdmin.auth.admin.deleteUser(userId);
    } catch (deleteApiError) {
      console.error('Auth 삭제 API 호출 오류:', deleteApiError);
      
      // DB는 삭제되었지만 Auth API 호출 실패
      if (!dbError) {
        return res.status(500).json({
          partialSuccess: true,
          error: `Auth API 호출 오류: ${deleteApiError.message}`
        });
      }
      
      return res.status(500).json({ error: `Auth API 호출 오류: ${deleteApiError.message}` });
    }
    
    const { error: deleteError } = deleteResponse;

    if (deleteError) {
      console.error('Auth 사용자 삭제 실패:', deleteError);
      
      // DB는 삭제되었지만 Auth 삭제 실패
      if (!dbError) {
        return res.status(500).json({
          partialSuccess: true,
          error: `Auth 사용자 삭제 실패: ${deleteError.message}`
        });
      }
      
      return res.status(500).json({ error: `사용자 삭제 실패: ${deleteError.message}` });
    }

    console.log('계정 삭제 완료:', userId);
    return res.status(200).json({ success: true, message: '계정이 성공적으로 삭제되었습니다.' });
  } catch (error) {
    console.error('계정 삭제 중 예외 발생:', error);
    return res.status(500).json({ error: `서버 오류: ${error.message || '알 수 없는 오류'}` });
  }
} 