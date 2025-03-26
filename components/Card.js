import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import { useSession } from '../lib/SessionContext'; // ✅ 추가
import styles from '../styles/Card.module.css';

const Card = ({ post, categories }) => {
  const router = useRouter();
  const { session } = useSession(); // ✅ 세션 불러오기
  const [downloadCount, setDownloadCount] = useState(post.downloads ?? 0);

  const thumbnailUrl = post.thumbnail_url
    ? supabase.storage.from('thumbnails').getPublicUrl(post.thumbnail_url).data?.publicUrl
    : null;

  const matchedCategories = categories?.filter(cat => post.category_ids?.includes(cat.id)) || [];

  const handleDownload = async () => {
    try {
     
      if (!post.file_urls || post.file_urls.length === 0) {
        alert('첨부파일이 없습니다.');
        return;
      }

      const { data } = supabase.storage.from('uploads').getPublicUrl(post.file_urls[0]);

      if (data?.publicUrl) {
        setDownloadCount(prev => prev + 1);
        window.open(data.publicUrl, '_blank');

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

            if (!response.ok) throw new Error('Download count update failed');
          } catch (error) {
            console.error('다운로드 카운트 업데이트 실패:', error);
            setDownloadCount(prev => prev - 1);
          }
        };

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
      {thumbnailUrl && (
        <img 
          src={thumbnailUrl} 
          alt={`Thumbnail for ${post.title}`} 
          className={styles.thumbnail} 
        />
      )}

      <div className={styles.content}>
        <Link href={`/post/${post.id}`} className={styles.title}>
          {post.title}
        </Link>

        {matchedCategories.length > 0 && (
          <div className={styles.categoryContainer}>
            {matchedCategories.map(cat => (
              <span key={cat.id} className={styles.category}>{cat.name}</span>
            ))}
          </div>
        )}

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
