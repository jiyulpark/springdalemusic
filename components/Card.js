import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import { useSession } from '../lib/SessionContext';
import styles from '../styles/Card.module.css';

const Card = ({ post, categories }) => {
  const router = useRouter();
  const { session } = useSession();
  const thumbnailUrl = post.thumbnail_url
    ? supabase.storage.from('thumbnails').getPublicUrl(post.thumbnail_url).data?.publicUrl
    : null;

  const matchedCategories = categories?.filter(cat => post.category_ids?.includes(cat.id)) || [];

  const handleDownload = () => {
    if (!post.file_urls || post.file_urls.length === 0) {
      alert('첨부파일이 없습니다.');
      return;
    }

    const firstFile = post.file_urls[0];
    const filePath = typeof firstFile === 'string' ? firstFile : firstFile?.file_url;

    if (!filePath || typeof filePath !== 'string') {
      alert('파일 경로가 유효하지 않습니다.');
      return;
    }

    const downloadUrl = `/api/download?postId=${post.id}&filePath=${encodeURIComponent(filePath)}`;
    window.open(downloadUrl, '_blank');
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
