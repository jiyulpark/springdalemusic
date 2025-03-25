import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Link from 'next/link';
import Card from '../components/Card';
import styles from '../styles/index.module.css';

const Home = () => {
  const [session, setSession] = useState(null); // ✅ 세션 상태 추가
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [sortOption, setSortOption] = useState('latest');
  const postsPerPage = 20;

  // ✅ 세션 초기화 및 로그인/로그아웃 감지
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
    };

    getSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // ✅ 게시글 + 카테고리 로드
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select(`
            id, title, content, thumbnail_url, user_id, category_ids, file_urls, downloads,
            users ( id, nickname, profile_picture )
          `)
          .order('created_at', { ascending: false });

        if (postsError) throw postsError;

        const { data: categoriesData, error: categoriesError } = await supabase.from('categories').select('*');
        if (categoriesError) throw categoriesError;
        setCategories(categoriesData || []);

        const { data: likesData } = await supabase.from('likes').select('post_id');
        const likesMap = {};
        likesData?.forEach(like => {
          likesMap[like.post_id] = (likesMap[like.post_id] || 0) + 1;
        });

        const { data: commentsData } = await supabase.from('comments').select('post_id');
        const commentsMap = {};
        commentsData?.forEach(comment => {
          commentsMap[comment.post_id] = (commentsMap[comment.post_id] || 0) + 1;
        });

        const updatedPosts = postsData.map(post => ({
          ...post,
          like_count: likesMap[post.id] || 0,
          comment_count: commentsMap[post.id] || 0,
        }));

        setPosts(updatedPosts);
        setFilteredPosts(updatedPosts);
      } catch (error) {
        console.error("❌ 데이터 로딩 실패:", error.message);
      } finally {
        setLoading(false);
      }
    };

    // ✅ 세션 유무와 관계없이 fetchData는 항상 실행
    fetchData();
  }, []);

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

  const toggleCategory = (catId) => {
    setSelectedCategories(prev =>
      prev.includes(catId)
        ? prev.filter(id => id !== catId)
        : [...prev, catId]
    );
  };

  const indexOfLastPost = currentPage * postsPerPage;
  const indexOfFirstPost = indexOfLastPost - postsPerPage;
  const currentPosts = filteredPosts.slice(indexOfFirstPost, indexOfLastPost);
  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);

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
        <select value={sortOption} onChange={(e) => setSortOption(e.target.value)} className={styles.sortSelect}>
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
