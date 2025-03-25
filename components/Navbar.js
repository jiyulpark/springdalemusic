import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/router';
import Link from 'next/link';
import styles from '../styles/Navbar.module.css';
import { getUserRole, ensureUserInDatabase } from '../lib/auth'; // ✅ import 방식 수정

const Navbar = () => {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState('guest'); // ✅ 기본 권한: guest (비회원)
  const router = useRouter();

  useEffect(() => {
    const fetchSession = async () => {
      console.log('🔍 fetchSession() 실행됨');
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (session) {
        console.log('✅ 로그인 세션 감지됨');
        await ensureUserInDatabase(); // ✅ 로그인 시 `users` 테이블에 자동 추가
        const userRole = await getUserRole(); // ✅ 유저 권한 가져오기
        setRole(userRole);
      }
    };

    fetchSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);

      if (session) {
        console.log('✅ 로그인 이벤트 감지됨');
        await ensureUserInDatabase(); // ✅ 로그인 시 `users` 테이블에 자동 추가
        const userRole = await getUserRole(); // ✅ 유저 권한 가져오기
        setRole(userRole);
      } else {
        setRole('guest'); // ✅ 로그아웃 시 guest로 변경
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setRole('guest');
    router.push('/auth/login'); // ✅ 로그아웃 후 로그인 페이지로 이동
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.navLeft}>
        <Link href="/" className={styles.navLink}>홈</Link>
        {session && <Link href="/userinfo" className={styles.navLink}>프로필</Link>}
      </div>

      <div className={styles.navRight}>
        {session ? (
          <>
            {(role === 'verified_user' || role === 'admin') && (
              <Link href="/post/new" className={styles.writeButton}>✏️ 게시글 작성</Link>
            )}
            {role === 'admin' && (
              <Link href="/admin/users" className={styles.adminButton}>🔧 관리자</Link>
            )}
            <button onClick={handleLogout} className={styles.logoutButton}>로그아웃</button>
          </>
        ) : (
          <button 
            onClick={() => router.push('/auth/login')} 
            className={styles.loginButton}
          >
            로그인
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
