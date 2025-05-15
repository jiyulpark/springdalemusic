import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/router';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [nickname, setNickname] = useState('');
  const [hobby, setHobby] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [profilePicture, setProfilePicture] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error("❌ 세션 가져오기 실패:", sessionError.message);
          setError("세션 정보를 불러올 수 없습니다.");
          setLoading(false);
          return;
        }

        if (!session) {
          router.push('/auth/login');
          return;
        }

        const userId = session.user.id;
        console.log("✅ 로그인된 사용자 ID:", userId);

        // 현재 사용자의 이메일 가져오기
        const userEmail = session.user.email;
        
        // 사용자 정보 가져오기
        const { data: userInfo, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (userError) {
          // 사용자 정보가 없는 경우(새 사용자)
          if (userError.code === 'PGRST116') {
            console.warn("⚠️ 사용자 정보가 없습니다. 새로운 레코드를 생성합니다.");
            
            // 새 사용자 레코드 생성
            const { data: newUser, error: insertError } = await supabase
              .from('users')
              .insert([
                {
                  id: userId,
                  email: userEmail,
                  role: 'user', // 기본 역할
                  join_date: new Date(),
                  nickname: userEmail, // 이메일을 기본 닉네임으로 사용
                  hobby: '',
                  status_message: ''
                }
              ])
              .select('*')
              .single();
            
            if (insertError) {
              console.error("❌ 사용자 생성 실패:", insertError.message);
              setError("사용자 정보를 생성할 수 없습니다.");
              setLoading(false);
              return;
            }
            
            console.log("✅ 새 사용자 생성 성공:", newUser);
            setUser(newUser);
            setNickname(newUser.nickname || '');
            setHobby(newUser.hobby || '');
            setStatusMessage(newUser.status_message || '');
            setPreviewUrl(newUser.profile_picture || null);
          } else {
            console.error("❌ 유저 정보 가져오기 실패:", userError.message);
            setError("사용자 정보를 불러올 수 없습니다.");
            setLoading(false);
            return;
          }
        } else {
          console.log("✅ 유저 정보:", userInfo);
          setUser(userInfo);
          setNickname(userInfo.nickname || '');
          setHobby(userInfo.hobby || '');
          setStatusMessage(userInfo.status_message || '');
          setPreviewUrl(userInfo.profile_picture || null);
        }
      } catch (err) {
        console.error("❌ 예상치 못한 오류:", err.message);
        setError("프로필 정보를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setProfilePicture(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
  
    try {
      let profilePictureUrl = user.profile_picture;
    
      if (profilePicture) {
        const filePath = `${user.id}-${Date.now()}`;
        
        // ✅ 기존 프로필 사진이 있는 경우에만 삭제 시도
        if (user.profile_picture) {
          try {
            // 기존 파일 경로 추출 (URL에서 파일 이름 추출)
            const existingFilePath = user.profile_picture.split('/').pop();
            if (existingFilePath) {
              const { error: removeError } = await supabase.storage
                .from('avatars')
                .remove([existingFilePath]);
              
              if (removeError) {
                console.warn("⚠️ 기존 프로필 사진 삭제 실패:", removeError.message);
                // 삭제 실패해도 계속 진행
              }
            }
          } catch (err) {
            console.warn("⚠️ 기존 프로필 사진 삭제 중 오류:", err.message);
            // 오류가 발생해도 새 업로드는 계속 진행
          }
        }
    
        const { data, error } = await supabase.storage
          .from('avatars')
          .upload(filePath, profilePicture);
    
        if (error) {
          console.error("❌ 프로필 사진 업로드 실패:", error.message);
          setError("프로필 사진 업로드에 실패했습니다.");
          setLoading(false);
          return;
        }
    
        profilePictureUrl = supabase.storage.from('avatars').getPublicUrl(filePath).data.publicUrl;
        console.log("✅ 업로드된 프로필 사진 URL:", profilePictureUrl);
      }
    
      // Auth 사용자 메타데이터도 함께 업데이트 (표시 이름)
      try {
        const { error: authError } = await supabase.auth.updateUser({
          data: { name: nickname }
        });
        
        if (authError) {
          console.warn("⚠️ Auth 메타데이터 업데이트 실패:", authError.message);
          // 계속 진행
        }
      } catch (authErr) {
        console.warn("⚠️ Auth 업데이트 중 오류:", authErr.message);
        // 계속 진행
      }
      
      // DB 사용자 정보 업데이트
      const { error: updateError } = await supabase
        .from('users')
        .update({
          nickname,
          hobby,
          status_message: statusMessage,
          profile_picture: profilePictureUrl
        })
        .eq('id', user.id);
    
      if (updateError) {
        console.error("❌ 프로필 업데이트 실패:", updateError.message);
        setError("프로필 업데이트에 실패했습니다. 다시 시도해주세요.");
      } else {
        console.log("✅ 프로필 업데이트 성공!");
        router.push('/userinfo');
      }
    } catch (err) {
      console.error("❌ 프로필 저장 중 오류:", err.message);
      setError("프로필 저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };
  
  
  if (loading) return <p style={{ textAlign: 'center' }}>로딩 중...</p>;

  return (
    <div style={{
      maxWidth: '600px',
      margin: '40px auto',
      padding: '20px',
      background: '#fff',
      borderRadius: '10px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      textAlign: 'center'
    }}>
      <h1>프로필 수정</h1>

      {error && (
        <div style={{ 
          padding: '10px', 
          marginBottom: '20px', 
          backgroundColor: '#ffebee', 
          color: '#c62828', 
          borderRadius: '5px',
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}

      <div style={{ textAlign: 'center' }}>
        {previewUrl ? (
          <img 
            src={previewUrl} 
            alt="Profile Preview" 
            style={{
              width: '120px', 
              height: '120px', 
              borderRadius: '50%',
              objectFit: 'cover', 
              display: 'block',
              margin: '0 auto',
              marginBottom: '10px'
            }} 
          />
        ) : (
          <div style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            backgroundColor: '#e0e0e0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
            marginBottom: '10px',
            fontSize: '36px',
            color: '#757575'
          }}>
            {nickname ? nickname.charAt(0).toUpperCase() : '?'}
          </div>
        )}
      </div>
      
      <input type="file" accept="image/*" onChange={handleFileChange} style={{ marginBottom: '10px' }} />

      <input 
        type="text" 
        value={nickname} 
        onChange={(e) => setNickname(e.target.value)} 
        placeholder="닉네임" 
        style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
      />

      <input 
        type="text" 
        value={hobby} 
        onChange={(e) => setHobby(e.target.value)} 
        placeholder="취미" 
        style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
      />

      <textarea 
        value={statusMessage} 
        onChange={(e) => setStatusMessage(e.target.value)} 
        placeholder="상태 메시지" 
        style={{ width: '100%', height: '100px', padding: '10px', marginBottom: '10px' }}
      />

      <button 
        onClick={handleSave} 
        style={{
          padding: '10px 20px',
          background: '#0070f3',
          color: '#fff',
          borderRadius: '5px',
          border: 'none',
          cursor: 'pointer'
        }}>
        저장
      </button>
    </div>
  );
};

export default Profile;
