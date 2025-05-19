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
  }, [session, pageSize, searchTerm]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(pageSize);

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
            onChange={(e) => setPageSize(Number(e.target.value))}
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
                  <a 
                    href={`/post/${post.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.link}
                  >
                    {post.title}
                  </a>
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

      <button
        onClick={handleSave}
        disabled={isSubmitting}
        style={styles.saveButton}
      >
        {isSubmitting ? '저장 중...' : '변경사항 저장'}
      </button>
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
  link: {
    color: '#0070f3',
    textDecoration: 'none',
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
};

export default AdminPosts; 