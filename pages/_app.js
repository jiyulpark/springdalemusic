// pages/_app.js
import '../styles/globals.css';
import Navbar from '../components/Navbar';
import { SessionProvider } from '../lib/SessionContext';

function MyApp({ Component, pageProps }) {
  return (
    <SessionProvider>
      <Navbar />
      <Component {...pageProps} />
    </SessionProvider>
  );
}

export default MyApp;