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
    router.push('/auth/login');
  };

  if (loading) return null; // 🔥 로딩 중일 땐 아무것도 렌더링하지 않음

  return (
    <nav className={styles.navbar}>
      <div className={styles.navLeft}>
        <Link href="/" className={styles.navLink}>홈</Link>
        {session && <Link href="/userinfo" className={styles.navLink}>프로필</Link>}
      </div>

      <div className={styles.navCenter}>
        <span className={styles.siteTitle}>스프링데일뮤직 스퀘어문 자료실</span>
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
