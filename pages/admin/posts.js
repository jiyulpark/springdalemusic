import { useState, useEffect, useCallback } from 'react';
import React from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/router';

const AdminPosts = () => {
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pageSize, setPageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [session, setSession] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (!session) {
        router.push('/auth/login');
        return;
      }
      // 관리자 권한 체크
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();
      
      if (userData?.role !== 'admin') {
        router.push('/');
        return;
      }
    };
    fetchSession();
  }, [router]);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // 전체 게시글 수 조회
      let countQuery = supabase
        .from('posts')
        .select('*', { count: 'exact', head: true });

      if (searchTerm) {
        countQuery = countQuery.ilike('title', `%${searchTerm}%`);
      }

      const { count } = await countQuery;
      setTotalPosts(count);

      // 페이지네이션된 게시글 조회
      let query = supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

      if (searchTerm) {
        query = query.ilike('title', `%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // 원본 권한 정보 추가
      setPosts(data.map(post => ({
        ...post,
        original_permission: post.download_permission
      })));
    } catch (error) {
      console.error('게시글 불러오기 실패:', error);
      setError('게시글을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm]);

  useEffect(() => {
    if (session) {
      fetchPosts();
    }
  }, [session, fetchPosts]);

  const handlePermissionChange = (postId, newPermission) => {
    setPosts(posts.map(post => 
      post.id === postId 
        ? { ...post, download_permission: newPermission }
        : post
    ));
  };

  const handleSave = async () => {
    try {
      setIsSubmitting(true);
      setError('');

      // 변경된 게시글만 필터링
      const updates = posts
        .filter(post => post.download_permission !== post.original_permission)
        .map(post => ({
          id: post.id,
          download_permission: post.download_permission
        }));

      if (updates.length === 0) {
        alert('변경된 내용이 없습니다.');
        return;
      }

      // 각 게시글을 개별적으로 업데이트
      for (const update of updates) {
        const { error } = await supabase
          .from('posts')
          .update({ download_permission: update.download_permission })
          .eq('id', update.id);

        if (error) {
          throw new Error(`게시글 ID ${update.id} 업데이트 실패: ${error.message}`);
        }
      }

      // 업데이트 성공 후 원본 권한 업데이트
      setPosts(posts.map(post => ({
        ...post,
        original_permission: post.download_permission
      })));

      alert('변경사항이 저장되었습니다.');
    } catch (error) {
      console.error('저장 실패:', error);
      setError(error.message || '변경사항 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePostClick = async (postId) => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (error) throw error;
      setSelectedPost(data);
      setShowModal(true);
    } catch (error) {
      console.error('게시글 불러오기 실패:', error);
      setError('게시글을 불러오는 중 오류가 발생했습니다.');
    }
  };

  const totalPages = Math.ceil(totalPosts / pageSize);

  if (loading) return <div>로딩 중...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>게시글 관리</h1>
      
      {/* 검색 및 페이지네이션 컨트롤 */}
      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="제목으로 검색..."
            className={styles.searchInput}
          />
        </div>
        <div className={styles.pageSizeControl}>
          <label htmlFor="pageSize">페이지당 게시글 수:</label>
          <select
            id="pageSize"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className={styles.pageSizeSelect}
          >
            <option value="10">10개</option>
            <option value="20">20개</option>
            <option value="50">50개</option>
          </select>
        </div>
      </div>

      {/* 게시글 목록 */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>제목</th>
              <th>작성자</th>
              <th>작성일</th>
              <th>다운로드 권한</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id}>
                <td className={styles.titleCell}>
                  <a 
                    href={`/post/${post.id}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={styles.postLink}
                  >
                    {post.title}
                  </a>
                </td>
                <td>{post.author_name}</td>
                <td>{new Date(post.created_at).toLocaleDateString()}</td>
                <td>
                  <select
                    value={post.download_permission}
                    onChange={(e) => handlePermissionChange(post.id, e.target.value)}
                    className={styles.permissionSelect}
                  >
                    <option value="all">모든 사용자</option>
                    <option value="verified">인증된 사용자</option>
                    <option value="admin">관리자만</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      <div className={styles.pagination}>
        <button
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className={styles.pageButton}
        >
          이전
        </button>
        <span className={styles.pageInfo}>
          {currentPage} / {Math.ceil(totalPosts / pageSize)}
        </span>
        <button
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalPosts / pageSize)))}
          disabled={currentPage >= Math.ceil(totalPosts / pageSize)}
          className={styles.pageButton}
        >
          다음
        </button>
      </div>

      {/* 저장 버튼 */}
      <div className={styles.saveSection}>
        <button
          onClick={handleSave}
          disabled={isSubmitting}
          className={styles.saveButton}
        >
          {isSubmitting ? '저장 중...' : '변경사항 저장'}
        </button>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      {showModal && selectedPost && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2>{selectedPost.title}</h2>
              <button
                onClick={() => setShowModal(false)}
                style={styles.closeButton}
              >
                ×
              </button>
            </div>
            <div style={styles.modalContent}>
              <div style={styles.postInfo}>
                <p>작성자: {selectedPost.author_name}</p>
                <p>작성일: {new Date(selectedPost.created_at).toLocaleString()}</p>
              </div>
              <div style={styles.postContent}>
                {selectedPost.content}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '40px auto',
    padding: '20px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '20px',
  },
  controls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  searchBox: {
    flex: 1,
  },
  searchInput: {
    padding: '8px 12px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    width: '100%',
  },
  pageSizeControl: {
    flex: 1,
  },
  pageSizeSelect: {
    padding: '8px 12px',
    borderRadius: '4px',
    border: '1px solid #ddd',
  },
  tableContainer: {
    marginBottom: '20px',
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: '#fff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  titleCell: {
    padding: '12px',
    textAlign: 'left',
    backgroundColor: '#f5f5f5',
    borderBottom: '2px solid #ddd',
  },
  postLink: {
    background: 'none',
    border: 'none',
    color: '#0070f3',
    cursor: 'pointer',
    padding: 0,
    fontSize: 'inherit',
    textAlign: 'left',
  },
  permissionSelect: {
    padding: '8px 12px',
    borderRadius: '4px',
    border: '1px solid #ddd',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '5px',
    marginBottom: '20px',
  },
  pageButton: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    minWidth: '40px',
    backgroundColor: '#fff',
    transition: 'all 0.2s ease',
  },
  pageInfo: {
    padding: '0 10px',
    color: '#666',
  },
  saveSection: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  saveButton: {
    padding: '10px 20px',
    backgroundColor: '#0070f3',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
  },
  errorMessage: {
    color: 'red',
    marginBottom: '20px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    width: '80%',
    maxWidth: '800px',
    maxHeight: '80vh',
    overflow: 'auto',
  },
  modalHeader: {
    padding: '20px',
    borderBottom: '1px solid #ddd',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '0 10px',
  },
  modalContent: {
    padding: '20px',
  },
  postInfo: {
    marginBottom: '20px',
    color: '#666',
  },
  postContent: {
    whiteSpace: 'pre-wrap',
    lineHeight: '1.6',
  },
};

export default AdminPosts; 