import { supabase } from './supabase';

//
// ✅ 유저 권한 조회 함수
//
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

//
// ✅ 유저 자동 등록 함수
//
export async function ensureUserInDatabase(user) {
  try {
    console.log('🛠 ensureUserInDatabase 시작');

    // 유저가 없으면 다시 요청
    if (!user) {
      const { data: { user: fetchedUser }, error } = await supabase.auth.getUser();
      if (error || !fetchedUser) {
        console.error('❌ 유저 정보 가져오기 실패:', error?.message);
        throw new Error('유저 정보 없음');
      }
      user = fetchedUser;
    }

    console.log('🔎 유저 ID:', user.id);

    // 유저 존재 여부 확인
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (fetchError) {
      console.error('❌ 유저 조회 실패:', fetchError.message);
      throw new Error(fetchError.message);
    }

    // 유저가 없으면 생성
    if (!existingUser) {
      console.log('🆕 신규 유저, 생성 시도 중...');

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
        console.error('❌ 유저 생성 실패:', insertError.message);
        throw new Error(insertError.message);
      }

      console.log('✅ 유저 생성 완료:', user.email, `→ 역할: ${roleToAssign}`);
    } else {
      console.log('✅ 유저 이미 존재:', user.email || user.id);
    }
  } catch (err) {
    console.error('❌ ensureUserInDatabase 내부 에러:', err.message);
    throw err;
  }
}
