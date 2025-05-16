// pages/_document.js
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="ko">
      <Head>
        {/* ✅ GA 코드 완전 제거됨 */}
        <meta name="color-scheme" content="light" />
        <style>{`html { color-scheme: light only; }`}</style>
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
