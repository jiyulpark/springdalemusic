// pages/_document.js
import { Html, Head, Main, NextScript } from 'next/document';

const isProd = process.env.NODE_ENV === 'production';

export default function Document() {
  return (
    <Html lang="ko">
      <Head>
        {isProd && (
          <>
            <script async src="https://www.googletagmanager.com/gtag/js?id=G-YZP7L66RXP"></script>
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){ dataLayer.push(arguments); }
                  gtag('js', new Date());
                  gtag('config', 'G-YZP7L66RXP', { send_page_view: false });
                `,
              }}
            />
          </>
        )}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
