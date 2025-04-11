// pages/auth/login.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../../lib/supabase';

const Login = () => {
  const router = useRouter();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        router.push('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <div style={{ maxWidth: '400px', margin: '40px auto', padding: '20px' }}>
      <Auth
        supabaseClient={supabase}
        appearance={{ theme: ThemeSupa }}
        providers={['google', 'github']}
        localization={{
          variables: {
            sign_in: {
              email_label: '이메일',
              password_label: '비밀번호',
              button_label: '로그인',
            },
          },
        }}
      />
    </div>
  );
};

export default Login;
