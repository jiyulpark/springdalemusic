import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import styles from '../styles/Card.module.css';

const Card = ({ post, categories }) => {
  const router = useRouter(); // ✅ 반드시 컴포넌트 안에서 선언
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
        window.open(data.publicUrl, '_blank');

        const newDownloadCount = downloadCount + 1;
        setDownloadCount(newDownloadCount);

        await supabase
          .from('posts')
          .update({ downloads: newDownloadCount })
          .eq('id', post.id);
      } else {
        alert('파일을 다운로드할 수 없습니다.');
      }
    } catch (error) {
      console.error('❌ 다운로드 오류:', error);
      alert('다운로드 중 문제가 발생했습니다.');
    }
  };
  
  return (
    <div className={styles.card}>
      {/* 썸네일 이미지 */}
      {thumbnailUrl && (
        <img src={thumbnailUrl} alt="Thumbnail" className={styles.thumbnail} />
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
            <img src={post.users.profile_picture} className={styles.authorImage} alt="Author" />
          ) : (
            <div className={styles.authorPlaceholder}>
              {post.users?.nickname ? post.users.nickname[0] : 'A'}
            </div>
          )}
          <span
            className={styles.authorName}
            style={{ cursor: 'pointer', color: '#0070f3', textDecoration: 'underline' }}
            onClick={() => router.push(`/profile/${post.user_id}`)}
          >
            {post.users?.nickname || '스프링데일뮤직'}
          </span>
        </div>

        {/* 하단 정보 */}
        <div className={styles.footer}>
          <span>❤️ {post.like_count ?? 0}</span>
          <span>💬 {post.comment_count ?? 0}</span>
          <span className={styles.download} onClick={handleDownload}>
            📥 {downloadCount}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Card;
