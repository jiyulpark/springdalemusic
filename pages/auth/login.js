import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { ThemeSupa } from '@supabase/auth-ui-shared';

// 클라이언트에서만 `Auth` 컴포넌트 렌더링
const Auth = dynamic(() => import('@supabase/auth-ui-react').then((mod) => mod.Auth), { ssr: false });

const Login = () => {
  const [session, setSession] = useState(null);
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);

    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
    };

    fetchSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        router.push('/'); // 로그인 후 메인 페이지로 이동
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, [router]);

  if (!isClient) {
    return null; // 서버에서 렌더링 방지
  }

  return (
    <div style={{ maxWidth: '400px', margin: '40px auto', textAlign: 'center' }}>
      <h2>로그인</h2>
      {!session ? (
        <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} providers={['google', 'github']} />
      ) : (
        <p>로그인 완료!</p>
      )}
    </div>
  );
};

export default Login;
