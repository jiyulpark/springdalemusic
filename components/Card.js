import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import styles from '../styles/Card.module.css';

const Card = ({ post, handleLike, handleDownload, author }) => {
  const [downloading, setDownloading] = useState(false);

  const categories = post.category ? post.category.split(',') : [];

  const handleSafeDownload = async (fileUrl, fileName) => {
    try {
      setDownloading(true);
      await handleDownload(post.id, post.downloads || 0);
      window.open(fileUrl, '_blank');
    } catch (error) {
      console.error("다운로드 실패:", error);
      alert("파일 다운로드 중 오류가 발생했습니다.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div key={post.id} className={styles.card}>
      <h2 
        className={styles['card-title']} 
        onClick={() => window.location.href = `/post/${post.id}`}
      >
        {post.title}
      </h2>

      {post.thumbnail_url && (
        <img 
          src={supabase.storage.from('thumbnails').getPublicUrl(post.thumbnail_url).data.publicUrl} 
          alt="thumbnail" 
          className={styles['card-img']} 
        />
      )}

      <p className={styles['card-content']}>
        {post.content.split(' ').map((word, index) => (
          word.match(/(https?:\/\/[^\s]+)/) ? (
            <a 
              key={index}
              href={word} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: '#0070f3', textDecoration: 'underline' }}
            >
              {word + ' '}
            </a>
          ) : `${word} `
        ))}
      </p>

      {post.file_urls && post.file_urls.length > 0 && (
        <div className={styles['card-file-link']}>
          {post.file_urls.map((file, index) => {
            const fileUrl = supabase.storage.from('files').getPublicUrl(file).data.publicUrl;
            const fileName = post.file_names ? post.file_names[index] : `파일 ${index + 1}`;
            return (
              <p key={index}>
                <button 
                  onClick={() => handleSafeDownload(fileUrl, fileName)} 
                  disabled={downloading}
                  className={styles['card-file-link']}
                >
                  📥 {fileName}
                </button>
              </p>
            );
          })}
        </div>
      )}

      {post.category && (
        <div className={styles['card-category-container']}>
          {categories.map((category, index) => (
            <span key={index} className={styles['card-category']}>
              {category}
            </span>
          ))}
        </div>
      )}

      <div className={styles['card-author']}>
        {author.image ? (
          <img src={author.image} className={styles['author-image']} alt="Author" />
        ) : (
          <div className={styles['author-placeholder']}>
            {author.name ? author.name[0] : 'A'}
          </div>
        )}
        <span>{author.name || '스프링데일뮤직'}</span>
      </div>

      <div className={styles['card-buttons']}>
        <button onClick={() => handleLike(post.id, post.likes || 0)} disabled={downloading}>
          👍 {post.likes || 0}
        </button>
        <span>💬 {post.comments || 0}</span>
        <span>📥 다운로드 {post.downloads || 0}</span>
      </div>
    </div>
  );
};

export default Card;
