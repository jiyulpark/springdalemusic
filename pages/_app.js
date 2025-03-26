// pages/_app.js

import '../styles/globals.css';
import Navbar from '../components/Navbar';

function MyApp({ Component, pageProps }) {
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
