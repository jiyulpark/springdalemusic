import { supabase } from './supabase';

// ✅ 유저 권한 조회 함수
export async function getUserRole(userId) {
  try {
    if (!userId) {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.warn('❗ getUserRole: 유저 없음 또는 에러', userError);
        return 'guest';
      }
      userId = user.id;
    }

    const { data: userInfo, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (roleError || !userInfo || !userInfo.role) {
      console.warn('❗ getUserRole: role 조회 실패 또는 없음', roleError);
      return 'guest';
    }

    console.log('✅ getUserRole 결과:', userInfo.role);
    return userInfo.role;
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
        console.warn('❗ 유저 없음 또는 가져오기 실패', error);
        throw new Error("유저 정보 없음");
      }
      user = fetchedUser;
    }

    console.log('🔎 유저 ID:', user.id);

    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle(); // ✅ 안전하게 조회

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.warn('❗ 유저 조회 실패:', fetchError.message);
      throw new Error(fetchError.message);
    }

    if (!existingUser) {
      console.log('🆕 유저가 존재하지 않음, 생성 시도');

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
      console.log('✅ 유저 이미 존재:', user.email);
    }
  } catch (err) {
    console.error('❌ ensureUserInDatabase 내부 에러:', err.message);
    throw err;
  }
}
