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
    <div style={{
      maxWidth: 500,
      margin: '40px auto',
      padding: 24,
      background: '#fff',
      borderRadius: 12,
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
    }}>
      <h1 style={{ textAlign: 'center', marginBottom: 20 }}>로그인 / 회원가입</h1>
      <p style={{ textAlign: 'center', marginBottom: 20, color: '#666', fontSize: 16 }}>
        소셜 계정으로 간편하게 로그인하고 서비스를 이용하세요.<br />
        <span style={{ color: '#d32f2f', fontWeight: 600 }}>※ 가입 후 반드시 프로필을 수정해 주세요!</span>
      </p>
      <div
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          justifyContent: 'center',
          flexDirection: 'row',
          marginBottom: 10
        }}
      >
        <div style={{ minWidth: 220, flex: 1 }}>
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#404040',
                    brandAccent: '#525252',
                  },
                },
              },
              className: {
                container: 'auth-container',
                button: 'auth-button',
                input: 'auth-input',
              },
            }}
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
                providers: {
                  google: '구글로 로그인하기',
                  github: '깃허브로 로그인하기',
                },
              },
            }}
          />
        </div>
      </div>
      <style jsx global>{`
        .auth-button[data-provider="google"] {
          position: relative;
        }
        .auth-button[data-provider="google"]::after {
          content: "구글로 로그인하기";
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
        }
        .auth-button[data-provider="google"] span {
          visibility: hidden;
        }
        .auth-button[data-provider="github"] {
          position: relative;
        }
        .auth-button[data-provider="github"]::after {
          content: "깃허브로 로그인하기";
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
        }
        .auth-button[data-provider="github"] span {
          visibility: hidden;
        }
      `}</style>
    </div>
  );
};

export default Login;
