// components/Card.js
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from '../lib/SessionContext';
import styles from '../styles/Card.module.css';

const Card = ({ post, categories, handleLike, author }) => {
  const router = useRouter();
  const { session } = useSession();

  // 썸네일 URL 생성
  const thumbnailUrl = post.thumbnail_url
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/thumbnails/${post.thumbnail_url}`
    : null;

  // 카테고리 매칭
  const matchedCategories = categories?.filter(cat =>
    post.category_ids?.includes(cat.id)
  ) || [];

  // 프로필 이미지
  const profileImageUrl = post.users?.profile_picture
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${post.users.profile_picture.replace(/^.*\/avatars\//, '')}`
    : "https://springdalemusic.vercel.app/profile-default.png";

  // 확장자 분석 로직
  const rawExtList = post.file_urls?.map(url => url.split('.').pop().toLowerCase()) || [];
  const extList = rawExtList.filter(ext => ext !== 'zip');
  const extSet = new Set(extList);

  let fileExt = extList[0] ?? 'zip'; // 기본 zip 대비

  if (extSet.has('wav') && extSet.has('am3data')) {
    fileExt = 'AM3+IR(WAVE)';
  } else if (extSet.has('wav') && extSet.has('am2data')) {
    fileExt = 'AM2+IR(WAVE)';
  } else if (extSet.size === 1 && extSet.has('wav')) {
    fileExt = 'IR(WAVE)';
  }

  // 첨부파일 클릭 핸들러
  const handleAttachmentClick = async (e) => {
    e.preventDefault();
    if (!post.file_urls || post.file_urls.length === 0) return;
    const zipUrl = post.file_urls.find(url => url.toLowerCase().endsWith('.zip'));
    const singleUrl = !zipUrl && post.file_urls.length === 1 ? post.file_urls[0] : null;
    const fileUrl = zipUrl || singleUrl;
    if (!fileUrl) return;
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
      const response = await fetch('/api/download', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          postId: post.id,
          filePath: fileUrl
        })
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.error || '다운로드 권한이 없습니다.');
        return;
      }
      window.open(data.url, '_blank');
    } catch (err) {
      alert('다운로드 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className={styles.card}>
      {thumbnailUrl && (
        <>
          <img src={thumbnailUrl} alt="Thumbnail" className={styles.thumbnail} />
          {post.file_urls && post.file_urls.length > 0 && (
            <div 
              className={styles.extensionBar} 
              data-ext={fileExt.toLowerCase()}
            >
              {fileExt}
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

          {post.file_urls && post.file_urls.length > 0 && (
            <div className={styles.fileInfo}>
              {(() => {
                const zipUrl = post.file_urls.find(url => url.toLowerCase().endsWith('.zip'));
                const singleUrl = !zipUrl && post.file_urls.length === 1 ? post.file_urls[0] : null;
                if (zipUrl || singleUrl) {
                  return (
                    <span
                      className={styles.download}
                      style={{ cursor: 'pointer', color: '#0070f3', fontWeight: 'bold' }}
                      onClick={handleAttachmentClick}
                      title="첨부파일 다운로드"
                    >
                      📎 첨부파일
                    </span>
                  );
                } else {
                  return <span>📎 첨부파일</span>;
                }
              })()}
              <span style={{ marginLeft: 4 }}>{post.file_count || post.file_urls.length}개</span>
            </div>
          )}

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
