// lib/auth.js
import { supabase } from './supabase';

// 🔥 현재 로그인한 사용자의 권한을 가져오는 함수
export async function getUserRole() {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.warn('❗ getUserRole: 유저 없음 또는 에러', userError);
      return 'guest';
    }

    const { data: userInfo, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (roleError || !userInfo) {
      console.warn('❗ getUserRole: role 조회 실패', roleError);
      return 'guest';
    }

    console.log('✅ getUserRole 결과:', userInfo.role);
    return userInfo.role;
  } catch (error) {
    console.error('❌ getUserRole 내부 에러:', error);
    return 'guest';
  }
}

// 🔥 유저를 `users` 테이블에 자동 추가하는 함수
export async function ensureUserInDatabase() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      console.warn('❗ ensureUserInDatabase: 유저 없음 또는 에러', error);
      return;
    }

    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    if (fetchError || !existingUser) {
      console.log('🔹 새로운 유저 추가 중:', user.email);

      const { error: insertError } = await supabase.from('users').insert([
        {
          id: user.id,
          email: user.email,
          role: user.email === 'funlove0268@gmail.com' ? 'admin' : 'user',
        }
      ]);

      if (insertError) {
        console.error('❌ 유저 추가 실패:', insertError.message);
      } else {
        console.log('✅ 유저 추가 성공:', user.email);
      }
    }
  } catch (err) {
    console.error('❌ ensureUserInDatabase 내부 에러:', err.message);
  }
}
