import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const LikeButton = ({ postId, userId }) => {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  useEffect(() => {
    const fetchLikes = async () => {
      const { data, error } = await supabase
        .from('likes')
        .select('*', { count: 'exact' })
        .eq('post_id', postId);

      if (error) {
        console.error('좋아요 개수 불러오기 실패:', error.message);
      } else {
        setLikesCount(data.length);
      }

      if (userId) {
        const { data: userLike } = await supabase
          .from('likes')
          .select('*')
          .eq('post_id', postId)
          .eq('user_id', userId)
          .single();

        setLiked(!!userLike);
      }
    };

    fetchLikes();
  }, [postId, userId]);

  const handleLike = async () => {
    if (!userId) {
      alert('로그인이 필요합니다.');
      return;
    }

    if (liked) {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);

      if (error) {
        console.error('좋아요 취소 실패:', error.message);
      } else {
        setLiked(false);
        setLikesCount((prev) => prev - 1);
      }
    } else {
      const { error } = await supabase
        .from('likes')
        .insert([{ post_id: postId, user_id: userId }]);

      if (error) {
        console.error('좋아요 추가 실패:', error.message);
      } else {
        setLiked(true);
        setLikesCount((prev) => prev + 1);
      }
    }
  };

  return (
    <div>
      <button onClick={handleLike} style={{ background: liked ? 'red' : 'gray', color: 'white', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }}>
        {liked ? '❤️ 좋아요 취소' : '🤍 좋아요'} ({likesCount})
      </button>
    </div>
  );
};

export default LikeButton;
