// pages/index.js
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Card from '../components/Card';
import styles from '../styles/index.module.css';
import { useSession } from '../lib/SessionContext';
import { useRouter } from 'next/router';

const Home = () => {
  const router = useRouter();
  const { session, loading: sessionLoading } = useSession();
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [sortOption, setSortOption] = useState('latest');
  const [downloadPermissionFilter, setDownloadPermissionFilter] = useState('all');
  const postsPerPage = 20;

  // URL 쿼리 파라미터에서 페이지 번호 가져오기
  useEffect(() => {
    if (router.isReady) {
      const page = parseInt(router.query.page) || 1;
      setCurrentPage(page);
      localStorage.setItem('lastViewedPage', page);
    }
  }, [router.isReady, router.query.page]);

  // 페이지 변경 시 URL과 localStorage 업데이트
  const handlePageChange = (page) => {
    console.log('페이지 변경:', page);
    setCurrentPage(page);
    localStorage.setItem('lastViewedPage', page);
    
    // 브라우저의 뒤로가기 히스토리에 현재 페이지 추가
    window.history.pushState({ page }, '');
    
    router.push({
      pathname: router.pathname,
      query: { ...router.query, page }
    }, undefined, { shallow: true });
    window.scrollTo(0, 0);
  };

  // 브라우저의 뒤로가기 버튼 처리
  useEffect(() => {
    const handlePopState = (event) => {
      const page = event.state?.page || 1;
      console.log('뒤로가기 감지 - 페이지:', page);
      setCurrentPage(page);
      localStorage.setItem('lastViewedPage', page);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [
          { data: postsData, error: postsError },
          { data: categoriesData, error: categoriesError },
          { data: likesData },
          { data: commentsData }
        ] = await Promise.all([
          supabase
            .from('posts')
            .select(`
              id, title, content, thumbnail_url, user_id, category_ids, 
              file_urls, downloads, created_at,
              users ( id, nickname, profile_picture )
            `)
            .order('created_at', { ascending: false }),
          supabase.from('categories').select('*'),
          supabase.from('likes').select('post_id'),
          supabase.from('comments').select('post_id')
        ]);

        if (postsError || categoriesError) throw postsError || categoriesError;

        const likesMap = likesData?.reduce((acc, like) => {
          acc[like.post_id] = (acc[like.post_id] || 0) + 1;
          return acc;
        }, {});

        const commentsMap = commentsData?.reduce((acc, comment) => {
          acc[comment.post_id] = (acc[comment.post_id] || 0) + 1;
          return acc;
        }, {});

        const updatedPosts = postsData.map(post => {
          console.log(`포스트 ID ${post.id} 다운로드 수: ${post.downloads}`, post);
          return {
            ...post,
            like_count: likesMap?.[post.id] || 0,
            comment_count: commentsMap?.[post.id] || 0,
          };
        });

        if (mounted) {
          setPosts(updatedPosts);
          setCategories(categoriesData || []);
          setFilteredPosts(updatedPosts);
        }
      } catch (err) {
        console.error("데이터 로딩 실패:", err.message);
        if (mounted) setError('데이터 로딩 실패');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    // ✅ 세션 로딩이 끝난 후에만 쿼리 실행
    if (!sessionLoading && session !== undefined) {
      fetchData();
    }

    return () => { mounted = false; };
  }, [sessionLoading, session]);

  // 검색 및 필터링 로직
  useEffect(() => {
    let filtered = [...posts];

    if (searchQuery) {
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategories.length > 0) {
      filtered = filtered.filter(post =>
        selectedCategories.every(catId => post.category_ids?.includes(catId))
      );
    }

    if (downloadPermissionFilter !== 'all') {
      filtered = filtered.filter(post => post.download_permission === downloadPermissionFilter);
    }

    if (sortOption === 'latest') {
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortOption === 'likes') {
      filtered.sort((a, b) => (b.like_count || 0) - (a.like_count || 0));
    } else if (sortOption === 'downloads') {
      filtered.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
    }

    setFilteredPosts(filtered);
  }, [searchQuery, selectedCategories, sortOption, downloadPermissionFilter, posts]);

  const toggleCategory = (catId) => {
    setSelectedCategories(prev =>
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  };

  const indexOfLastPost = currentPage * postsPerPage;
  const indexOfFirstPost = indexOfLastPost - postsPerPage;
  const currentPosts = filteredPosts.slice(indexOfFirstPost, indexOfLastPost);
  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);

  const handleDownload = async (postId, currentDownloads) => {
    try {
      await supabase
        .from("posts")
        .update({ downloads: currentDownloads + 1 })
        .eq("id", postId);
    } catch (e) {
      console.error("다운로드 증가 실패", e.message);
    }
  };

  const handleLike = async (postId, currentLikes) => {
    if (!session || !session.user) {
      alert("로그인이 필요합니다");
      return;
    }

    try {
      const userId = session.user.id;
      const { data: existingLike, error } = await supabase
        .from("likes")
        .select("*")
        .eq("post_id", postId)
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (existingLike) {
        await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", userId);
        setPosts(prev =>
          prev.map(post =>
            post.id === postId ? { ...post, like_count: post.like_count - 1 } : post
          )
        );
      } else {
        await supabase.from("likes").insert([{ post_id: postId, user_id: userId }]);
        setPosts(prev =>
          prev.map(post =>
            post.id === postId ? { ...post, like_count: post.like_count + 1 } : post
          )
        );
      }
    } catch (err) {
      console.error("좋아요 처리 실패:", err.message);
    }
  };

  if (error) {
    return (
      <div className={styles.container}>
        <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>
        <button onClick={() => window.location.reload()}>다시 시도</button>
      </div>
    );
  }

  if (loading || sessionLoading) {
    return <p style={{ textAlign: 'center', fontWeight: 'bold' }}>로딩 중...</p>;
  }

  return (
    <div className={styles.container}>
      <input
        type="text"
        placeholder="게시글 검색..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className={styles.searchInput}
      />

      <div className={styles.categoryFilter}>
        <button
          className={selectedCategories.length === 0 ? styles.activeCategory : ''}
          onClick={() => setSelectedCategories([])}
        >
          전체
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            className={selectedCategories.includes(cat.id) ? styles.activeCategory : ''}
            onClick={() => toggleCategory(cat.id)}
            data-type={cat.type}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className={styles.sortContainer}>
        <select
          className={styles.sortSelect}
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
        >
          <option value="latest">최신순</option>
          <option value="likes">좋아요순</option>
          <option value="downloads">다운로드순</option>
        </select>
      </div>

      {currentPosts.length === 0 ? (
        <p style={{ textAlign: 'center' }}>게시물이 없습니다.</p>
      ) : (
        <div className={styles.grid}> 
          {currentPosts.map(post => {
            return (
              <Card 
                key={post.id} 
                post={post} 
                categories={categories}
                handleLike={handleLike}
                handleDownload={handleDownload}
                author={post.users}
              />
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className={styles.pagination}>
          {[...Array(totalPages)].map((_, index) => (
            <button
              key={index + 1}
              className={`${styles.pageButton} ${currentPage === index + 1 ? styles.activePage : ''}`}
              onClick={() => handlePageChange(index + 1)}
            >
              {index + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;
