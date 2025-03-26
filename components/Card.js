// components/Card.js
import React from 'react';
import { supabase } from '../lib/supabase';
import styles from '../styles/Card.module.css';

const Card = ({ post, categories = [], handleLike, handleDownload, author }) => {
  const thumbnailUrl = post.thumbnail_url
    ? supabase.storage.from('thumbnails').getPublicUrl(post.thumbnail_url).data.publicUrl
    : null;

  const fileList = post.file_urls || [];
  const categoryNames = categories
    .filter(cat => post.category_ids?.includes(cat.id))
    .map(cat => cat.name);

  const downloadFile = (fileUrl, fileName) => {
    if (handleDownload) handleDownload(post.id, post.downloads || 0);
    window.open(fileUrl, '_blank');
  };

  return (
    <div className={styles.card}>
      {/* 제목 */}
      <h2 className={styles['card-title']} onClick={() => window.location.href = `/post/${post.id}`}>
        {post.title}
      </h2>

      {/* 썸네일 */}
      {thumbnailUrl && (
        <img
          src={thumbnailUrl}
          alt="thumbnail"
          className={styles['card-img']}
          style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '8px' }}
        />
      )}

      {/* 본문 미리보기 */}
      <p className={styles['card-content']}>
        {post.content.length > 100 ? post.content.slice(0, 100) + '...' : post.content}
      </p>

      {/* 첨부파일 */}
      {fileList.length > 0 && (
        <div className={styles['card-file-link']}>
          {fileList.map((file, idx) => {
            const url = supabase.storage.from('files').getPublicUrl(file).data.publicUrl;
            const fileName = file.split('/').pop();
            return (
              <p key={idx}>
                <a onClick={() => downloadFile(url, fileName)} className={styles['card-file-link']}>
                  📎 {fileName}
                </a>
              </p>
            );
          })}
        </div>
      )}

      {/* 카테고리 표시 */}
      {categoryNames.length > 0 && (
        <div className={styles['card-category-container']}>
          {categoryNames.map((name, idx) => (
            <span key={idx} className={styles['card-category']}>
              {name}
            </span>
          ))}
        </div>
      )}

      {/* 작성자 정보 */}
      <div className={styles['card-author']}>
        {author?.image ? (
          <img src={author.image} className={styles['author-image']} alt="작성자" />
        ) : (
          <div className={styles['author-placeholder']}>
            {author?.name ? author.name[0] : 'A'}
          </div>
        )}
        <span>{author?.name || '익명'}</span>
      </div>

      {/* 좋아요, 댓글, 다운로드 수 */}
      <div className={styles['card-buttons']}>
        <button onClick={() => handleLike && handleLike(post.id, post.like_count || 0)}>
          👍 {post.like_count || 0}
        </button>
        <span>💬 {post.comment_count || 0}</span>
        <span>📥 {post.downloads || 0}</span>
      </div>
    </div>
  );
};

export default Card;
