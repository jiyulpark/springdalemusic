// pages/_app.js

import '../styles/globals.css';
import Navbar from '../components/Navbar';
import { useEffect } from 'react';

function MyApp({ Component, pageProps }) {
  // ✅ Google Analytics 추적 요청 강제 차단
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const originalFetch = window.fetch;
      window.fetch = (...args) => {
        if (args[0]?.includes('google-analytics.com')) {
          console.warn('🚫 GA 요청 차단됨:', args[0]);
          return Promise.resolve(new Response(null, { status: 204 }));
        }
        return originalFetch(...args);
      };
    }
  }, []);

  return (
    <>
      {/* ✅ 전역 네비게이션 바 */}
      <Navbar />

      {/* ✅ 라이트 테마를 강제로 적용 (백업용) */}
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
