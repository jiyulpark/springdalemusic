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
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
    const fetchSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (session) {
          setSession(session);
          router.push('/');
        } else {
          setSession(null);
        }
      } catch (err) {
        console.error('세션 가져오기 실패:', err.message);
        setError('로그인 상태 확인 중 오류가 발생했습니다.');
      }
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        router.push('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  if (!isClient) return null;

  return (
    <div style={{ maxWidth: '400px', margin: '40px auto', textAlign: 'center' }}>
      <h2>로그인</h2>
      {error && (
        <div style={{ color: 'red', marginBottom: '20px' }}>
          {error}
        </div>
      )}
      {!session ? (
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={['google']}
          redirectTo={`${window.location.origin}/auth/callback`}
        />
      ) : (
        <p>로그인 완료!</p>
      )}
    </div>
  );
}
