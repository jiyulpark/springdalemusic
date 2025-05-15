import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/router';

const UserInfo = () => {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUserInfo = async () => {
      setLoading(true);
      setError(null);
      
      console.log("🔍 데이터 가져오기 시작!");

      try {
        // 🔥 현재 로그인한 사용자 정보 가져오기
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("❌ 세션 가져오기 실패:", sessionError.message);
          setError("세션 정보를 불러올 수 없습니다.");
          setLoading(false);
          return;
        }

        if (!session) {
          console.log("🚨 로그인된 사용자가 없음, 로그인 페이지로 이동!");
          setTimeout(() => {
            router.push('/auth/login');
          }, 500);
          return;
        }

        const userId = session.user.id;
        const userEmail = session.user.email;
        console.log("✅ 로그인된 사용자 ID:", userId);

        // 🔥 users 테이블에서 유저 정보 가져오기
        const { data: userInfo, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        // 사용자가 존재하지 않는 경우 생성
        if (userError) {
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
              setError("사용자 정보를 생성할 수 없습니다. 프로필 페이지에서 다시 시도해 주세요.");
              setLoading(false);
              return;
            }
            
            console.log("✅ 새 사용자 생성 성공:", newUser);
            setUser(newUser);
            setStats({
              post_count: 0,
              like_count: 0,
              download_count: 0
            });
            setLoading(false);
            return;
          } else {
            console.error("❌ 유저 정보 가져오기 실패:", userError.message);
            setError("사용자 정보를 불러올 수 없습니다.");
            setLoading(false);
            return;
          }
        }

        console.log("✅ 유저 정보:", userInfo);
        setUser(userInfo);

        // 🔥 유저의 활동 데이터 가져오기 (get_user_stats 함수 호출)
        console.log("🔄 get_user_stats 실행 중...");
        const { data: userStats, error: statsError } = await supabase.rpc('get_user_stats', { user_uuid: userId });

        if (statsError) {
          console.error("❌ 유저 통계 가져오기 실패:", statsError.message);
          // 기본 통계 정보 설정
          setStats({
            post_count: 0,
            like_count: 0,
            download_count: 0
          });
        } else {
          console.log("✅ 유저 활동 데이터:", userStats);

          // 🔥 데이터가 배열인지 확인하고 설정
          if (Array.isArray(userStats) && userStats.length > 0) {
            setStats(userStats[0]); // 🔥 배열이면 첫 번째 요소 사용
          } else {
            setStats(userStats); // 🔥 객체 형태 그대로 사용
          }
        }
      } catch (error) {
        console.error("❌ 데이터 가져오기 실패:", error.message);
        setError("사용자 정보를 불러오는 중 문제가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, []);

  if (loading) return <p style={{ textAlign: 'center' }}>로딩 중...</p>;

  if (error) {
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
        <div style={{ 
          padding: '10px', 
          marginBottom: '20px', 
          backgroundColor: '#ffebee', 
          color: '#c62828', 
          borderRadius: '5px' 
        }}>
          {error}
        </div>
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
          프로필 설정으로 이동
        </button>
      </div>
    );
  }

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
          {user.profile_picture ? (
            <img 
              src={user.profile_picture} 
              alt="Profile" 
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
              {user.nickname ? user.nickname.charAt(0).toUpperCase() : '?'}
            </div>
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
