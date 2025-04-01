import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import styles from '../../styles/PostDetail.module.css';

const PostDetail = () => {
  const router = useRouter();
  const { id } = router.query;
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [likes, setLikes] = useState(0);
  const [userLiked, setUserLiked] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [files, setFiles] = useState([]);
  const [categoryNames, setCategoryNames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (session?.user?.id) {
        const { data: userInfo } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single();
        if (userInfo) {
          setUserRole(userInfo.role);
          session.user.role = userInfo.role;
        }
      }
    };
    fetchSession();
  }, []);

  useEffect(() => {
    if (id) {
      const fetchPostData = async () => {
        setLoading(true);

        const { data: postData, error: postError } = await supabase
          .from('posts')
          .select(`*, users (id, nickname, profile_picture)`)
          .eq('id', id)
          .single();

        if (!postError) {
          setPost(postData);

          if (postData.category_ids?.length > 0) {
            const { data: allCategories } = await supabase.from('categories').select('id, name');
            const matched = allCategories.filter(cat => postData.category_ids.includes(cat.id));
            setCategoryNames(matched.map(c => c.name));
          }
        }

        const { data: commentsData } = await supabase
          .from('comments')
          .select('*')
          .eq('post_id', id)
          .order('created_at', { ascending: true });

        if (commentsData) {
          const commentsWithUsers = await Promise.all(
            commentsData.map(async (comment) => {
              const { data: userData } = await supabase
                .from('users')
                .select('nickname, profile_picture')
                .eq('id', comment.user_id)
                .single();
              return {
                ...comment,
                user: userData || { nickname: "익명", profile_picture: null }
              };
            })
          );
          setComments(commentsWithUsers);
        }

        const { data: likesData } = await supabase
          .from('likes')
          .select('*')
          .eq('post_id', id);

        setLikes(likesData ? likesData.length : 0);
        if (session?.user) {
          setUserLiked(likesData?.some(like => like.user_id === session.user.id));
        }

        const { data: filesData } = await supabase
          .from('files')
          .select('*')
          .eq('post_id', id);

        setFiles(filesData || []);
        setLoading(false);
      };

      fetchPostData();
    }
  }, [id, session]);

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("정말로 이 댓글을 삭제하시겠습니까?")) return;
    await supabase.from('comments').delete().eq('id', commentId);
    setComments(comments.filter(comment => comment.id !== commentId));
  };

  const handleLike = async () => {
    if (!session?.user) return alert('로그인이 필요합니다!');
    const { data: existingLike } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', id)
      .eq('user_id', session.user.id)
      .single();

    if (existingLike) {
      await supabase.from('likes').delete().eq('id', existingLike.id);
      setLikes(likes - 1);
      setUserLiked(false);
    } else {
      await supabase.from('likes').insert([{ post_id: id, user_id: session.user.id }]);
      setLikes(likes + 1);
      setUserLiked(true);
    }
  };

  const handleAddComment = async () => {
    if (!session?.user) return alert('로그인이 필요합니다!');
    if (!newComment.trim()) return alert('댓글을 입력하세요!');

    const { data: commentData, error } = await supabase
      .from('comments')
      .insert([{ post_id: id, user_id: session.user.id, content: newComment }])
      .select();

    if (error) {
      alert('댓글 등록에 실패했습니다.');
      console.error(error);
      return;
    }

    if (commentData && commentData.length > 0) {
      const { data: userData } = await supabase
        .from('users')
        .select('nickname, profile_picture')
        .eq('id', session.user.id)
        .single();

      const newCommentWithUser = {
        ...commentData[0],
        user: userData || { nickname: "익명", profile_picture: null }
      };

      setComments([...comments, newCommentWithUser]);
      setNewComment('');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("정말로 이 게시글을 삭제하시겠습니까?")) return;
    if (files.length > 0) {
      await supabase.storage.from('uploads').remove(files.map(file => file.file_url));
    }
    if (post.thumbnail_url) {
      await supabase.storage.from('thumbnails').remove([post.thumbnail_url]);
    }
    await supabase.from('posts').delete().eq('id', post.id);
    router.push("/");
  };

  if (loading) return <p className={styles.loading}>로딩 중...</p>;
  if (!post) return <p className={styles.error}>게시글을 찾을 수 없습니다.</p>;

  const canDownload = (
    userRole === 'admin' ||
    post.download_permission === 'guest' ||
    (post.download_permission === 'user' && ['user', 'verified_user'].includes(userRole)) ||
    (post.download_permission === 'verified_user' && ['verified_user'].includes(userRole))
  );

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{post.title}</h1>

      {post.thumbnail_url && (
        <div className={styles.thumbnailContainer}>
          <img
            src={supabase.storage.from('thumbnails').getPublicUrl(post.thumbnail_url).data.publicUrl}
            alt="Thumbnail"
            className={styles.thumbnailImage}
          />
        </div>
      )}

      <div className={styles.content}>
        {post.content.split('\n').map((line, i) => (
          <div key={i}>
            {line.split(' ').map((word, j) => {
              const isLink = word.startsWith('http://') || word.startsWith('https://');
              return isLink ? (
                <a
                  key={j}
                  href={word}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#0070f3', textDecoration: 'underline', wordBreak: 'break-word' }}
                >
                  {word + ' '}
                </a>
              ) : (
                <span key={j}>{word + ' '}</span>
              );
            })}
          </div>
        ))}
      </div>

      {categoryNames.length > 0 && (
        <div className={styles.categoryBadgeContainer}>
          {categoryNames.map((name, index) => (
            <span key={index} className={styles.categoryBadge}>{name}</span>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className={styles.files}>
          <h3>첨부 파일</h3>
          <ul>
            {files.map((file, index) => (
              <li key={index} className={styles.fileItem}>
                {canDownload ? (
                  <a
                    href="#"
                    onClick={async (e) => {
                      e.preventDefault();
                      try {
                        const { data: { session } } = await supabase.auth.getSession();
                        if (!session?.access_token) {
                          throw new Error('로그인이 필요합니다.');
                        }

                        console.log('다운로드 시도:', {
                          postId: post.id,
                          filePath: file.file_url,
                          fileName: file.file_name,
                          userRole: userRole
                        });

                        const response = await fetch('/api/download', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.access_token}`
                          },
                          body: JSON.stringify({
                            postId: post.id,
                            filePath: file.file_url
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
                          throw new Error(data.error || '다운로드 URL 생성 실패');
                        }
                        
                        if (!data.url) {
                          throw new Error('다운로드 URL이 생성되지 않았습니다.');
                        }

                        console.log('다운로드 URL 생성 성공:', data.url);
                        window.open(data.url, '_blank');
                      } catch (error) {
                        console.error('다운로드 오류:', error);
                        alert(`다운로드 중 오류가 발생했습니다: ${error.message}`);
                      }
                    }}
                    className={styles.downloadLink}
                  >
                    📥 {file.file_name}
                  </a>
                ) : (
                  <span className={styles.lockedDownload}>🔒 다운로드 권한이 없습니다</span>
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
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.buttonContainer}>
        <button onClick={handleLike} className={styles.likeButton}>❤️ {likes}</button>

        {(session?.user.id === post.user_id || userRole === 'admin') && (
          <>
            <button onClick={() => router.push(`/edit/${id}`)} className={styles.editButton}>수정</button>
            <button onClick={handleDelete} className={styles.deleteButton}>삭제</button>
          </>
        )}

        <button onClick={() => router.push('/')} className={styles.backButton}>목록으로</button>
      </div>

      <div className={styles.commentSection}>
        <h3>댓글</h3>
        {comments.length > 0 ? (
          <ul className={styles.commentList}>
            {comments.map((comment, index) => (
              <li key={index} className={styles.commentItem}>
                <div className={styles.commentHeader}>
                  {comment.user?.profile_picture && (
                    <img
                      src={comment.user.profile_picture}
                      alt="프로필"
                      className={styles.commentAvatar}
                    />
                  )}
                  <span className={styles.commentAuthor}>
                    {comment.user?.nickname || "익명"}
                  </span>
                  <span className={styles.commentDate}>
                    {new Date(comment.created_at).toLocaleString('ko-KR')}
                  </span>
                </div>
                <p className={styles.commentContent}>{comment.content}</p>

                {(session?.user.id === comment.user_id || userRole === 'admin') && (
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className={styles.deleteCommentButton}
                  >
                    삭제
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.noComments}>댓글이 없습니다.</p>
        )}

        {session && (
          <div className={styles.commentInputContainer}>
            <input
              type="text"
              placeholder="댓글을 입력하세요..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className={styles.commentInput}
            />
            <button onClick={handleAddComment} className={styles.commentButton}>댓글 등록</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PostDetail;
