// pages/auth/login.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../../lib/supabase';

const Login = () => {
  const router = useRouter();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN') {
        // 로그인 성공 시 사용자 프로필 정보 확인
        const user = session.user;
        
        // users 테이블에서 사용자 정보 확인
        const { data: profile, error } = await supabase
          .from('users')
          .select('nickname, hobby, status_message')
          .eq('id', user.id)
          .single();
        
        // 프로필 정보가 없거나 nickname, hobby, status_message 중 하나라도 없으면 프로필 설정 페이지로 리디렉션
        if (
          error ||
          !profile ||
          !profile.nickname ||
          !profile.hobby ||
          !profile.status_message
        ) {
          console.log('신규 사용자 또는 프로필 미설정: 프로필 설정 페이지로 이동');
          router.push('/profile/setup');
        } else {
          // 프로필이 이미 있는 경우 메인 페이지로 이동
          router.push('/');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <div style={{ maxWidth: '400px', margin: '40px auto', padding: '20px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>로그인 / 회원가입</h1>
      <p style={{ textAlign: 'center', marginBottom: '30px', color: '#666' }}>
        소셜 계정으로 간편하게 로그인하고 서비스를 이용하세요.
      </p>
      <Auth
        supabaseClient={supabase}
        appearance={{ theme: ThemeSupa }}
        providers={['google', 'github']}
        view="sign_in"
        showLinks={false}
        onlyThirdPartyProviders
        localization={{
          variables: {
            sign_in: {
              email_label: '',
              password_label: '',
              button_label: '소셜 로그인',
            },
          },
        }}
      />
    </div>
  );
};

export default Login;
