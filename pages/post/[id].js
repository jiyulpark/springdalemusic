import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';

// URL을 감지하여 링크로 변환하는 함수
const linkifyContent = (content) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g; // URL 정규식
  return content.split(' ').map((word, index) => {
    if (word.match(urlRegex)) {
      // 링크라면 <a> 태그로 감싸서 클릭 가능하게 만든다
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

// 줄바꿈과 띄어쓰기를 처리하는 함수
const formatContent = (content) => {
  // 엔터(\n)를 <br /> 태그로 변환
  return content.split('\n').map((line, index) => (
    <React.Fragment key={index}>
      {linkifyContent(line)}
      <br />
    </React.Fragment>
  ));
};

const PostDetail = () => {
  const router = useRouter();
  const { id } = router.query;
  const [post, setPost] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
    };
    fetchSession();
  }, []);

  useEffect(() => {
    if (id) {
      const fetchPost = async () => {
        try {
          const { data, error } = await supabase.from('posts').select('*').eq('id', id).single();
          if (error) {
            console.error('게시글 불러오기 실패:', error.message);
            alert('게시글을 불러오는 데 실패했습니다.');
          } else {
            setPost(data);
          }
        } catch (error) {
          console.error('게시글 불러오기 실패:', error.message);
          alert('게시글을 불러오는 데 문제가 발생했습니다.');
        } finally {
          setLoading(false);
        }
      };
      fetchPost();
    }
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm("정말로 이 게시글을 삭제하시겠습니까?")) return;

    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", post.id);

    if (error) {
      console.error("삭제 오류:", error.message);
      alert("게시글 삭제 실패!");
    } else {
      alert("게시글이 삭제되었습니다.");
      router.push("/");
    }
  };

  if (loading) return <p style={{ textAlign: 'center' }}>로딩 중...</p>;
  if (!post) return <p style={{ textAlign: 'center', color: 'red' }}>게시글을 찾을 수 없습니다.</p>;

  const isAuthor = session && session.user.id === post.user_id;

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '20px', background: '#fff', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}>
      <h1>{post.title}</h1>
      <p><strong>작성자:</strong> {post.user_id}</p>

      {post.thumbnail_url && (
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <img src={supabase.storage.from('thumbnails').getPublicUrl(post.thumbnail_url).data.publicUrl} alt="Thumbnail" style={{ maxWidth: '100%', borderRadius: '10px' }} />
        </div>
      )}

      {/* 본문 내용에서 링크를 감지하고, 클릭 가능한 링크로 변환, 줄바꿈 처리 */}
      <div style={{ whiteSpace: 'pre-wrap' }}>
        {formatContent(post.content)}
      </div>

      <p><strong>카테고리:</strong> {post.category}</p>

      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        <button onClick={() => router.push('/')} style={{ padding: '10px', background: '#0070f3', color: '#fff', borderRadius: '5px', border: 'none' }}>목록으로</button>
        {isAuthor && (
          <>
            <button onClick={() => router.push(`/edit/${post.id}`)} style={{ padding: '10px', background: '#28a745', color: '#fff', borderRadius: '5px', border: 'none' }}>수정</button>
            <button onClick={handleDelete} style={{ padding: '10px', background: '#dc3545', color: '#fff', borderRadius: '5px', border: 'none' }}>삭제</button>
          </>
        )}
      </div>
    </div>
  );
};

export default PostDetail;
