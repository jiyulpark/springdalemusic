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
  const [downloadCount, setDownloadCount] = useState(0);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchSession = async () => {
      const { data } = await supabase.auth.getSession();
      const sessionData = data?.session;
      
      console.log('세션 정보 로드:', {
        hasSession: !!sessionData,
        hasAccessToken: !!sessionData?.access_token,
        userId: sessionData?.user?.id
      });
      
      setSession(sessionData);

      if (sessionData?.user?.id) {
        const { data: userInfo } = await supabase
          .from('users')
          .select('role')
          .eq('id', sessionData.user.id)
          .single();
        if (userInfo) {
          setUserRole(userInfo.role);
          sessionData.user.role = userInfo.role;
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
          setDownloadCount(postData.downloads || 0);

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

  useEffect(() => {
    const fetchCategories = async () => {
      const { data: categoriesData } = await supabase.from('categories').select('*');
      setCategories(categoriesData || []);
    };
    fetchCategories();
  }, []);

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
    
    try {
      // 1. 첨부파일 삭제
      if (files.length > 0) {
        const fileUrls = files.map(file => file.file_url);
        console.log('삭제할 첨부파일:', fileUrls);
        
        const { error: storageError } = await supabase.storage
          .from('uploads')
          .remove(fileUrls);
        
        if (storageError) {
          console.error('파일 삭제 실패:', storageError);
          throw new Error('파일 삭제 중 오류가 발생했습니다.');
        }
        
        // files 테이블에서도 삭제
        const { error: filesError } = await supabase
          .from('files')
          .delete()
          .eq('post_id', post.id);
          
        if (filesError) {
          console.error('파일 정보 삭제 실패:', filesError);
          throw new Error('파일 정보 삭제 중 오류가 발생했습니다.');
        }
      }

      // 2. 썸네일 삭제
      if (post.thumbnail_url) {
        console.log('삭제할 썸네일:', post.thumbnail_url);
        
        const { error: thumbnailError } = await supabase.storage
          .from('thumbnails')
          .remove([post.thumbnail_url]);
          
        if (thumbnailError) {
          console.error('썸네일 삭제 실패:', thumbnailError);
          throw new Error('썸네일 삭제 중 오류가 발생했습니다.');
        }
      }

      // 3. 게시글 삭제
      const { error: postError } = await supabase
        .from('posts')
        .delete()
        .eq('id', post.id);
        
      if (postError) {
        console.error('게시글 삭제 실패:', postError);
        throw new Error('게시글 삭제 중 오류가 발생했습니다.');
      }

      alert('게시글이 성공적으로 삭제되었습니다.');
      router.push("/");
    } catch (error) {
      console.error('삭제 중 오류 발생:', error);
      alert(error.message);
    }
  };

  const handleDownload = async (postId, currentDownloads) => {
    try {
      const { error } = await supabase
        .from("posts")
        .update({ downloads: currentDownloads + 1 })
        .eq("id", postId);
      
      if (!error) {
        setDownloadCount(prevCount => prevCount + 1);
      }
    } catch (e) {
      console.error("다운로드 증가 실패", e.message);
    }
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

      <div className={styles.postInfo}>
        <span className={styles.author}>
          {post.users?.profile_picture ? (
            <img
              src={post.users.profile_picture}
              className={styles.authorImg}
              alt="작성자 프로필"
            />
          ) : (
            <div className={styles.authorPlaceholder}>
              {post.users?.nickname?.[0] || 'A'}
            </div>
          )}
          {post.users?.nickname || '익명'}
        </span>
        <span>조회 {post.view_count || 0}</span>
        <span>다운로드 {downloadCount}</span>
        <span>
          {new Date(post.created_at).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </span>
      </div>

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
          {categoryNames.map((name, index) => {
            const category = categories.find(cat => cat.name === name);
            return (
              <span 
                key={index} 
                className={styles.categoryBadge}
                data-type={category?.type}
              >
                {name}
              </span>
            );
          })}
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
                        if (!file.file_url) {
                          throw new Error('파일 경로가 없습니다.');
                        }

                        console.log('다운로드 시도:', {
                          postId: post.id,
                          filePath: file.file_url,
                          fileName: file.file_name,
                          userRole: userRole || 'guest',
                          hasAccessToken: !!session?.access_token
                        });

                        const headers = {
                          'Content-Type': 'application/json'
                        };
                        
                        // 액세스 토큰이 있으면 헤더에 추가
                        if (session?.access_token) {
                          headers['Authorization'] = `Bearer ${session.access_token}`;
                          console.log('액세스 토큰 추가됨');
                        } else {
                          console.log('액세스 토큰 없음, 세션 정보:', session ? '세션 있음' : '세션 없음');
                        }

                        const response = await fetch('/api/download', {
                          method: 'POST',
                          headers,
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
                          throw new Error(data.error || '다운로드 중 오류가 발생했습니다.');
                        }

                        if (!data.url) {
                          throw new Error('다운로드 URL이 생성되지 않았습니다.');
                        }

                        console.log('✅ 다운로드 URL 생성 성공');
                        // 다운로드 URL을 사용하여 파일 다운로드
                        const link = document.createElement('a');
                        link.href = data.url;
                        link.download = file.file_name || 'download';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        
                        // 다운로드 카운트 증가
                        handleDownload(post.id, downloadCount);
                        
                        // 대체 URL이 제공된 경우 백그라운드에서 미리 로드해둠
                        if (data.alternativeUrls && Array.isArray(data.alternativeUrls)) {
                          console.log('🔄 대체 URL 시도:', data.alternativeUrls.length);
                          data.alternativeUrls.forEach(url => {
                            const img = new Image();
                            img.src = url;
                          });
                        }
                        
                      } catch (error) {
                        console.error('❌ 다운로드 오류:', error);
                        alert(error.message);
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
