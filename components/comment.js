import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const Comment = ({ postId }) => {
  const [comments, setComments] = useState([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null); // 로그인한 사용자 정보

  useEffect(() => {
    const fetchComments = async () => {
      const { data, error } = await supabase
        .from('comments')
        .select('id, content, created_at, user_id')
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

      if (error) console.error('댓글 불러오기 실패:', error.message);
      else setComments(data);
    };

    fetchComments();

    // 로그인한 사용자 정보 가져오기
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, [postId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('로그인이 필요합니다.');
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('comments')
      .insert([{ post_id: postId, content, user_id: user.id }]);

    if (error) {
      console.error('댓글 작성 실패:', error.message);
      alert('댓글 작성에 실패했습니다.');
    } else {
      setContent('');
      alert('댓글이 등록되었습니다.');
      window.location.reload(); // 새로고침하여 댓글 업데이트
    }

    setLoading(false);
  };

  const handleDelete = async (commentId) => {
    if (!confirm('정말로 댓글을 삭제하시겠습니까?')) return;

    const { error } = await supabase.from('comments').delete().eq('id', commentId);

    if (error) {
      console.error('댓글 삭제 실패:', error.message);
      alert('댓글 삭제에 실패했습니다.');
    } else {
      alert('댓글이 삭제되었습니다.');
      setComments(comments.filter(comment => comment.id !== commentId)); // UI에서 즉시 삭제
    }
  };

  return (
    <div>
      <h3>댓글</h3>
      <form onSubmit={handleSubmit}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="댓글을 입력하세요..."
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? '등록 중...' : '댓글 등록'}
        </button>
      </form>
      <ul>
        {comments.map((comment) => (
          <li key={comment.id}>
            <p>{comment.content}</p>
            <small>{new Date(comment.created_at).toLocaleString()}</small>
            {/* 삭제 버튼: 본인이 작성한 댓글만 삭제 가능 */}
            {user && user.id === comment.user_id && (
              <button onClick={() => handleDelete(comment.id)} style={{ marginLeft: '10px', color: 'red' }}>
                삭제
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Comment;
