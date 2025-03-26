import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import styles from '../styles/Card.module.css';

const Card = ({ post, categories = [] }) => {
  const [downloadCount, setDownloadCount] = useState(post.downloads || 0);

  // ✅ 다운로드 핸들러
  const handleDownload = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('로그인이 필요합니다.');
        return;
      }

      if (!post.file_urls || post.file_urls.length === 0) {
        alert('첨부파일이 없습니다.');
        return;
      }

      const { data } = supabase.storage.from('uploads').getPublicUrl(post.file_urls[0]);
      if (data?.publicUrl) {
        // ✅ 먼저 창 열기
        window.open(data.publicUrl, '_blank');

        const newDownloadCount = downloadCount + 1;

        // ✅ 세션 재확인 후 다운로드 수 업데이트
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession) {
          await supabase
            .from('posts')
            .update({ downloads: newDownloadCount })
            .eq('id', post.id);

          setDownloadCount(newDownloadCount);
        }
      } else {
        alert('파일을 다운로드할 수 없습니다.');
      }
    } catch (error) {
      console.error('❌ 다운로드 오류:', error);
      alert('다운로드 중 문제가 발생했습니다.');
    }
  };

  // ✅ 썸네일 URL
  const thumbnailUrl = post.thumbnail_url
    ? supabase.storage.from('thumbnails').getPublicUrl(post.thumbnail_url).data.publicUrl
    : null;

  // ✅ 카테고리 텍스트 표시용
  const postCategories = categories.filter(cat => post.category_ids?.includes(cat.id));

  return (
    <div className={styles.card}>
      {thumbnailUrl && (
        <img src={thumbnailUrl} alt="썸네일" className={styles.thumbnail} />
      )}

      <h3 className={styles.title}>
        <Link href={`/post/${post.id}`}>{post.title}</Link>
      </h3>

      <div className={styles.meta}>
        <span>❤️ {post.like_count || 0}</span>
        <span>💬 {post.comment_count || 0}</span>
        <span>⬇️ {downloadCount}</span>
      </div>

      <div className={styles.categories}>
        {postCategories.map(cat => (
          <span key={cat.id} className={styles.categoryTag}>
            {cat.name}
          </span>
        ))}
      </div>

      <div className={styles.actions}>
        <button onClick={handleDownload} className={styles.downloadButton}>
          📥 다운로드
        </button>
      </div>
    </div>
  );
};

export default Card;
