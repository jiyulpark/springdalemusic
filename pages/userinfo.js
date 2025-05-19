import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/router';
import { useSession } from '../lib/SessionContext';
import Link from 'next/link';
import styles from '../styles/UserInfo.module.css';

const UserInfo = () => {
  const { session, role, loading: sessionLoading } = useSession();
  const router = useRouter();
  const [userInfo, setUserInfo] = useState(null);
  const [likedPosts, setLikedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!session) {
      router.push('/auth/login');
      return;
    }

    const fetchUserInfo = async () => {
      try {
        setError(null);
        console.log("🔍 데이터 가져오기 시작!");

        const userId = session.user.id;
        const userEmail = session.user.email;
        console.log("✅ 로그인된 사용자 ID:", userId);

        // 🔥 users 테이블에서 유저 정보 가져오기
        const { data: userData, error: userError } = await supabase
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
                  role: 'user',
                  join_date: new Date(),
                  nickname: userEmail,
                  hobby: '',
                  status_message: ''
                }
              ])
              .select('*')
              .single();
            
            if (insertError) {
              throw new Error("사용자 정보를 생성할 수 없습니다.");
            }
            
            console.log("✅ 새 사용자 생성 성공:", newUser);
            setUserInfo(newUser);
            setStats({
              post_count: 0,
              like_count: 0,
              download_count: 0
            });
            return;
          }
          throw userError;
        }

        console.log("✅ 유저 정보:", userData);
        setUserInfo(userData);

        // 🔥 유저의 활동 데이터 가져오기
        const { data: userStats, error: statsError } = await supabase.rpc('get_user_stats', { user_uuid: userId });

        if (statsError) {
          console.error("❌ 유저 통계 가져오기 실패:", statsError.message);
          setStats({
            post_count: 0,
            like_count: 0,
            download_count: 0
          });
        } else {
          console.log("✅ 유저 활동 데이터:", userStats);
          setStats(Array.isArray(userStats) ? userStats[0] : userStats);
        }
      } catch (error) {
        console.error("❌ 데이터 가져오기 실패:", error.message);
        setError("사용자 정보를 불러오는 중 문제가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    const fetchLikedPosts = async () => {
      try {
        const { data: likes, error: likesError } = await supabase
          .from('likes')
          .select('post_id')
          .eq('user_id', session.user.id);

        if (likesError) throw likesError;

        if (likes && likes.length > 0) {
          const postIds = likes.map(like => like.post_id);
          const { data: posts, error: postsError } = await supabase
            .from('posts')
            .select(`
              id,
              title,
              category,
              created_at
            `)
            .in('id', postIds)
            .order('created_at', { ascending: false });

          if (postsError) throw postsError;
          setLikedPosts(posts);
        }
      } catch (error) {
        console.error('Error fetching liked posts:', error);
      } finally {
        setLoadingPosts(false);
      }
    };

    fetchUserInfo();
    fetchLikedPosts();
  }, [session, router]);

  if (sessionLoading || loading) {
    return <div className={styles.loading}>로딩 중...</div>;
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorMessage}>
          {error}
        </div>
        <button 
          onClick={() => router.push('/profile')} 
          className={styles.editButton}
        >
          프로필 설정으로 이동
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.userInfoCard}>
        <div className={styles.profileSection}>
          {userInfo.profile_picture ? (
            <img 
              src={userInfo.profile_picture} 
              alt="Profile" 
              className={styles.profileImage}
            />
          ) : (
            <div className={styles.profilePlaceholder}>
              {userInfo.nickname ? userInfo.nickname.charAt(0).toUpperCase() : '?'}
            </div>
          )}
          <h1>{userInfo.nickname || "Unknown User"}</h1>
        </div>
        <div className={styles.infoSection}>
          <p><strong>이메일:</strong> {userInfo.email}</p>
          <p><strong>역할:</strong> {role === 'admin' ? '관리자' : '일반 사용자'}</p>
          <p><strong>가입일:</strong> {new Date(userInfo.join_date).toLocaleDateString()}</p>
          {userInfo.hobby && <p><strong>취미:</strong> {userInfo.hobby}</p>}
          {userInfo.status_message && <p><strong>상태 메시지:</strong> {userInfo.status_message}</p>}
        </div>
        <div className={styles.buttonGroup}>
          <button 
            onClick={() => router.push('/profile')} 
            className={styles.editButton}
          >
            프로필 수정
          </button>
          <button 
            onClick={() => router.push('/profile/delete-account')} 
            className={styles.deleteButton}
          >
            회원 탈퇴
          </button>
        </div>
      </div>

      <div className={styles.likedPostsCard}>
        <h2>좋아요한 게시글</h2>
        {loadingPosts ? (
          <div className={styles.loading}>로딩 중...</div>
        ) : likedPosts.length > 0 ? (
          <div className={styles.likedPostsList}>
            {likedPosts.map(post => (
              <div key={post.id} className={styles.likedPostItem}>
                <Link href={`/post/${post.id}`} className={styles.postLink}>
                  <span className={styles.postTitle}>{post.title}</span>
                  <span className={styles.postCategory}>{post.category}</span>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.noPosts}>아직 좋아요한 게시글이 없습니다.</p>
        )}
      </div>
    </div>
  );
};

export default UserInfo;
