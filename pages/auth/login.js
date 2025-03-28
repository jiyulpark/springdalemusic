// pages/auth/login.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { supabase } from '../../lib/supabase';
import { ThemeSupa } from '@supabase/auth-ui-shared';

// ✅ Auth 컴포넌트는 SSR 비활성화 (클라이언트 전용)
const Auth = dynamic(() => import('@supabase/auth-ui-react').then(mod => mod.Auth), {
  ssr: false
});

export default function Login() {
  const [session, setSession] = useState(null);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/');
      } else {
        setSession(null);
      }
    };
    fetchSession();
  }, [router]);

  if (!isClient) return null;

  return (
    <div style={{ maxWidth: '400px', margin: '40px auto', textAlign: 'center' }}>
      <h2>로그인</h2>
      {!session ? (
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={['google', 'github']}
        />
      ) : (
        <p>로그인 완료!</p>
      )}
    </div>
  );
}
