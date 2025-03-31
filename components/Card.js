// components/Card.js
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

  const matchedCategories = categories?.filter(cat =>
    post.category_ids?.includes(cat.id)
  ) || [];

  const handleDownload = async (e) => {
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

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('다운로드하려면 로그인이 필요합니다.');
        return;
      }

      console.log('📥 다운로드 요청:', {
        postId: post.id,
        filePath: firstFile
      });

      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
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
      setDownloadCount(prev => prev + 1);
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('❌ 다운로드 에러:', error);
      alert(error.message);
    }
  };

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
              <span key={cat.id} className={styles.category}>{cat.name}</span>
            ))}
          </div>
        )}

        <div className={styles.cardAuthor}>
          {post.users?.profile_picture ? (
            <img
              src={post.users.profile_picture}
              className={styles.authorImage}
              alt="작성자 프로필"
            />
          ) : (
            <div className={styles.authorPlaceholder}>
              {post.users?.nickname ? post.users.nickname[0] : 'A'}
            </div>
          )}
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
          <span className={styles.download} onClick={handleDownload}>
            📥 {downloadCount}
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
