import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

const UserProfile = () => {
  const router = useRouter();
  const { id } = router.query;

  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    postCount: 0,
    totalLikes: 0,
    totalDownloads: 0,
    bookmarkCount: 0
  });

  useEffect(() => {
    if (id) {
      fetchUserInfo();
      fetchUserStats();
    }
  }, [id]);

  const fetchUserInfo = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('nickname, profile_picture, status_message, join_date, role')
      .eq('id', id)
      .single();

    if (data) setUser(data);
  };

  const fetchUserStats = async () => {
    // 작성한 게시글
    const { data: posts } = await supabase
      .from('posts')
      .select('likes, downloads')
      .eq('user_id', id);

    // 저장한 게시글 수
    const { data: bookmarks } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('user_id', id);

    const postCount = posts?.length || 0;
    const totalLikes = posts?.reduce((sum, p) => sum + (p.likes || 0), 0);
    const totalDownloads = posts?.reduce((sum, p) => sum + (p.downloads || 0), 0);
    const bookmarkCount = bookmarks?.length || 0;

    setStats({ postCount, totalLikes, totalDownloads, bookmarkCount });
  };

  if (!user) return <p style={{ textAlign: 'center' }}>로딩 중...</p>;

  // 프로필 이미지 URL 생성 로직 수정
  const profileImageUrl = user?.profile_picture
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${user.profile_picture.replace(/^.*\/avatars\//, '')}`
    : "https://springdalemusic.vercel.app/profile-default.png";

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', textAlign: 'center' }}>
      <h1>{user?.nickname || '사용자'}님의 프로필</h1>

      {/* 프로필 이미지 */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
        <img
          src={profileImageUrl}
          alt="Profile"
          style={{ width: '150px', height: '150px', borderRadius: '50%', objectFit: 'cover' }}
        />
      </div>

      {/* 상태 메시지 및 정보 */}
      <p><strong>상태 메시지:</strong> {user.status_message || '없음'}</p>
      <p><strong>권한:</strong> {user.role === 'admin' ? '👑 관리자' : '🙋‍♂️ 일반 사용자'}</p>
      <p><strong>가입일:</strong> {new Date(user.join_date).toLocaleDateString('ko-KR')}</p>

      {/* 활동 요약 */}
      <hr style={{ margin: '20px 0' }} />
      <h3>📊 활동 요약</h3>
      <p>📌 작성한 게시글: <strong>{stats.postCount}</strong></p>
      <p>👍 받은 좋아요: <strong>{stats.totalLikes}</strong></p>
      <p>🔖 저장된 게시글: <strong>{stats.bookmarkCount}</strong></p>
      <p>⬇️ 다운로드 횟수: <strong>{stats.totalDownloads}</strong></p>

      <button onClick={() => router.back()} style={{ marginTop: '30px' }}>
        ← 뒤로가기
      </button>
    </div>
  );
};

export default UserProfile;
