// components/Card.js
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from '../lib/SessionContext';
import styles from '../styles/Card.module.css';

const Card = ({ post, categories, handleLike, author }) => {
  const router = useRouter();
  const { session } = useSession();
  
  // 썸네일 URL 생성 로직 수정
  const thumbnailUrl = post.thumbnail_url
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/thumbnails/${post.thumbnail_url}`
    : null;

  const matchedCategories = categories?.filter(cat =>
    post.category_ids?.includes(cat.id)
  ) || [];

  // 프로필 이미지 URL 생성 로직 수정
  const profileImageUrl = post.users?.profile_picture
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${post.users.profile_picture.replace(/^.*\/avatars\//, '')}`
    : "https://springdalemusic.vercel.app/profile-default.png";

  return (
    <div className={styles.card}>
      {thumbnailUrl && (
        <>
          <img src={thumbnailUrl} alt="Thumbnail" className={styles.thumbnail} />
          {post.file_urls && post.file_urls.length > 0 && (
            <div 
              className={styles.extensionBar} 
              data-ext={post.file_urls[0].split('.').pop().toLowerCase()}
            >
              {post.file_urls[0].split('.').pop().toLowerCase()}
            </div>
          )}
        </>
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
          <span>📥 {post.downloads ?? 0}</span>

          {/* 첨부파일 정보 */}
          {post.file_urls && post.file_urls.length > 0 && (
            <div className={styles.fileInfo}>
              <span>
                📎 첨부파일 {post.file_count || post.file_urls.length}개
              </span>
            </div>
          )}
          
          {/* 다운로드 권한 뱃지 */}
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
