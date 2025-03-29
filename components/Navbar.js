// components/Navbar.js
import { useRouter } from 'next/router';
import Link from 'next/link';
import styles from '../styles/Navbar.module.css';
import { useSession } from '../lib/SessionContext';
import { supabase } from '../lib/supabase';

const Navbar = () => {
  const { session, role, loading } = useSession();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('userRole');
    router.push('/');
  };

  // ✅ 세션 로딩 중엔 렌더링 하지 않음 (깜빡임 방지)
  if (loading) return null;

  const isLoggedIn = !!session;
  const isVerified = role === 'verified_user' || role === 'admin';
  const isAdmin = role === 'admin';

  return (
    <nav className={styles.navbar}>
      {/* 왼쪽 메뉴 */}
      <div className={styles.navLeft}>
        <Link href="/" className={styles.navLink}>홈</Link>
        {isLoggedIn && (
          <Link href="/userinfo" className={styles.navLink}>프로필</Link>
        )}
      </div>

      {/* 중앙 타이틀 */}
      <div className={styles.navCenter}>
        <span className={styles.siteTitle}>스프링데일뮤직 스퀘어문 자료실</span>
      </div>

      {/* 오른쪽 메뉴 */}
      <div className={styles.navRight}>
        {isLoggedIn ? (
          <>
            {isVerified && (
              <Link href="/post/new" className={styles.writeButton}>✏️ 게시글 작성</Link>
            )}
            {isAdmin && (
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
