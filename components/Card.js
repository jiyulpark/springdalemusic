import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import styles from '../styles/Card.module.css';

const Card = ({ post, categories }) => {
  const router = useRouter();
  const [downloadCount, setDownloadCount] = useState(post.downloads ?? 0);

  // 썸네일 URL 계산
  const thumbnailUrl = post.thumbnail_url
    ? supabase.storage.from('thumbnails').getPublicUrl(post.thumbnail_url).data?.publicUrl
    : null;

  // 카테고리 매칭
  const matchedCategories = categories?.filter(cat => post.category_ids?.includes(cat.id)) || [];

  // 다운로드 처리
  const handleDownload = async () => {
    try {
      if (!post.file_urls || post.file_urls.length === 0) {
        alert('첨부파일이 없습니다.');
        return;
      }

      const { data } = supabase.storage.from('uploads').getPublicUrl(post.file_urls[0]);

      if (data?.publicUrl) {
        // 1. 즉시 UI 업데이트 (낙관적 업데이트)
        setDownloadCount(prev => prev + 1);

        // 2. 파일 다운로드 (비동기)
        window.open(data.publicUrl, '_blank');

        // 3. 백그라운드에서 다운로드 카운트 업데이트 (비차단)
        const updateDownloadCount = async () => {
          try {
            const response = await fetch('/api/download', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                postId: post.id, 
                currentDownloads: downloadCount + 1 
              })
            });

            if (!response.ok) {
              throw new Error('Download count update failed');
            }
          } catch (error) {
            console.error('다운로드 카운트 업데이트 실패:', error);
            // 실패 시 원복
            setDownloadCount(prev => prev - 1);
          }
        };

        // 중요: 비동기 작업을 즉시 트리거하지만 대기하지 않음
        updateDownloadCount();
      } else {
        alert('파일을 다운로드할 수 없습니다.');
      }
    } catch (error) {
      console.error('다운로드 오류:', error);
      alert('다운로드 중 문제가 발생했습니다.');
    }
  };
  
  return (
    <div className={styles.card}>
      {/* 썸네일 이미지 */}
      {thumbnailUrl && (
        <img 
          src={thumbnailUrl} 
          alt={`Thumbnail for ${post.title}`} 
          className={styles.thumbnail} 
        />
      )}

      <div className={styles.content}>
        {/* 제목 */}
        <Link href={`/post/${post.id}`} className={styles.title}>
          {post.title}
        </Link>

        {/* 카테고리 */}
        {matchedCategories.length > 0 && (
          <div className={styles.categoryContainer}>
            {matchedCategories.map(cat => (
              <span key={cat.id} className={styles.category}>{cat.name}</span>
            ))}
          </div>
        )}

        {/* 작성자 정보 */}
        <div className={styles.cardAuthor}>
          {post.users?.profile_picture ? (
            <img 
              src={post.users.profile_picture} 
              className={styles.authorImage} 
              alt={`Profile of ${post.users?.nickname}`} 
            />
          ) : (
            <div className={styles.authorPlaceholder}>
              {post.users?.nickname ? post.users.nickname[0] : 'A'}
            </div>
          )}
          <span
            role="button"
            tabIndex={0}
            className={styles.authorName}
            style={{ cursor: 'pointer', color: '#0070f3', textDecoration: 'underline' }}
            onClick={() => router.push(`/profile/${post.user_id}`)}
            onKeyPress={(e) => e.key === 'Enter' && router.push(`/profile/${post.user_id}`)}
          >
            {post.users?.nickname || '스프링데일뮤직'}
          </span>
        </div>

        {/* 하단 정보 */}
        <div className={styles.footer}>
          <span>❤️ {post.like_count ?? 0}</span>
          <span>💬 {post.comment_count ?? 0}</span>
          <span 
            className={styles.download} 
            onClick={handleDownload}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => e.key === 'Enter' && handleDownload()}
          >
            📥 {downloadCount}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Card;