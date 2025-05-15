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
    return res.status(200).end();
  }

  // POST 요청만 처리
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('API 호출 시작: /api/admin/update-user');

  try {
    // 요청 본문에서 필요한 데이터 추출
    const { userId, displayName, userToken } = req.body;

    console.log('요청 데이터:', { userId, displayName, hasToken: !!userToken });

    if (!userId || !displayName) {
      return res.status(400).json({ error: 'userId와 displayName이 필요합니다.' });
    }

    // 사용자 인증 확인 (호출자가 관리자인지 확인)
    console.log('사용자 인증 확인 시작');
    const authResponse = await supabaseAdmin.auth.getUser(userToken);
    const { data: { user }, error: authError } = authResponse;
    
    if (authError) {
      console.error('인증 오류:', authError);
      return res.status(401).json({ error: `인증되지 않은 요청입니다: ${authError.message}` });
    }
    
    if (!user) {
      console.error('사용자를 찾을 수 없음');
      return res.status(401).json({ error: '인증되지 않은 요청입니다: 사용자를 찾을 수 없음' });
    }
    
    console.log('인증된 사용자:', user.id);

    // 관리자 권한 확인 (데이터베이스에서 사용자 역할 확인)
    console.log('관리자 권한 확인 시작');
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('사용자 정보 조회 오류:', userError);
      return res.status(500).json({ error: `사용자 정보 조회 실패: ${userError.message}` });
    }
    
    if (!userData) {
      console.error('사용자 정보를 찾을 수 없음');
      return res.status(404).json({ error: '사용자 정보를 찾을 수 없습니다.' });
    }
    
    console.log('사용자 역할:', userData.role);
    
    if (userData.role !== 'admin') {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }

    // 먼저 DB 업데이트 시도
    console.log('데이터베이스 업데이트 시작');
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .update({ nickname: displayName })
      .eq('id', userId);

    if (dbError) {
      console.error('DB 사용자 이름 업데이트 실패:', dbError);
    } else {
      console.log('데이터베이스 업데이트 성공');
    }

    // Auth API를 통한 사용자 메타데이터 업데이트
    console.log('Auth API 업데이트 시작');
    try {
      const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { user_metadata: { name: displayName } }
      );

      if (updateAuthError) {
        console.error('Auth 업데이트 실패:', updateAuthError);
        
        // DB는 업데이트되었으므로 부분 성공 리턴
        if (!dbError) {
          return res.status(200).json({ 
            partialSuccess: true, 
            message: 'DB는 업데이트되었지만 Auth 업데이트에 실패했습니다.',
            error: updateAuthError.message
          });
        }
        
        return res.status(500).json({ error: `Auth 업데이트 실패: ${updateAuthError.message}` });
      }
    } catch (adminError) {
      console.error('Admin API 호출 중 예외 발생:', adminError);
      
      // DB는 업데이트되었으므로 부분 성공 리턴
      if (!dbError) {
        return res.status(200).json({ 
          partialSuccess: true, 
          message: 'DB는 업데이트되었지만 Auth 업데이트에 실패했습니다.',
          error: adminError.message
        });
      }
      
      return res.status(500).json({ error: `Admin API 호출 오류: ${adminError.message}` });
    }

    // 두 업데이트 모두 성공했거나, DB만 성공한 경우
    if (dbError) {
      return res.status(200).json({ 
        partialSuccess: true, 
        message: 'Auth는 업데이트되었지만 DB 업데이트에 실패했습니다.',
        error: dbError.message
      });
    }

    // 전체 성공
    console.log('업데이트 성공 완료');
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('사용자 업데이트 예외 발생:', error);
    return res.status(500).json({ error: `서버 오류: ${error.message}` });
  }
} 