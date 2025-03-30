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

    // 재시도 로직 추가
    const maxRetries = 3;
    let lastError = null;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const { data: existingUser, error: fetchError } = await Promise.race([
          supabase
            .from('users')
            .select('id')
            .eq('id', user.id)
            .maybeSingle(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('⏰ SELECT 응답 없음 - 타임아웃')), 5000)
          )
        ]);

        console.log('📤 SELECT 결과:', existingUser);

        if (fetchError) {
          console.error(`❌ SELECT 시도 ${i + 1}/${maxRetries} 실패:`, fetchError.message);
          lastError = fetchError;
          if (i < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            continue;
          }
          throw fetchError;
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

        return true;
      } catch (err) {
        console.error(`❌ 시도 ${i + 1}/${maxRetries} 실패:`, err.message);
        lastError = err;
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
          continue;
        }
        throw err;
      }
    }

    throw lastError || new Error('모든 시도 실패');
  } catch (err) {
    console.error('❌ ensureUserInDatabase 내부 에러:', err.message);
    throw err;
  }
}
