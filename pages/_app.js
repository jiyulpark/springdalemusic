// pages/_app.js

import '../styles/globals.css';
import Navbar from '../components/Navbar';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

function MyApp({ Component, pageProps }) {
  const router = useRouter();

  // ✅ 페이지 이동 시 수동으로 GA page_view 이벤트 전송
  useEffect(() => {
    const handleRouteChange = (url) => {
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'page_view', {
          page_path: url,
        });
      }
    };
    router.events.on('routeChangeComplete', handleRouteChange);
    return () => router.events.off('routeChangeComplete', handleRouteChange);
  }, [router]);

  // ✅ 세션 에러 감지 시 초기화 (무한 로딩 방지용)
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.warn('🧹 세션 에러 → 초기화 + 새로고침');
        await supabase.auth.signOut();
        localStorage.removeItem('supabase.auth.token');
        location.reload();
      }
    };
    checkSession();
  }, []);

  return (
    <>
      <Navbar />
      <style jsx global>{`
        :root {
          color-scheme: light;
        }
        html, body {
          background-color: white !important;
          color: black !important;
        }
      `}</style>
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
