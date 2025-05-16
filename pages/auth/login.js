// pages/auth/login.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
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

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
  };

  const handleGithubLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
  };

  return (
    <div style={{
      width: '90%',
      maxWidth: 800,
      minWidth: 320,
      margin: '40px auto',
      padding: 'clamp(20px, 5vw, 32px)',
      background: '#fff',
      borderRadius: 12,
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
    }}>
      <h1 style={{ 
        textAlign: 'center', 
        marginBottom: 'clamp(16px, 3vw, 24px)', 
        fontSize: 'clamp(1.5rem, 4vw, 2rem)',
        fontWeight: 600
      }}>
        로그인 / 회원가입
      </h1>
      <p style={{ 
        textAlign: 'center', 
        marginBottom: 'clamp(20px, 4vw, 32px)', 
        color: '#666', 
        fontSize: 'clamp(14px, 3vw, 18px)',
        lineHeight: 1.6
      }}>
        소셜 계정으로 간편하게 로그인하고 서비스를 이용하세요.<br />
        <span style={{ color: '#d32f2f', fontWeight: 600 }}>※ 가입 후 반드시 프로필을 수정해 주세요!</span>
      </p>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'clamp(12px, 2vw, 16px)',
          marginBottom: 10,
          width: '100%',
          maxWidth: 500,
          margin: '0 auto'
        }}
      >
        <button
          onClick={handleGoogleLogin}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: 'clamp(10px, 2vw, 12px) clamp(16px, 3vw, 24px)',
            backgroundColor: '#fff',
            border: '1px solid #ddd',
            borderRadius: '8px',
            fontSize: 'clamp(14px, 2.5vw, 16px)',
            fontWeight: 500,
            color: '#333',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            width: '100%'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#f5f5f5';
            e.currentTarget.style.borderColor = '#ccc';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#fff';
            e.currentTarget.style.borderColor = '#ddd';
          }}
        >
          <img
            src="https://www.google.com/favicon.ico"
            alt="Google"
            style={{ width: 'clamp(16px, 2.5vw, 20px)', height: 'clamp(16px, 2.5vw, 20px)' }}
          />
          구글로 로그인하기
        </button>

        <button
          onClick={handleGithubLogin}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: 'clamp(10px, 2vw, 12px) clamp(16px, 3vw, 24px)',
            backgroundColor: '#24292e',
            border: 'none',
            borderRadius: '8px',
            fontSize: 'clamp(14px, 2.5vw, 16px)',
            fontWeight: 500,
            color: '#fff',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            width: '100%'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#2c3238';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#24292e';
          }}
        >
          <img
            src="https://github.com/favicon.ico"
            alt="GitHub"
            style={{ width: 'clamp(16px, 2.5vw, 20px)', height: 'clamp(16px, 2.5vw, 20px)' }}
          />
          깃허브로 로그인하기
        </button>
      </div>
    </div>
  );
};

export default Login;
