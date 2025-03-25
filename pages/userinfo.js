import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/router';

const UserInfo = () => {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUserInfo = async () => {
      setLoading(true);
      
      console.log("🔍 데이터 가져오기 시작!");

      // 🔥 현재 로그인한 사용자 정보 가져오기
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("❌ 세션 가져오기 실패:", sessionError.message);
        setLoading(false);
        return;
      }

      if (!session) {
        console.log("🚨 로그인된 사용자가 없음, 로그인 페이지로 이동!");
        setTimeout(() => {
          router.push('/login');
        }, 500);
        return;
      }

      const userId = session.user.id;
      console.log("✅ 로그인된 사용자 ID:", userId);

      try {
        // 🔥 users 테이블에서 유저 정보 가져오기
        const { data: userInfo, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (userError) throw new Error(userError.message);

        console.log("✅ 유저 정보:", userInfo);
        setUser(userInfo);

        // 🔥 유저의 활동 데이터 가져오기 (get_user_stats 함수 호출)
        console.log("🔄 get_user_stats 실행 중...");
        const { data: userStats, error: statsError } = await supabase.rpc('get_user_stats', { user_uuid: userId });

        if (statsError) throw new Error(statsError.message);

        console.log("✅ 유저 활동 데이터:", userStats);

        // 🔥 데이터가 배열인지 확인하고 설정
        if (Array.isArray(userStats) && userStats.length > 0) {
          setStats(userStats[0]); // 🔥 배열이면 첫 번째 요소 사용
        } else {
          setStats(userStats); // 🔥 객체 형태 그대로 사용
        }

      } catch (error) {
        console.error("❌ 데이터 가져오기 실패:", error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, []);

  if (loading) return <p style={{ textAlign: 'center' }}>로딩 중...</p>;

  return (
    <div style={{
      maxWidth: '800px',
      margin: '40px auto',
      padding: '20px',
      background: '#fff',
      borderRadius: '10px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      textAlign: 'center'
    }}>
      {user && (
        <>
        <div style={{ textAlign: 'center' }}> 
  {user.profile_picture && (
    <img 
      src={user.profile_picture} 
      alt="Profile" 
      style={{
        width: '120px', 
        height: '120px', 
        borderRadius: '50%', // 🔥 완벽한 원형
        objectFit: 'cover',  // 🔥 이미지 비율 유지
        display: 'block',    // 🔥 부모 요소 기준으로 중앙 정렬
        margin: '0 auto',    // 🔥 좌우 정렬 중앙
        marginBottom: '10px'
      }} 
    />
  )}
</div>
          <h1>{user.nickname || "Unknown User"}</h1>
          <p><strong>취미:</strong> {user.hobby || "입력되지 않음"}</p>
          <p><strong>상태 메시지:</strong> {user.status_message || "입력되지 않음"}</p>
          <p><strong>가입일:</strong> {new Date(user.join_date).toLocaleDateString()}</p>

          <h2>업적</h2>
          {stats && (
            <ul style={{ listStyleType: 'none', padding: 0 }}>
              <li>📌 작성한 게시글: <strong>{stats?.post_count ?? 0}</strong></li>
              <li>👍 받은 좋아요: <strong>{stats?.like_count ?? 0}</strong></li>
              <li>🔖 저장된 게시글: <strong>{stats?.collection_count ?? 0}</strong></li>
              <li>⬇️ 다운로드 횟수: <strong>{stats?.download_count ?? 0}</strong></li>
            </ul>
          )}

          <button 
            onClick={() => router.push('/profile')} 
            style={{
              padding: '10px 20px',
              marginTop: '20px',
              background: '#0070f3',
              color: '#fff',
              borderRadius: '5px',
              border: 'none',
              cursor: 'pointer'
            }}>
            프로필 수정
          </button>
        </>
      )}
    </div>
  );
};

export default UserInfo;
