import React from 'react';
import Image from 'next/image'; // ✅ Next.js 최적화된 Image 컴포넌트 사용
import { supabase } from '../lib/supabase';
import styles from '../styles/Card.module.css';

// 링크를 감지하여 <a> 태그로 변환하는 함수
const convertLinksToClickable = (content) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return content.split(' ').map((word, index) => {
    if (word.match(urlRegex)) {
      return (
        <a
          key={index}
          href={word}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#0070f3', textDecoration: 'underline' }}
        >
          {word + ' '}
        </a>
      );
    }
    return word + ' ';
  });
};

// 줄바꿈과 링크 변환을 처리하는 함수
const formatContent = (content) => {
  return content.split('\n').map((line, index) => (
    <React.Fragment key={index}>
      {convertLinksToClickable(line)}
      <br />
    </React.Fragment>
  ));
};

const Card = ({ post, handleLike, handleDownload, author }) => {
  return (
    <div key={post.id} className={styles.card}>
      {/* 제목 - 썸네일 위로 이동 */}
      <h2 
        className={styles['card-title']} 
        onClick={() => window.location.href = `/post/${post.id}`}
      >
        {post.title}
      </h2>

      {/* 썸네일 - Next.js Image 최적화 적용 */}
      {post.thumbnail_url && (
        <Image
          src={supabase.storage.from('thumbnails').getPublicUrl(post.thumbnail_url).data.publicUrl}
          alt="thumbnail"
          width={300} // ✅ 너비 지정
          height={200} // ✅ 높이 지정
          className={styles['card-img']}
        />
      )}

      {/* 본문 내용에서 링크를 감지하고, 클릭 가능한 링크로 변환, 줄바꿈 처리 */}
      <p className={styles['card-content']}>
        {formatContent(post.content)}
      </p>

      {/* 파일 링크 */}
      {post.file_urls && post.file_urls.length > 0 && (
        <div className={styles['card-file-link']}>
          {post.file_urls.map((file, index) => {
            const fileUrl = supabase.storage.from('files').getPublicUrl(file).data.publicUrl;
            const fileName = post.file_names ? post.file_names[index] : `파일 ${index + 1}`;
            return (
              <p key={index}>
                <a 
                  href={fileUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={() => handleDownload(post.id, post.downloads || 0)}
                  className={styles['card-file-link']}
                >
                  📥 {fileName}
                </a>
              </p>
            );
          })}
        </div>
      )}

      {/* 카테고리 버튼 각각 표시 */}
      {post.category && (
        <div className={styles['card-category-container']}>
          {post.category.split(',').map((category, index) => (
            <span key={index} className={styles['card-category']}>
              {category}
            </span>
          ))}
        </div>
      )}

      {/* 작성자 정보 - Next.js Image 최적화 적용 */}
      <div className={styles['card-author']}>
        {post.author_image ? (
          <Image 
            src={post.author.image} 
            width={30} // ✅ 너비 지정
            height={30} // ✅ 높이 지정
            className={styles['author-image']} 
            alt="Author" 
          />
        ) : (
          <div className={styles['author-placeholder']}>
            {author.name ? author.name[0] : 'A'}
          </div>
        )}
        <span>{author.name || '스프링데일뮤직'}</span>
      </div>

      {/* 좋아요, 댓글, 다운로드 버튼 */}
      <div className={styles['card-buttons']}>
        <button onClick={() => handleLike(post.id, post.likes || 0)}>
          👍 {post.likes || 0}
        </button>
        <span>💬 {post.comments || 0}</span>
        <span>📥 다운로드 {post.downloads || 0}</span>
      </div>
    </div>
  );
};

export default Card;
