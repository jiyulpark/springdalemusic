import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Link from 'next/link';
import Card from '../components/Card';
import styles from '../styles/index.module.css';

const Home = () => {
  const [session, setSession] = useState(null);
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [sortOption, setSortOption] = useState('latest');
  const postsPerPage = 20;

  // 세션 초기화 및 로그인/로그아웃 감지
  useEffect(() => {
    const getSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
      } catch (err) {
        console.error('세션 가져오기 실패:', err);
        setError('세션을 불러오는 중 오류가 발생했습니다.');
      }
    };

    getSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // 게시글 + 카테고리 로드
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // 병렬 데이터 페칭
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

        if (postsError) throw postsError;
        if (categoriesError) throw categoriesError;

        const likesMap = likesData?.reduce((acc, like) => {
          acc[like.post_id] = (acc[like.post_id] || 0) + 1;
          return acc;
        }, {});

        const commentsMap = commentsData?.reduce((acc, comment) => {
          acc[comment.post_id] = (acc[comment.post_id] || 0) + 1;
          return acc;
        }, {});

        const updatedPosts = postsData.map(post => ({
          ...post,
          like_count: likesMap[post.id] || 0,
          comment_count: commentsMap[post.id] || 0,
        }));

        setPosts(updatedPosts);
        setCategories(categoriesData || []);
        setFilteredPosts(updatedPosts);
      } catch (error) {
        console.error("데이터 로딩 실패:", error.message);
        setError('데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 필터링 및 정렬 로직
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
        selectedCategories.some(catId => post.category_ids?.includes(catId))
      );
    }

    if (sortOption === 'latest') {
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortOption === 'likes') {
      filtered.sort((a, b) => (b.like_count || 0) - (a.like_count || 0));
    } else if (sortOption === 'downloads') {
      filtered.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
    }

    setFilteredPosts(filtered);
    setCurrentPage(1);
  }, [searchQuery, selectedCategories, sortOption, posts]);

  // 카테고리 토글 함수
  const toggleCategory = (catId) => {
    setSelectedCategories(prev =>
      prev.includes(catId)
        ? prev.filter(id => id !== catId)
        : [...prev, catId]
    );
  };

  // 페이지네이션 계산
  const indexOfLastPost = currentPage * postsPerPage;
  const indexOfFirstPost = indexOfLastPost - postsPerPage;
  const currentPosts = filteredPosts.slice(indexOfFirstPost, indexOfLastPost);
  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);

  // 에러 상태 처리
  if (error) {
    return (
      <div className={styles.container}>
        <p style={{ color: 'red', textAlign: 'center' }}>
          {error}
          <br />
          <button onClick={() => window.location.reload()}>
            다시 시도하기
          </button>
        </p>
      </div>
    );
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
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className={styles.sortFilter}>
        <select 
          value={sortOption} 
          onChange={(e) => setSortOption(e.target.value)} 
          className={styles.sortSelect}
        >
          <option value="latest">최신순</option>
          <option value="likes">좋아요순</option>
          <option value="downloads">다운로드순</option>
        </select>
      </div>

      <h1 className={styles.title}>게시물 목록</h1>

      {loading ? (
        <p style={{ textAlign: 'center', fontWeight: 'bold' }}>로딩 중...</p>
      ) : currentPosts.length === 0 ? (
        <p style={{ textAlign: 'center' }}>게시물이 없습니다.</p>
      ) : (
        <div className={styles.grid}>
          {currentPosts.map(post => (
            <Card key={post.id} post={post} categories={categories} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className={styles.pagination}>
          {[...Array(totalPages)].map((_, index) => (
            <button
              key={index + 1}
              className={`${styles.pageButton} ${currentPage === index + 1 ? styles.activePage : ''}`}
              onClick={() => setCurrentPage(index + 1)}
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