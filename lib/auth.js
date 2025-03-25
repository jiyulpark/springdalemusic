import { supabase } from './supabase';

// 🔥 현재 로그인한 사용자의 권한을 가져오는 함수
export async function getUserRole() {  // ✅ export 방식 확인
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) return 'guest'; // 🔹 비회원은 guest
  
  const { data: userInfo, error: roleError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (roleError || !userInfo) return 'guest'; // 🔹 데이터베이스에 등록되지 않은 사용자는 guest

  return userInfo.role;
}

// 🔥 유저를 `users` 테이블에 자동 추가하는 함수
export async function ensureUserInDatabase() {  // ✅ export 방식 확인
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) return;

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
        role: user.email === 'funlove0268@gmail.com' ? 'admin' : 'user', // ✅ 최고 관리자는 `admin`
      }
    ]);

    if (insertError) {
      console.error('❌ 유저 추가 실패:', insertError.message);
    } else {
      console.log('✅ 유저 추가 성공:', user.email);
    }
  }
}
