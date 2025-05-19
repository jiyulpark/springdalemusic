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
    <header className={styles.navbarContainer}>
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
                <>
                  <Link href="/admin/users" className={styles.adminButton}>🔧 관리자</Link>
                  <Link href="/admin/posts" className={styles.adminButton}>📝 게시글 관리</Link>
                </>
              )}
              <Link href="/mypage" className={styles.navLink}>
                마이페이지
              </Link>
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

      {/* 하단 링크 바 */}
      <div className={styles.subNav}>
        <a 
          href="https://springdalem.co.kr/article/%EA%B3%B5%EC%A7%80%EC%82%AC%ED%95%AD/1/2/" 
          target="_blank" 
          rel="noopener noreferrer" 
          className={styles.subNavLink}
        >
          📢 <span>공지사항</span>
        </a>
        <a 
          href="https://smartstore.naver.com/springdalem/products/11025454226" 
          target="_blank" 
          rel="noopener noreferrer" 
          className={styles.subNavLink}
        >
          🛍️ <span>스마트스토어</span>
        </a>
        <a 
          href="https://www.coupang.com/vp/products/8403130968?itemId=24309073604&lptag=A01002259&redirect=landing&searchId=2e94d5fa18424ac7911fc724e9d4e537&sourceType=brandstore-all_products&spec=10799999&src=1139998&storeId=95203&subSourceType=brandstore-all_products&vendorId=A01002259&vendorItemId=91402167845&wPcid=17460742563360453361055" 
          target="_blank" 
          rel="noopener noreferrer" 
          className={styles.subNavLink}
        >
          🚀 <span>쿠팡</span>
        </a>
      </div>
    </header>
  );
};

export default Navbar;
