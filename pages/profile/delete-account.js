import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

const DeleteAccount = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [confirmation, setConfirmation] = useState('');
  const router = useRouter();
  
  // 현재 로그인한 사용자 정보 가져오기
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('사용자 정보 가져오기 오류:', error.message);
        setError('사용자 정보를 가져오는데 실패했습니다.');
        return;
      }
      
      if (!user) {
        // 로그인하지 않은 사용자는 로그인 페이지로 리디렉션
        router.push('/auth/login');
        return;
      }
      
      setUser(user);
    };
    
    checkUser();
  }, []);
  
  const handleDeleteAccount = async () => {
    if (confirmation !== user?.email) {
      setError('이메일 주소가 일치하지 않습니다.');
      return;
    }
    
    if (!window.confirm('정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // 현재 사용자의 세션 토큰 가져오기
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ 세션 가져오기 실패:', sessionError.message);
        throw new Error('인증 세션을 가져올 수 없습니다.');
      }
      
      if (!session) {
        throw new Error('인증 세션이 없습니다.');
      }
      
      // 서버 API를 통해 계정 삭제 요청
      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          userToken: session.access_token,
        }),
      });
      
      // 응답 처리 개선
      let result;
      try {
        // 응답이 비어있거나 JSON이 아닌 경우 예외 처리
        const text = await response.text();
        if (!text) {
          console.warn('빈 응답이 반환되었습니다.');
          if (response.ok) {
            // 응답이 성공인데 내용이 비었으면 성공으로 간주
            result = { success: true };
          } else {
            throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`);
          }
        } else {
          // 텍스트 응답을 JSON으로 파싱
          try {
            result = JSON.parse(text);
          } catch (parseError) {
            console.error('응답 파싱 오류:', parseError);
            console.log('파싱할 수 없는 응답:', text);
            throw new Error('서버 응답을 처리할 수 없습니다. 관리자에게 문의하세요.');
          }
        }
      } catch (responseError) {
        console.error('응답 처리 오류:', responseError);
        throw new Error(`응답 처리 오류: ${responseError.message}`);
      }
      
      if (!response.ok && !result?.partialSuccess) {
        throw new Error(result?.error || '계정 삭제에 실패했습니다.');
      }
      
      // 부분 성공 메시지 표시
      if (result?.partialSuccess) {
        console.warn('⚠️ 부분 성공:', result.error);
      }
      
      // 로그아웃
      await supabase.auth.signOut();
      
      // 성공 메시지 표시 및 리디렉션
      alert('계정이 성공적으로 삭제되었습니다.');
      router.push('/');
    } catch (err) {
      console.error('계정 삭제 중 오류 발생:', err.message);
      setError(`계정 삭제 중 오류가 발생했습니다: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  if (!user) {
    return (
      <div style={{ 
        maxWidth: '500px', 
        margin: '40px auto', 
        padding: '30px', 
        background: '#fff', 
        borderRadius: '10px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        textAlign: 'center'
      }}>
        <p>로딩 중...</p>
      </div>
    );
  }
  
  return (
    <div style={{ 
      maxWidth: '500px', 
      margin: '40px auto', 
      padding: '30px', 
      background: '#fff', 
      borderRadius: '10px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
    }}>
      <h1 style={{ marginBottom: '30px', textAlign: 'center', color: '#d32f2f' }}>회원 탈퇴</h1>
      
      <div style={{ 
        padding: '15px', 
        background: '#ffebee', 
        borderRadius: '5px',
        marginBottom: '20px'
      }}>
        <p style={{ color: '#c62828', marginBottom: '10px' }}>
          <strong>주의:</strong> 회원 탈퇴 시 모든 데이터가 영구적으로 삭제되며, 이 작업은 되돌릴 수 없습니다.
        </p>
        <p style={{ color: '#c62828' }}>
          탈퇴를 원하시면 아래에 이메일 주소 <strong>{user.email}</strong>를 입력해주세요.
        </p>
      </div>
      
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
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
          이메일 주소 확인
        </label>
        <input
          type="text"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          placeholder="이메일 주소를 입력하세요"
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid #ddd',
            borderRadius: '5px',
            fontSize: '16px'
          }}
        />
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Link href="/profile/setup" passHref>
          <button
            style={{
              padding: '12px 20px',
              background: '#e0e0e0',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            취소
          </button>
        </Link>
        
        <button
          onClick={handleDeleteAccount}
          disabled={loading || confirmation !== user.email}
          style={{
            padding: '12px 40px',
            background: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: (loading || confirmation !== user.email) ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            opacity: (loading || confirmation !== user.email) ? 0.7 : 1
          }}
        >
          {loading ? '처리 중...' : '계정 삭제'}
        </button>
      </div>
    </div>
  );
};

export default DeleteAccount; 