import { useState, useEffect, useRef } from 'react';
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
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePictureUrl, setProfilePictureUrl] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
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
        .select('nickname, hobby, status_message, profile_picture')
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
        if (profile.profile_picture) {
          setProfilePictureUrl(profile.profile_picture);
        }
      } else {
        // 이메일에서 사용자 이름 추출
        const emailUsername = user.email.split('@')[0];
        setDisplayName(emailUsername);
      }
    };
    
    checkUser();
  }, []);
  
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // 이미지 파일만 허용
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드할 수 있습니다.');
      return;
    }
    
    // 파일 크기 제한 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('파일 크기는 5MB 이하여야 합니다.');
      return;
    }
    
    setProfilePicture(file);
    
    // 이미지 미리보기 생성
    const reader = new FileReader();
    reader.onload = (e) => {
      setProfilePictureUrl(e.target.result);
    };
    reader.readAsDataURL(file);
  };
  
  const uploadProfilePicture = async () => {
    if (!profilePicture) return null;
    
    try {
      setUploadProgress(0);
      
      // 파일 경로 생성 (users/{user_id}/profile.{확장자})
      const fileExt = profilePicture.name.split('.').pop();
      const filePath = `users/${user.id}/profile.${fileExt}`;
      
      // 이미지 업로드
      const { data, error } = await supabase.storage
        .from('profiles')
        .upload(filePath, profilePicture, {
          cacheControl: '3600',
          upsert: true,
          onUploadProgress: (progress) => {
            setUploadProgress(Math.round((progress.loaded / progress.total) * 100));
          }
        });
      
      if (error) {
        console.error('프로필 이미지 업로드 실패:', error.message);
        throw error;
      }
      
      // 공개 URL 생성
      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);
      
      return publicUrl;
    } catch (err) {
      console.error('이미지 업로드 오류:', err);
      return null;
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!displayName.trim()) {
      setError('이름을 입력해주세요.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // 1. 프로필 이미지가 있으면 업로드
      let profileImageUrl = profilePictureUrl;
      if (profilePicture) {
        const uploadedUrl = await uploadProfilePicture();
        if (uploadedUrl) {
          profileImageUrl = uploadedUrl;
        }
      }
      
      // 2. 사용자 메타데이터 업데이트
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          name: displayName,
          avatar_url: profileImageUrl
        }
      });
      
      if (updateError) {
        throw updateError;
      }
      
      // 3. 데이터베이스 users 테이블 업데이트
      const { error: dbError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          nickname: displayName,
          hobby: hobby,
          status_message: statusMessage,
          profile_picture: profileImageUrl
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
        {/* 프로필 이미지 업로드 영역 */}
        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          <div
            onClick={() => fileInputRef.current.click()}
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              margin: '0 auto 10px',
              cursor: 'pointer',
              backgroundColor: '#e0e0e0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundImage: profilePictureUrl ? `url(${profilePictureUrl})` : 'none',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {!profilePictureUrl && (
              <span style={{ fontSize: '36px', color: '#757575' }}>
                {displayName ? displayName.charAt(0).toUpperCase() : '?'}
              </span>
            )}
            
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: `${uploadProgress}%`,
                height: '4px',
                backgroundColor: '#4CAF50'
              }} />
            )}
          </div>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            style={{ display: 'none' }}
          />
          
          <button
            type="button"
            onClick={() => fileInputRef.current.click()}
            style={{
              marginTop: '5px',
              padding: '5px 10px',
              background: 'transparent',
              border: '1px solid #ddd',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            프로필 사진 {profilePictureUrl ? '변경' : '추가'}
          </button>
          
          {profilePictureUrl && (
            <button
              type="button"
              onClick={() => {
                setProfilePicture(null);
                setProfilePictureUrl('');
              }}
              style={{
                marginTop: '5px',
                marginLeft: '5px',
                padding: '5px 10px',
                background: 'transparent',
                border: '1px solid #f44336',
                color: '#f44336',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              삭제
            </button>
          )}
        </div>
        
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