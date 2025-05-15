import { createClient } from '@supabase/supabase-js';

// 서버 측 Supabase 클라이언트 생성 (service_role 키 사용)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONS 요청 처리 (CORS preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ success: true });
  }

  // ✅ POST와 DELETE만 허용하도록 명시
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  console.log('API 호출 시작: /api/account/delete');

  try {
    // 요청 데이터 검증
    if (!req.body) {
      return res.status(400).json({ error: '요청 본문이 비어 있습니다.' });
    }

    const { userId, userToken } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    // 토큰이 제공된 경우 인증 확인 (선택 사항)
    if (userToken) {
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(userToken);
      
      if (authError || !user) {
        return res.status(401).json({ error: '인증되지 않은 요청입니다.' });
      }
      
      // 자신의 계정만 삭제할 수 있음
      if (user.id !== userId) {
        return res.status(403).json({ error: '자신의 계정만 삭제할 수 있습니다.' });
      }
    }

    // 1) DB 사용자 데이터 삭제 (RLS 우회)
    const { error: dbErr } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);
    
    // 실패해도 계속 진행
    if (dbErr) {
      console.error('DB 사용자 삭제 실패:', dbErr.message);
    }

    // 2) Auth 계정 삭제
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authErr) {
      // DB는 삭제됐지만 Auth 삭제 실패
      if (!dbErr) {
        return res.status(500).json({ 
          partialSuccess: true,
          error: authErr.message 
        });
      }
      return res.status(500).json({ error: authErr.message });
    }

    console.log('계정 삭제 완료:', userId);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('계정 삭제 중 오류:', error);
    return res.status(500).json({ error: error.message || '알 수 없는 오류' });
  }
} 