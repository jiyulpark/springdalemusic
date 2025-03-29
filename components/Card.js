import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import { useSession } from '../lib/SessionContext';
import styles from '../styles/Card.module.css';

const Card = ({ post, categories }) => {
  const router = useRouter();
  const { session } = useSession();
  const [downloadCount, setDownloadCount] = useState(post.downloads ?? 0);

  const thumbnailUrl = post.thumbnail_url
    ? supabase.storage.from('thumbnails').getPublicUrl(post.thumbnail_url).data?.publicUrl
    : null;

  const matchedCategories = categories?.filter(cat => post.category_ids?.includes(cat.id)) || [];

  const handleDownload = async () => {
    if (!post.file_urls || post.file_urls.length === 0) {
      alert('첨부파일이 없습니다.');
      return;
    }

    const { data } = supabase.storage.from('uploads').getPublicUrl(post.file_urls[0]);

    if (data?.publicUrl) {
      window.open(data.publicUrl, '_blank');
      setDownloadCount(prev => prev + 1);

      try {
        await fetch('/api/download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId: post.id })
        });
      } catch (error) {
        console.error('❌ 다운로드 카운트 증가 실패:', error);
        setDownloadCount(prev => prev - 1);
      }
    } else {
      alert('파일을 다운로드할 수 없습니다.');
    }
  };

  return (
    <div className={styles.card}>
      {thumbnailUrl && <img src={thumbnailUrl} alt="Thumbnail" className={styles.thumbnail} />}

      <div className={styles.content}>
        <Link href={`/post/${post.id}`} className={styles.title}>{post.title}</Link>

        {matchedCategories.length > 0 && (
          <div className={styles.categoryContainer}>
            {matchedCategories.map(cat => (
              <span key={cat.id} className={styles.category}>{cat.name}</span>
            ))}
          </div>
        )}

        <div className={styles.cardAuthor}>
          {post.users?.profile_picture ? (
            <img src={post.users.profile_picture} className={styles.authorImage} />
          ) : (
            <div className={styles.authorPlaceholder}>
              {post.users?.nickname?.[0] || 'A'}
            </div>
          )}
          <span
            className={styles.authorName}
            onClick={() => router.push(`/profile/${post.user_id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && router.push(`/profile/${post.user_id}`)}
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
            onKeyDown={(e) => e.key === 'Enter' && handleDownload()}
          >
            📥 {downloadCount}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Card;
