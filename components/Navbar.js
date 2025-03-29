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
    localStorage.removeItem('userRole'); // ✅ 캐시 제거
    router.push('/'); // 또는 로그인 페이지로 이동
  };

  if (loading) return null; // ✅ 세션 로딩 중일 땐 렌더링 생략

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
