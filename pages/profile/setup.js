import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

const ProfileSetup = () => {
  const [displayName, setDisplayName] = useState('');
  const [hobby, setHobby] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const router = useRouter();
  
  // 현재 로그인한 사용자 정보 가져오기
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('사용자 정보 가져오기 오류:', error.message);
        return;
      }
      
      if (!user) {
        // 로그인하지 않은 사용자는 로그인 페이지로 리디렉션
        router.push('/auth/login');
        return;
      }
      
      setUser(user);
      
      // 기존 프로필 정보가 있는지 확인
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('nickname, hobby, status_message')
        .eq('id', user.id)
        .single();
      
      if (profileError && profileError.code !== 'PGRST116') {
        console.error('프로필 정보 가져오기 오류:', profileError.message);
        return;
      }
      
      // 이미 프로필 정보가 있으면 해당 정보로 폼 초기화
      if (profile) {
        setDisplayName(profile.nickname || '');
        setHobby(profile.hobby || '');
        setStatusMessage(profile.status_message || '');
      } else {
        // 이메일에서 사용자 이름 추출
        const emailUsername = user.email.split('@')[0];
        setDisplayName(emailUsername);
      }
    };
    
    checkUser();
  }, []);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!displayName.trim()) {
      setError('이름을 입력해주세요.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // 1. 사용자 메타데이터 업데이트
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          name: displayName
        }
      });
      
      if (updateError) {
        throw updateError;
      }
      
      // 2. 데이터베이스 users 테이블 업데이트
      const { error: dbError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          nickname: displayName,
          hobby: hobby,
          status_message: statusMessage,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
      
      if (dbError) {
        throw dbError;
      }
      
      // 성공 시 메인 페이지로 리디렉션
      alert('프로필 설정이 완료되었습니다.');
      router.push('/');
    } catch (err) {
      console.error('프로필 업데이트 오류:', err.message);
      setError('프로필 저장 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div style={{ 
      maxWidth: '500px', 
      margin: '40px auto', 
      padding: '30px', 
      background: '#fff', 
      borderRadius: '10px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
    }}>
      <h1 style={{ marginBottom: '30px', textAlign: 'center' }}>프로필 설정</h1>
      
      {error && (
        <div style={{ 
          padding: '10px', 
          background: '#ffebee', 
          color: '#c62828', 
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
            이름 (필수)
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="표시될 이름을 입력하세요"
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '5px',
              fontSize: '16px'
            }}
            required
          />
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
            취미
          </label>
          <input
            type="text"
            value={hobby}
            onChange={(e) => setHobby(e.target.value)}
            placeholder="당신의 취미는 무엇인가요?"
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '5px',
              fontSize: '16px'
            }}
          />
        </div>
        
        <div style={{ marginBottom: '30px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
            상태 메시지
          </label>
          <textarea
            value={statusMessage}
            onChange={(e) => setStatusMessage(e.target.value)}
            placeholder="상태 메시지를 입력하세요"
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '5px',
              fontSize: '16px',
              minHeight: '100px',
              resize: 'vertical'
            }}
          />
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button
            type="button"
            onClick={() => router.push('/')}
            style={{
              padding: '12px 20px',
              background: '#e0e0e0',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            건너뛰기
          </button>
          
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '12px 40px',
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? '저장 중...' : '저장하기'}
          </button>
        </div>
      </form>

      <div style={{ marginTop: '40px', textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '20px' }}>
        <Link href="/profile/delete-account" passHref>
          <span style={{ 
            color: '#f44336', 
            textDecoration: 'none', 
            fontSize: '14px',
            cursor: 'pointer' 
          }}>
            회원 탈퇴
          </span>
        </Link>
      </div>
    </div>
  );
};

export default ProfileSetup; 