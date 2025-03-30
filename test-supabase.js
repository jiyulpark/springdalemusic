const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('=== Supabase 설정 정보 ===');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseAnonKey ? '설정됨' : '미설정');
console.log('========================');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('\n=== Supabase 연결 테스트 시작 ===');
  
  try {
    // 1. 인증 테스트
    console.log('\n1. 인증 테스트');
    const { data: authData, error: authError } = await supabase.auth.getSession();
    console.log('인증 결과:', authError ? `에러: ${authError.message}` : '성공');
    if (authData?.session) {
      console.log('세션 정보:', {
        user_id: authData.session.user.id,
        expires_at: new Date(authData.session.expires_at * 1000).toLocaleString()
      });
    }

    // 2. 데이터베이스 연결 테스트
    console.log('\n2. 데이터베이스 연결 테스트');
    const { data: dbData, error: dbError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    console.log('DB 연결 결과:', dbError ? `에러: ${dbError.message}` : '성공');
    if (dbData) {
      console.log('첫 번째 유저:', {
        id: dbData[0]?.id,
        email: dbData[0]?.email,
        role: dbData[0]?.role
      });
    }

    // 3. 스토리지 연결 테스트
    console.log('\n3. 스토리지 연결 테스트');
    const { data: storageData, error: storageError } = await supabase
      .storage
      .from('uploads')
      .list();
    console.log('스토리지 연결 결과:', storageError ? `에러: ${storageError.message}` : '성공');
    if (storageData) {
      console.log('파일 목록:', storageData.map(file => ({
        name: file.name,
        size: file.metadata?.size,
        updated_at: new Date(file.updated_at).toLocaleString()
      })));
    }

    // 4. 실시간 연결 테스트
    console.log('\n4. 실시간 연결 테스트');
    const channel = supabase.channel('test');
    const subscription = channel
      .on('presence', { event: 'sync' }, () => {
        console.log('실시간 연결 성공');
        subscription.unsubscribe();
      })
      .subscribe();

    // 5. RLS 정책 테스트
    console.log('\n5. RLS 정책 테스트');
    const { data: rlsData, error: rlsError } = await supabase
      .from('posts')
      .select('*')
      .limit(1);
    console.log('RLS 정책 결과:', rlsError ? `에러: ${rlsError.message}` : '성공');
    if (rlsData) {
      console.log('첫 번째 게시글:', {
        id: rlsData[0]?.id,
        title: rlsData[0]?.title,
        user_id: rlsData[0]?.user_id
      });
    }

    console.log('\n=== 테스트 완료 ===');
  } catch (error) {
    console.error('\n❌ 테스트 중 오류 발생:', error);
    console.error('스택 트레이스:', error.stack);
  }
}

// 테스트 실행
testConnection().catch(error => {
  console.error('\n❌ 치명적인 오류 발생:', error);
  console.error('스택 트레이스:', error.stack);
}); 