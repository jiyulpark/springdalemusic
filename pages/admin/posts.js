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
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [session, setSession] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [downloadPermissionFilter, setDownloadPermissionFilter] = useState('all');
  const [selectedPosts, setSelectedPosts] = useState(new Set());
  const [bulkPermission, setBulkPermission] = useState('guest');

  // 디바운스 효과
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms 딜레이

    return () => clearTimeout(timer);
  }, [searchTerm]);

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

      if (debouncedSearchTerm) {
        countQuery = countQuery.ilike('title', `%${debouncedSearchTerm}%`);
      }

      if (downloadPermissionFilter !== 'all') {
        countQuery = countQuery.eq('download_permission', downloadPermissionFilter);
      }

      const { count } = await countQuery;
      setTotalPosts(count);

      // 페이지네이션된 게시글 조회
      let query = supabase
        .from('posts')
        .select(`
          *,
          files:files(count)
        `)
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

      if (debouncedSearchTerm) {
        query = query.ilike('title', `%${debouncedSearchTerm}%`);
      }

      if (downloadPermissionFilter !== 'all') {
        query = query.eq('download_permission', downloadPermissionFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // 원본 권한 정보 추가
      setPosts(data.map(post => ({
        ...post,
        original_permission: post.download_permission,
        fileCount: post.files?.[0]?.count || 0
      })));
    } catch (error) {
      console.error('게시글 불러오기 실패:', error);
      setError('게시글을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearchTerm, downloadPermissionFilter]);

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

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedPosts(new Set(posts.map(post => post.id)));
    } else {
      setSelectedPosts(new Set());
    }
  };

  const handleSelectPost = (postId, checked) => {
    const newSelectedPosts = new Set(selectedPosts);
    if (checked) {
      newSelectedPosts.add(postId);
    } else {
      newSelectedPosts.delete(postId);
    }
    setSelectedPosts(newSelectedPosts);
  };

  const handleBulkPermissionChange = async () => {
    if (selectedPosts.size === 0) {
      alert('선택된 게시글이 없습니다.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const { error } = await supabase
        .from('posts')
        .update({ download_permission: bulkPermission })
        .in('id', Array.from(selectedPosts));

      if (error) throw error;

      // 로컬 상태 업데이트
      setPosts(posts.map(post => 
        selectedPosts.has(post.id)
          ? { ...post, download_permission: bulkPermission, original_permission: bulkPermission }
          : post
      ));

      setSelectedPosts(new Set());
      alert('선택된 게시글들의 권한이 변경되었습니다.');
    } catch (error) {
      console.error('일괄 변경 실패:', error);
      setError('권한 변경 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
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
          <div style={styles.bulkControls}>
            <select
              value={bulkPermission}
              onChange={(e) => setBulkPermission(e.target.value)}
              style={styles.select}
            >
              <option value="guest">모두 가능</option>
              <option value="user">일반 유저 이상</option>
              <option value="verified_user">인증 유저만</option>
            </select>
            <button
              onClick={handleBulkPermissionChange}
              disabled={isSubmitting || selectedPosts.size === 0}
              style={styles.bulkButton}
            >
              선택된 게시글 일괄 적용
            </button>
          </div>
          <input
            type="text"
            placeholder="게시글 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          <select
            value={downloadPermissionFilter}
            onChange={(e) => setDownloadPermissionFilter(e.target.value)}
            style={styles.select}
          >
            <option value="all">모든 권한</option>
            <option value="guest">모두 가능</option>
            <option value="user">일반 유저 이상</option>
            <option value="verified_user">인증 유저만</option>
          </select>
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
              <th style={{...styles.th, width: '40px'}}>
                <input
                  type="checkbox"
                  checked={selectedPosts.size === posts.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </th>
              <th style={{...styles.th, width: '60px'}}>번호</th>
              <th style={{...styles.th, ...styles.titleColumn}}>제목</th>
              <th style={{...styles.th, width: '100px'}}>작성일</th>
              <th style={{...styles.th, width: '80px'}}>첨부파일</th>
              <th style={{...styles.th, width: '180px'}}>다운로드 권한</th>
              <th style={{...styles.th, ...styles.iconColumn}}>👁️</th>
              <th style={{...styles.th, ...styles.iconColumn}}>⬇️</th>
              <th style={{...styles.th, ...styles.iconColumn}}>❤️</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post, index) => (
              <tr key={post.id}>
                <td style={{...styles.td, width: '40px'}}>
                  <input
                    type="checkbox"
                    checked={selectedPosts.has(post.id)}
                    onChange={(e) => handleSelectPost(post.id, e.target.checked)}
                  />
                </td>
                <td style={{...styles.td, width: '60px'}}>
                  {totalPosts - ((currentPage - 1) * pageSize + index)}
                </td>
                <td style={{...styles.td, ...styles.titleColumn}}>
                  <button
                    onClick={() => handlePostClick(post.id)}
                    style={styles.linkButton}
                  >
                    {post.title}
                  </button>
                </td>
                <td style={{...styles.td, width: '100px'}}>
                  {new Date(post.created_at).toLocaleDateString()}
                </td>
                <td style={{...styles.td, width: '80px'}}>
                  {post.fileCount}개
                </td>
                <td style={{...styles.td, width: '180px'}}>
                  <div style={styles.radioGroup}>
                    <label style={styles.radioLabel}>
                      <input
                        type="radio"
                        name={`permission-${post.id}`}
                        value="verified_user"
                        checked={post.download_permission === 'verified_user'}
                        onChange={() => handlePermissionChange(post.id, 'verified_user')}
                      />
                      인증
                    </label>
                    <label style={styles.radioLabel}>
                      <input
                        type="radio"
                        name={`permission-${post.id}`}
                        value="user"
                        checked={post.download_permission === 'user'}
                        onChange={() => handlePermissionChange(post.id, 'user')}
                      />
                      일반
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
                <td style={{...styles.td, ...styles.iconColumn}}>
                  <span style={styles.count}>{post.view_count || 0}</span>
                </td>
                <td style={{...styles.td, ...styles.iconColumn}}>
                  <span style={styles.count}>{post.downloads || 0}</span>
                </td>
                <td style={{...styles.td, ...styles.iconColumn}}>
                  <span style={styles.count}>{post.likes?.length || 0}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={styles.pagination}>
        {currentPage > 1 && (
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            style={styles.pageButton}
          >
            이전
          </button>
        )}
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(page => {
            // 현재 페이지 주변 2페이지와 처음/끝 페이지만 표시
            return (
              page === 1 ||
              page === totalPages ||
              (page >= currentPage - 2 && page <= currentPage + 2)
            );
          })
          .map((page, index, array) => {
            // 페이지 번호 사이에 ... 표시
            if (index > 0 && page - array[index - 1] > 1) {
              return (
                <React.Fragment key={`ellipsis-${page}`}>
                  <span style={styles.ellipsis}>...</span>
                  <button
                    onClick={() => setCurrentPage(page)}
                    style={{
                      ...styles.pageButton,
                      backgroundColor: currentPage === page ? '#0070f3' : '#fff',
                      color: currentPage === page ? '#fff' : '#000',
                    }}
                  >
                    {page}
                  </button>
                </React.Fragment>
              );
            }
            return (
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
            );
          })}
        {currentPage < totalPages && (
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            style={styles.pageButton}
          >
            다음
          </button>
        )}
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
    maxWidth: '1600px',
    margin: '40px auto',
    padding: '20px',
    width: '100%',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '10px',
  },
  controls: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  searchInput: {
    padding: '8px 12px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    width: '200px',
  },
  select: {
    padding: '8px 12px',
    borderRadius: '4px',
    border: '1px solid #ddd',
  },
  pageSizeSelect: {
    padding: '8px 12px',
    borderRadius: '4px',
    border: '1px solid #ddd',
  },
  tableContainer: {
    marginBottom: '20px',
    width: '100%',
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: '#fff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    tableLayout: 'fixed',
  },
  th: {
    padding: '8px',
    textAlign: 'left',
    backgroundColor: '#f5f5f5',
    borderBottom: '2px solid #ddd',
    fontSize: '0.9em',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  td: {
    padding: '8px',
    borderBottom: '1px solid #ddd',
    fontSize: '0.9em',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  titleColumn: {
    width: '30%',
    whiteSpace: 'normal',
    wordBreak: 'break-word',
  },
  otherColumn: {
    width: 'auto',
  },
  linkButton: {
    background: 'none',
    border: 'none',
    color: '#0070f3',
    cursor: 'pointer',
    padding: 0,
    fontSize: 'inherit',
    textAlign: 'left',
    width: '100%',
    whiteSpace: 'normal',
    wordBreak: 'break-word',
  },
  radioGroup: {
    display: 'flex',
    gap: '8px',
    fontSize: '0.9em',
    flexWrap: 'nowrap',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    cursor: 'pointer',
    fontSize: '0.9em',
    whiteSpace: 'nowrap',
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
  ellipsis: {
    padding: '0 8px',
    color: '#666',
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
  bulkControls: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    marginBottom: '10px',
  },
  bulkButton: {
    padding: '8px 16px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    ':disabled': {
      backgroundColor: '#cccccc',
      cursor: 'not-allowed',
    },
  },
  iconColumn: {
    width: '50px',
    textAlign: 'center',
  },
  count: {
    color: '#666',
    fontSize: '0.9em',
  },
};

export default AdminPosts; 