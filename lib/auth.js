import { supabase, executeQuery } from './supabase';

// 중복 호출 방지를 위한 플래그
let isProcessing = false;

// ✅ 유저 권한 조회 함수
export async function getUserRole(userId) {
  try {
    if (!userId) {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        console.error('❌ getUserRole: 유저 정보 없음', error?.message);
        return 'guest';
      }
      userId = user.id;
    }

    console.log('🔍 getUserRole: 유저 ID:', userId);

    // 5초 타임아웃 적용
    const { data, error: roleError } = await Promise.race([
      supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('SELECT 쿼리 타임아웃 (5초)')), 5000)
      )
    ]);

    if (roleError) {
      console.error('❌ getUserRole: role 조회 실패', roleError.message);
      // 캐시된 역할 확인
      const cachedRole = localStorage.getItem('userRole');
      if (cachedRole) {
        console.log('📦 getUserRole: 캐시된 역할 사용:', cachedRole);
        return cachedRole;
      }
      return 'guest';
    }

    if (!data?.role) {
      console.warn('⚠️ getUserRole: role 없음, guest로 처리');
      return 'guest';
    }

    console.log('✅ getUserRole:', data.role);
    return data.role;
  } catch (error) {
    console.error('❌ getUserRole 내부 에러:', error.message);
    // 캐시된 역할 확인
    const cachedRole = localStorage.getItem('userRole');
    if (cachedRole) {
      console.log('📦 getUserRole: 캐시된 역할 사용:', cachedRole);
      return cachedRole;
    }
    return 'guest';
  }
}

// ✅ 유저 존재 여부 확인 함수 (삽입 로직 제거)
export async function ensureUserInDatabase(user) {
  try {
    // 이미 처리 중이면 중복 실행 방지
    if (isProcessing) {
      console.log('⚠️ ensureUserInDatabase 이미 처리 중');
      return true;
    }

    isProcessing = true;
    console.log('🛠 ensureUserInDatabase 시작');

    if (!user) {
      const { data: { user: fetchedUser }, error } = await supabase.auth.getUser();
      if (error || !fetchedUser) {
        console.error('❌ 유저 정보 가져오기 실패:', error?.message);
        throw new Error('유저 정보 없음');
      }
      user = fetchedUser;
    }

    console.log('🔎 유저 ID:', user.id);
    console.log('🧪 SELECT 쿼리 실행 시도');

    // 유저 존재 여부 확인 (초기 연결 시 더 긴 타임아웃 적용)
    let existingUser = null;
    let fetchError = null;

    try {
      // 5초 타임아웃 적용 (3초에서 5초로 증가)
      const result = await Promise.race([
        supabase
          .from('users')
          .select('id, role')
          .eq('id', user.id)
          .maybeSingle(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('SELECT 쿼리 타임아웃 (5초)')), 5000)
        )
      ]);
      
      existingUser = result;
      fetchError = null;
    } catch (err) {
      console.error('❌ SELECT 쿼리 실행 실패:', err.message);
      // 연결 실패 시 사용자가 존재하지 않는다고 가정
      existingUser = null;
      fetchError = null;
    }

    console.log('📤 SELECT 결과:', existingUser);

    if (fetchError) {
      console.error('❌ SELECT 실패:', fetchError.message);
      throw fetchError;
    }

    if (!existingUser) {
      console.log('⚠️ 유저가 데이터베이스에 존재하지 않음. 백엔드 트리거를 통해 생성되기를 기다립니다.');
      // 사용자 생성 코드 제거 - 백엔드 트리거에 의존
    } else {
      console.log('✅ 유저 이미 존재함:', existingUser);
    }

    return true;
  } catch (err) {
    console.error('❌ ensureUserInDatabase 내부 에러:', err.message);
    throw err;
  } finally {
    isProcessing = false;
  }
}
