import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import Card from '../components/Card'; // Card.js 불러오기
import styles from '../styles/index.module.css'; // CSS 모듈 import

const Index = () => {
  const [posts, setPosts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState([]); // 카테고리 리스트
  const [selectedCategory, setSelectedCategory] = useState([]); // 선택된 카테고리
  const router = useRouter();
  const [session, setSession] = useState(null);

  // 세션 정보를 가져오는 useEffect
  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
    };
    fetchSession();
  }, []);

  // 게시글과 카테고리 데이터를 가져오는 useEffect
  useEffect(() => {
    const fetchPostsAndCategories = async () => {
      try {
        const { data: postsData, error: postsError } = await supabase.from('posts').select('*');
        if (postsError) throw postsError;
        setPosts(postsData);

        const { data: categoriesData, error: categoriesError } = await supabase.from('categories').select('*');
        if (categoriesError) throw categoriesError;

        setCategories(categoriesData);
      } catch (error) {
        console.error('게시글 및 카테고리 로드 실패:', error.message);
      }
    };
    fetchPostsAndCategories();
  }, []);

  const handleCategorySelect = (category) => {
    setSelectedCategory(prevSelected => 
      prevSelected.includes(category)
        ? prevSelected.filter(cat => cat !== category)
        : [...prevSelected, category]
    );
  };

  const handleLike = async (postId, currentLikes) => {
    if (!session) {
      alert("로그인이 필요합니다!");
      return;
    }

    const userId = session.user.id;
    const { data: existingLike, error: likeCheckError } = await supabase
      .from("likes")
      .select("*")
      .eq("post_id", postId)
      .eq("user_id", userId)
      .single();

    if (likeCheckError && likeCheckError.code !== "PGRST116") {
      console.error("좋아요 확인 오류:", likeCheckError.message);
      return;
    }

    if (existingLike) {
      const { error: unlikeError } = await supabase
        .from("likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", userId);

      if (!unlikeError) {
        await supabase.from("posts").update({ likes: currentLikes - 1 }).eq("id", postId);
        setPosts(prevPosts =>
          prevPosts.map(post =>
            post.id === postId ? { ...post, likes: currentLikes - 1 } : post
          )
        );
      }
    } else {
      const { error: likeError } = await supabase
        .from("likes")
        .insert([{ post_id: postId, user_id: userId }]);

      if (!likeError) {
        await supabase.from("posts").update({ likes: currentLikes + 1 }).eq("id", postId);
        setPosts(prevPosts =>
          prevPosts.map(post =>
            post.id === postId ? { ...post, likes: currentLikes + 1 } : post
          )
        );
      }
    }
  };

  const handleDownload = async (postId, currentDownloads) => {
    const { error } = await supabase
      .from("posts")
      .update({ downloads: currentDownloads + 1 })
      .eq("id", postId);

    if (!error) {
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId ? { ...post, downloads: currentDownloads + 1 } : post
        )
      );
    }
  };

  const handleCreatePost = () => router.push('/post/new');
  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) console.error('로그인 오류:', error.message);
  };
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('로그아웃 오류:', error.message);
    } else {
      setSession(null);
      window.location.reload(); // 페이지 리프레시
    }
  };

  // 게시글 정렬
  const sortedPosts = posts.sort((a, b) => {
    return new Date(b.created_at) - new Date(a.created_at);
  });

  // 검색 및 카테고리 필터링
  const filteredPosts = sortedPosts.filter((post) => 
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (selectedCategory.length === 0 || selectedCategory.some(category => post.category.includes(category)))
  );

  return (
    <div className={styles.container}>
      {/* 헤더: 제목, 검색창 */}
      <header className={styles.header}>
        <h1>springdalemusic</h1>
        <input 
          type="text" 
          placeholder="게시글 검색..." 
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)} 
        />
      </header>

      {/* 로그인 / 게시글 작성 버튼 */}
      <div className={styles.authContainer}>
        {session ? (
          <>
            <button onClick={handleCreatePost}>게시글 작성하기</button>
            <button onClick={handleLogout}>로그아웃</button>
          </>
        ) : (
          <button onClick={handleLogin}>로그인</button>
        )}
      </div>

      {/* 카테고리 필터 버튼 */}
      <div className={styles.categoryFilter}>
        {categories.map((cat) => (
          <button 
            key={cat.id} 
            onClick={() => handleCategorySelect(cat.name)}
            className={selectedCategory.includes(cat.name) ? styles.selected : ''}
          >
            {cat.name}
          </button>
        ))}
        {selectedCategory.length > 0 && (
          <button onClick={() => setSelectedCategory([])} className={styles.clearFilter}>
            필터 해제
          </button>
        )}
      </div>

      {/* 게시글 카드 목록 */}
      <div className={styles.posts}>
        {filteredPosts.map((post) => {
          const authorInfo = session ? {
            name: session.user.user_metadata?.full_name || 'Anonymous',
            image: session.user.user_metadata?.avatar_url || '/default-avatar.png'
          } : {};

          return (
            <Card 
              key={post.id}
              post={post}
              handleLike={handleLike}
              handleDownload={handleDownload}
              author={authorInfo} // 작성자 정보 추가
            />
          );
        })}
      </div>
    </div>
  );
};

export default Index;
