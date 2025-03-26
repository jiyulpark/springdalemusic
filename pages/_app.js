// pages/_app.js

import '../styles/globals.css';
import Navbar from '../components/Navbar';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

function MyApp({ Component, pageProps }) {
  // ✅ 1. GA 차단 (fetch + sendBeacon 완전 차단)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // fetch 차단
      const originalFetch = window.fetch;
      window.fetch = (...args) => {
        if (args[0]?.toString().includes('google-analytics.com')) {
          console.warn('🚫 GA 요청 차단(fetch):', args[0]);
          return Promise.resolve(new Response(null, { status: 204 }));
        }
        return originalFetch(...args);
      };

      // sendBeacon 차단
      const originalBeacon = navigator.sendBeacon;
      navigator.sendBeacon = (...args) => {
        if (args[0]?.toString().includes('google-analytics.com')) {
          console.warn('🚫 GA 요청 차단(sendBeacon):', args[0]);
          return false;
        }
        return originalBeacon.apply(navigator, args);
      };
    }
  }, []);

  // ✅ 2. 세션 에러 발생 시 자동 초기화 (무한 로딩 방지)
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.warn('🧹 세션 에러 감지 → 초기화 + 새로고침');
        await supabase.auth.signOut();
        localStorage.removeItem('supabase.auth.token');
        location.reload();
      } else {
        console.log('✅ 세션 정상 또는 비로그인 상태');
      }
    };

    checkSession();
  }, []);

  return (
    <>
      {/* ✅ 전역 네비게이션 바 */}
      <Navbar />

      {/* ✅ 라이트 테마 강제 고정 */}
      <style jsx global>{`
        :root {
          color-scheme: light;
        }
        html, body {
          background-color: white !important;
          color: black !important;
        }
      `}</style>

      {/* ✅ 페이지 콘텐츠 */}
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
