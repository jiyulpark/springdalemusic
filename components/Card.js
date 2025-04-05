"// components/Card.js
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import { useSession } from '../lib/SessionContext';
import styles from '../styles/Card.module.css';

const Card = ({ post, categories, handleDownload, handleLike, author }) => {
  const router = useRouter();
  const { session } = useSession();
  const [downloadCount, setDownloadCount] = useState(post.downloads ?? 0);
  
  console.log(`Card 컴포넌트 ID ${post.id} 다운로드 수:`, post.downloads);

  // 썸네일 URL 생성 로직 수정
  const thumbnailUrl = post.thumbnail_url
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/thumbnails/${post.thumbnail_url}`
    : null;

  const matchedCategories = categories?.filter(cat =>
    post.category_ids?.includes(cat.id)
  ) || [];

  const handleFileDownload = async (e) => {
    e.preventDefault();
    try {
      if (!post.file_urls || post.file_urls.length === 0) {
        alert('첨부파일이 없습니다.');
        return;
      }

      const firstFile = typeof post.file_urls[0] === 'string'
        ? post.file_urls[0]
        : post.file_urls[0]?.file_url;

      if (!firstFile) {
        alert('유효하지 않은 파일입니다.');
        return;
      }

      console.log('📥 다운로드 요청:', {
        postId: post.id,
        filePath: firstFile,
        userRole: session?.user?.role || 'guest'
      });

      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/download', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          postId: post.id,
          filePath: firstFile
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 403) {
          const roleNames = {
            'guest': '비로그인',
            'user': '일반 회원',
            'verified_user': '인증 회원',
            'admin': '관리자'
          };
          throw new Error(`${roleNames[data.requiredRole]} 이상만 다운로드할 수 있습니다. (현재: ${roleNames[data.currentRole]})`);
        }
        throw new Error(data.error || '다운로드에 실패했습니다.');
      }

      console.log('✅ 다운로드 URL 생성 성공');
      
      // 다운로드 카운트 증가시키기 (로그인/비로그인 모두)
      const newCount = (post.downloads || 0) + 1;
      setDownloadCount(newCount);
      
      // index.js의 handleDownload 함수 호출
      if (handleDownload) {
        handleDownload(post.id, post.downloads || 0);
      }
      
      // 다운로드 URL을 사용하여 파일 다운로드
      const link = document.createElement('a');
      link.href = data.url;
      link.download = post.file_name || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('❌ 다운로드 에러:', error);
      alert(error.message);
    }
  };

  // 프로필 이미지 URL 생성 로직 수정
  const profileImageUrl = post.users?.profile_picture
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${post.users.profile_picture.replace(/^.*\/avatars\//, '')}`
    : "https://springdalemusic.vercel.app/profile-default.png";

  return (
    <div className={styles.card}>
      {thumbnailUrl && (
        <img src={thumbnailUrl} alt="Thumbnail" className={styles.thumbnail} />
      )}

      <div className={styles.content}>
        <Link href={`/post/${post.id}`} className={styles.title}>
          {post.title}
        </Link>

        {matchedCategories.length > 0 && (
          <div className={styles.categoryContainer}>
            {matchedCategories.map(cat => (
              <span key={cat.id} className={styles.category} data-type={cat.type}>
                {cat.name}
              </span>
            ))}
          </div>
        )}

        <div className={styles.cardAuthor}>
          <img
            src={profileImageUrl}
            className={styles.authorImage}
            alt="작성자 프로필"
          />
          <span
            className={styles.authorName}
            onClick={() => router.push(`/profile/${post.user_id}`)}
          >
            {post.users?.nickname || '스프링데일'}
          </span>
        </div>

        <div className={styles.footer}>
          <span>❤️ {post.like_count ?? 0}</span>
          <span>💬 {post.comment_count ?? 0}</span>
          <span className={styles.download} onClick={handleFileDownload}>
            📥 {post.downloads ?? 0}
          </span>

          {post.download_permission === 'verified_user' && (
            <span className={styles.badge}>인증회원 전용 🔒</span>
          )}
          {post.download_permission === 'user' && (
            <span className={styles.badge}>일반 유저 이상 🔑</span>
          )}
          {post.download_permission === 'guest' && (
            <span className={styles.badge}>모두 가능 ✅</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default Card;
