// pages/_app.js
import '../styles/globals.css';
import Navbar from '../components/Navbar';
import { SessionProvider } from '../lib/SessionContext';
import Head from 'next/head';

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>스프링데일뮤직 - 공식 커뮤니티</title>
        <meta name="description" content="Gopherwood SquareMoon 사용자 전용 커뮤니티. IR, 톤 공유, 사용기 제공." />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="스프링데일뮤직" />
        <link rel="canonical" href="https://springdalemusic.vercel.app/" />
        {/* Open Graph */}
        <meta property="og:title" content="스프링데일뮤직 - 공식 커뮤니티" />
        <meta property="og:description" content="스퀘어문 사용자들을 위한 공유 플랫폼" />
        <meta property="og:image" content="https://springdalemusic.vercel.app/thumbnail.jpg" />
        <meta property="og:url" content="https://springdalemusic.vercel.app/" />
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="스프링데일뮤직 - 공식 커뮤니티" />
        <meta name="twitter:description" content="스퀘어문 사용자들을 위한 공유 플랫폼" />
        <meta name="twitter:image" content="https://springdalemusic.vercel.app/thumbnail.jpg" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="google-site-verification" content="hz9vLqmiLCGMAY0-pEIqB56CEKlUXgWWtve2NDxF9p0" />
        <meta name="naver-site-verification" content="7da60c544101659e30489ba169feac38076b9313" />
      </Head>
      <SessionProvider>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Navbar />
          <main style={{ flex: 1 }}>
            <Component {...pageProps} />
          </main>
        </div>
      </SessionProvider>
    </>
  );
}

export default MyApp;