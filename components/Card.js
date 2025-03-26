import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import styles from '../styles/Card.module.css';

const Card = ({ post, categories = [] }) => {
  const [downloadCount, setDownloadCount] = useState(post.downloads || 0);

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
        window.open(data.publicUrl, '_blank');

        const newDownloadCount = downloadCount + 1;

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

  const thumbnailUrl = post.thumbnail_url
    ? supabase.storage.from('thumbnails').getPublicUrl(post.thumbnail_url).data.publicUrl
    : null;

  const postCategories = categories.filter(cat => post.category_ids?.includes(cat.id));

  return (
    <div className={styles.card}>
      {thumbnailUrl && (
        <img src={thumbnailUrl} alt="썸네일" className={styles.thumbnail} />
      )}

      <div className={styles.content}>
        <Link href={`/post/${post.id}`} className={styles.title}>
          {post.title}
        </Link>

        <div className={styles.categoryContainer}>
          {postCategories.map(cat => (
            <span key={cat.id} className={styles.category}>
              {cat.name}
            </span>
          ))}
        </div>

        <div className={styles.meta}>
          <span>❤️ {post.like_count || 0}</span>
          <span>💬 {post.comment_count || 0}</span>
          <span>⬇️ {downloadCount}</span>
        </div>

        <div className={styles.footer}>
          <span></span>
          <button onClick={handleDownload} className={styles.download}>
            📥 다운로드
          </button>
        </div>
      </div>
    </div>
  );
};

export default Card;
