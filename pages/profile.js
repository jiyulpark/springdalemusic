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
  const router = useRouter();

  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true);

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("❌ 세션 가져오기 실패:", sessionError.message);
        setLoading(false);
        return;
      }

      if (!session) {
        router.push('/login');
        return;
      }

      const userId = session.user.id;
      console.log("✅ 로그인된 사용자 ID:", userId);

      const { data: userInfo, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) {
        console.error("❌ 유저 정보 가져오기 실패:", userError.message);
        setLoading(false);
        return;
      }

      console.log("✅ 유저 정보:", userInfo);
      setUser(userInfo);
      setNickname(userInfo.nickname || '');
      setHobby(userInfo.hobby || '');
      setStatusMessage(userInfo.status_message || '');
      setPreviewUrl(userInfo.profile_picture || null);
      setLoading(false);
    };

    fetchUserProfile();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setProfilePicture(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
  
    let profilePictureUrl = user.profile_picture;
  
    if (profilePicture) {
      const filePath = `${user.id}-${Date.now()}`;
      
      // ✅ 기존 파일 삭제 후 새 파일 업로드
      await supabase.storage.from('avatars').remove([filePath]);
  
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, profilePicture);
  
      if (error) {
        console.error("❌ 프로필 사진 업로드 실패:", error.message);
        setLoading(false);
        return;
      }
  
      profilePictureUrl = supabase.storage.from('avatars').getPublicUrl(filePath).data.publicUrl;
      console.log("✅ 업로드된 프로필 사진 URL:", profilePictureUrl);
    }
  
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
    } else {
      console.log("✅ 프로필 업데이트 성공!");
      router.push('/userinfo');
    }
  
    setLoading(false);
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

      <div style={{ textAlign: 'center' }}>
  {previewUrl && (
    <img 
      src={previewUrl} 
      alt="Profile Preview" 
      style={{
        width: '120px', 
        height: '120px', 
        borderRadius: '50%', // 🔥 원형으로 변경
        objectFit: 'cover', 
        display: 'block',    // 🔥 부모 요소 기준으로 중앙 정렬
        margin: '0 auto',    // 🔥 좌우 정렬 중앙
        marginBottom: '10px'
      }} 
    />
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
