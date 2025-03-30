import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (session) {
          router.push('/');
        } else {
          router.push('/auth/login');
        }
      } catch (err) {
        console.error('인증 콜백 처리 실패:', err.message);
        router.push('/auth/login');
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div style={{ textAlign: 'center', marginTop: '40px' }}>
      <p>로그인 처리 중...</p>
    </div>
  );
} 