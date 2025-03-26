import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/router';
import Link from 'next/link';
import styles from '../styles/Navbar.module.css';
import { getUserRole, ensureUserInDatabase } from '../lib/auth';

const Navbar = () => {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState('guest');
  const router = useRouter();

  // ✅ 세션 및 권한 정보 가져오기
  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (session) {
        await ensureUserInDatabase();
        const userRole = await getUserRole();
        setRole(userRole);
      }
    };

    fetchSession();

    // ✅ 실시간 세션 상태 변경 감지
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);

      if (session) {
        await ensureUserInDatabase();
        const userRole = await getUserRole();
        setRole(userRole);
      } else {
        setRole('guest');
      }
    });

    // ✅ cleanup: 언마운트 시 이벤트 리스너 해제
    return () => authListener.unsubscribe();
  }, []);

  // ✅ 로그아웃 처리
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setRole('guest');
    router.push('/auth/login'); // 또는 window.location.href = '/auth/login';
  };

  return (
    <nav className={styles.navbar}>
      {/* 왼쪽 메뉴 */}
      <div className={styles.navLeft}>
        <Link href="/" className={styles.navLink}>홈</Link>
        {session && <Link href="/userinfo" className={styles.navLink}>프로필</Link>}
      </div>

      {/* 중앙 타이틀 */}
      <div className={styles.navCenter}>
        <span className={styles.siteTitle}>스프링데일뮤직 스퀘어문 자료실</span>
      </div>

      {/* 오른쪽 메뉴 */}
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
