import { supabase } from './supabase';

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

    const { data, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (roleError) {
      console.error('❌ getUserRole: role 조회 실패', roleError.message);
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
    return 'guest';
  }
}

// ✅ 유저 자동 등록 함수
export async function ensureUserInDatabase(user) {
  try {
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

    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    console.log('📤 SELECT 결과:', existingUser);
    if (fetchError) {
      console.error('❌ SELECT 에러:', fetchError.message);
      throw new Error(fetchError.message);
    }

    if (!existingUser) {
      console.log('🆕 유저가 존재하지 않음, 삽입 시도');

      const roleToAssign = user.email === 'funlove0268@gmail.com' ? 'admin' : 'guest';

      const { error: insertError } = await supabase.from('users').insert([
        {
          id: user.id,
          email: user.email,
          role: roleToAssign,
          join_date: new Date(),
        }
      ]);

      if (insertError) {
        console.error('❌ INSERT 실패:', insertError.message);
        throw new Error(insertError.message);
      }

      console.log('✅ 유저 삽입 완료');
    } else {
      console.log('✅ 유저 이미 존재함');
    }

    console.log('✅ ensureUserInDatabase 함수 끝까지 실행됨');
  } catch (err) {
    console.error('❌ ensureUserInDatabase 내부 에러:', err.message);
    throw err;
  }
}
