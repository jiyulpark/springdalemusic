import { useState, useEffect } from 'react';
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
  }, []);

  useEffect(() => {
    if (session) {
      fetchPosts();
    }
  }, [session, pageSize, searchTerm, currentPage]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
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
      setPosts(data);
    } catch (error) {
      console.error('게시글 불러오기 실패:', error);
      setError('게시글을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

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
      const updates = posts.map(post => ({
        id: post.id,
        download_permission: post.download_permission
      }));

      const { error } = await supabase
        .from('posts')
        .upsert(updates);

      if (error) throw error;
      alert('변경사항이 저장되었습니다.');
    } catch (error) {
      console.error('저장 실패:', error);
      setError('변경사항 저장 중 오류가 발생했습니다.');
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
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>게시글 관리</h1>
        <div style={styles.controls}>
          <input
            type="text"
            placeholder="게시글 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          <select 
            value={pageSize} 
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            style={styles.pageSizeSelect}
          >
            <option value={20}>20개씩 보기</option>
            <option value={30}>30개씩 보기</option>
            <option value={50}>50개씩 보기</option>
            <option value={100}>100개씩 보기</option>
          </select>
        </div>
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>제목</th>
              <th style={styles.th}>작성일</th>
              <th style={styles.th}>다운로드 권한</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id}>
                <td style={styles.td}>
                  <button
                    onClick={() => handlePostClick(post.id)}
                    style={styles.linkButton}
                  >
                    {post.title}
                  </button>
                </td>
                <td style={styles.td}>
                  {new Date(post.created_at).toLocaleDateString()}
                </td>
                <td style={styles.td}>
                  <div style={styles.radioGroup}>
                    <label style={styles.radioLabel}>
                      <input
                        type="radio"
                        name={`permission-${post.id}`}
                        value="verified_user"
                        checked={post.download_permission === 'verified_user'}
                        onChange={() => handlePermissionChange(post.id, 'verified_user')}
                      />
                      인증회원
                    </label>
                    <label style={styles.radioLabel}>
                      <input
                        type="radio"
                        name={`permission-${post.id}`}
                        value="user"
                        checked={post.download_permission === 'user'}
                        onChange={() => handlePermissionChange(post.id, 'user')}
                      />
                      일반회원
                    </label>
                    <label style={styles.radioLabel}>
                      <input
                        type="radio"
                        name={`permission-${post.id}`}
                        value="guest"
                        checked={post.download_permission === 'guest'}
                        onChange={() => handlePermissionChange(post.id, 'guest')}
                      />
                      모두
                    </label>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={styles.pagination}>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => setCurrentPage(page)}
            style={{
              ...styles.pageButton,
              backgroundColor: currentPage === page ? '#0070f3' : '#fff',
              color: currentPage === page ? '#fff' : '#000',
            }}
          >
            {page}
          </button>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={isSubmitting}
        style={styles.saveButton}
      >
        {isSubmitting ? '저장 중...' : '변경사항 저장'}
      </button>

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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  controls: {
    display: 'flex',
    gap: '10px',
  },
  searchInput: {
    padding: '8px 12px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    width: '200px',
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
  th: {
    padding: '12px',
    textAlign: 'left',
    backgroundColor: '#f5f5f5',
    borderBottom: '2px solid #ddd',
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid #ddd',
  },
  linkButton: {
    background: 'none',
    border: 'none',
    color: '#0070f3',
    cursor: 'pointer',
    padding: 0,
    fontSize: 'inherit',
    textAlign: 'left',
  },
  radioGroup: {
    display: 'flex',
    gap: '15px',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    cursor: 'pointer',
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
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    gap: '5px',
    marginBottom: '20px',
  },
  pageButton: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    minWidth: '40px',
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