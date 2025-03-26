// pages/_app.js

import '../styles/globals.css';
import Navbar from '../components/Navbar';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

function MyApp({ Component, pageProps }) {
  const router = useRouter();

  // ✅ 페이지 이동 시 Google Analytics 이벤트 (선택사항)
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

  // ❌ 삭제됨: 세션 체크 후 signOut + reload → 무한 루프 원인이 됨

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
