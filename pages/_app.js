// pages/_app.js
import 'core-js/stable';
import 'regenerator-runtime/runtime';
import '../styles/globals.css';
import Navbar from '../components/Navbar';
import { SessionProvider } from '../lib/SessionContext';

function MyApp({ Component, pageProps }) {
  return (
    <SessionProvider>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar />
        <main style={{ flex: 1 }}>
          <Component {...pageProps} />
        </main>
      </div>
    </SessionProvider>
  );
}

export default MyApp;