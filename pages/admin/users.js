import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { getUserRole } from '../../lib/auth';
import { useRouter } from 'next/router';

const AdminUsers = () => {
  const [role, setRole] = useState('guest');
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState('all');
  const [searchEmail, setSearchEmail] = useState('');
  const [editingName, setEditingName] = useState(null);
  const [newDisplayName, setNewDisplayName] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchUsers = async () => {
      const userRole = await getUserRole();
      setRole(userRole);

      if (userRole !== 'admin') {
        alert('관리자만 접근 가능합니다.');
        router.push('/');
        return;
      }

      // 사용자 데이터 가져오기
      const { data, error } = await supabase.from('users').select('*');
      if (error) {
        console.error('❌ 사용자 목록 가져오기 실패:', error.message);
        return;
      }

      // 데이터베이스 사용자 정보 확인
      console.log('DB 사용자 정보 예시:', data[0]);

      // Auth API에서 사용자 정보 가져오기
      try {
        // Admin API 대신 일반 사용자 목록 API를 시도
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

        // Debug: 첫 번째 사용자 정보 구조 확인
        if (authUsers?.users && authUsers.users.length > 0) {
          console.log('Auth API 사용자 정보 예시:', authUsers.users[0]);
          
          // 메타데이터 구조 확인
          if (authUsers.users[0].user_metadata) {
            console.log('사용자 메타데이터 구조:', authUsers.users[0].user_metadata);
          } else if (authUsers.users[0].raw_user_meta_data) {
            console.log('사용자 메타데이터 구조 (raw_user_meta_data):', authUsers.users[0].raw_user_meta_data);
          }
        }
        
        if (authError) {
          console.error('❌ Auth 사용자 목록 가져오기 실패:', authError.message);
          
          // 일반 사용자 조회로 대체
          console.log('일반 사용자 정보 가져오기로 전환');
          const { data: currentUser } = await supabase.auth.getUser();
          console.log('현재 사용자 정보 구조:', currentUser?.user);
          
          setUsers(data);
          return;
        }

        // Auth 사용자 정보와 DB 사용자 정보 병합
        const mergedUsers = data.map(dbUser => {
          const authUser = authUsers?.users?.find(au => au.id === dbUser.id);
          
          // 디버그 로그: 특정 사용자의 메타데이터 확인
          if (authUser) {
            console.log(`사용자 ${dbUser.email} 메타데이터:`, 
              authUser.user_metadata || authUser.raw_user_meta_data || 'metadata 없음');
          }
          
          // 닉네임 필드 확인을 위해 nickname 추가
          return {
            ...dbUser,
            rawAuthUser: authUser, // Auth 사용자 원본 데이터 저장
            displayName: 
              dbUser.nickname || // users 테이블의 nickname 필드 확인
              authUser?.user_metadata?.name || 
              authUser?.user_metadata?.full_name || 
              authUser?.raw_user_meta_data?.name ||
              authUser?.raw_user_meta_data?.full_name || '',
            avatarUrl: 
              authUser?.user_metadata?.avatar_url || 
              authUser?.raw_user_meta_data?.avatar_url || '',
            // 가입일 정보 추가
            createdAt: dbUser.created_at || authUser?.created_at || '-'
          };
        });

        setUsers(mergedUsers);
      } catch (err) {
        console.error('❌ 사용자 정보 병합 중 오류:', err.message);
        console.error('오류 세부 정보:', err);
        setUsers(data); // 오류 시 기본 정보만 표시
      }
    };

    fetchUsers();
  }, []);

  const updateUserRole = async (userId, newRole) => {
    const { error } = await supabase.from('users').update({ role: newRole }).eq('id', userId);
    if (error) {
      console.error('❌ 권한 변경 실패:', error.message);
      alert('권한 변경에 실패했습니다.');
    } else {
      setUsers(users.map(user => (user.id === userId ? { ...user, role: newRole } : user)));
      alert('✅ 유저 권한이 변경되었습니다.');
    }
  };

  // Supabase Admin API를 통해 사용자 표시 이름 업데이트
  const updateUserDisplayName = async (userId) => {
    if (!newDisplayName.trim()) {
      alert('이름을 입력해주세요.');
      return;
    }

    try {
      // 현재 사용자의 세션 토큰 가져오기
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('인증 세션이 없습니다.');
      }

      // 서버 API를 통해 사용자 이름 업데이트
      const response = await fetch('/api/admin/update-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          displayName: newDisplayName,
          userToken: session.access_token,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '업데이트 실패');
      }

      // 로컬 상태 업데이트
      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, displayName: newDisplayName, nickname: newDisplayName } 
          : user
      ));
      
      setEditingName(null); // 편집 모드 종료
      setNewDisplayName('');
      alert('✅ 사용자 이름이 업데이트되었습니다.');
    } catch (err) {
      console.error('❌ 사용자 이름 업데이트 실패:', err.message);
      alert('사용자 이름 업데이트에 실패했습니다.');
    }
  };

  const getFilteredUsers = () => {
    let filteredUsers = users;
    
    if (searchEmail) {
      filteredUsers = filteredUsers.filter(user => 
        user.email.toLowerCase().includes(searchEmail.toLowerCase()) ||
        (user.displayName && user.displayName.toLowerCase().includes(searchEmail.toLowerCase())) ||
        (user.nickname && user.nickname.toLowerCase().includes(searchEmail.toLowerCase()))
      );
    }

    if (roleFilter !== 'all') {
      filteredUsers = filteredUsers.filter(user => user.role === roleFilter);
    }

    return filteredUsers;
  };

  return role === 'admin' ? (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '20px', background: '#fff', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}>
      <h1>유저 관리</h1>
      
      <div style={{ marginBottom: '20px', display: 'flex', gap: '20px', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <label style={{ marginRight: '10px' }}>검색: </label>
          <input
            type="text"
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            placeholder="이메일 또는 이름 입력"
            style={{
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              width: '200px'
            }}
          />
        </div>
        <div>
          <label style={{ marginRight: '10px' }}>권한 필터: </label>
          <select 
            value={roleFilter} 
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              backgroundColor: '#fff'
            }}
          >
            <option value="all">전체</option>
            <option value="verified_user">인증 유저</option>
            <option value="user">일반 유저</option>
          </select>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ borderBottom: '2px solid #ddd', padding: '10px' }}>이메일</th>
            <th style={{ borderBottom: '2px solid #ddd', padding: '10px' }}>이름</th>
            <th style={{ borderBottom: '2px solid #ddd', padding: '10px' }}>권한</th>
            <th style={{ borderBottom: '2px solid #ddd', padding: '10px' }}>가입일</th>
            <th style={{ borderBottom: '2px solid #ddd', padding: '10px' }}>변경</th>
          </tr>
        </thead>
        <tbody>
          {getFilteredUsers().map(user => (
            <tr key={user.id}>
              <td style={{ borderBottom: '1px solid #ddd', padding: '10px' }}>
                {user.avatarUrl && (
                  <img 
                    src={user.avatarUrl} 
                    alt="Profile" 
                    style={{ 
                      width: '24px', 
                      height: '24px', 
                      borderRadius: '50%', 
                      marginRight: '8px',
                      verticalAlign: 'middle'
                    }} 
                  />
                )}
                {user.email}
              </td>
              <td style={{ borderBottom: '1px solid #ddd', padding: '10px' }}>
                {editingName === user.id ? (
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <input
                      type="text"
                      value={newDisplayName}
                      onChange={(e) => setNewDisplayName(e.target.value)}
                      placeholder="새 이름 입력"
                      style={{ 
                        padding: '4px 6px',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        width: '120px'
                      }}
                    />
                    <button 
                      onClick={() => updateUserDisplayName(user.id)}
                      style={{
                        padding: '2px 8px',
                        background: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      저장
                    </button>
                    <button 
                      onClick={() => {
                        setEditingName(null);
                        setNewDisplayName('');
                      }}
                      style={{
                        padding: '2px 8px',
                        background: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{user.displayName || user.nickname || '-'}</span>
                    <button 
                      onClick={() => {
                        setEditingName(user.id);
                        setNewDisplayName(user.displayName || user.nickname || '');
                      }}
                      style={{
                        padding: '2px 5px',
                        background: '#2196F3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        cursor: 'pointer'
                      }}
                    >
                      수정
                    </button>
                  </div>
                )}
              </td>
              <td style={{ borderBottom: '1px solid #ddd', padding: '10px' }}>{user.role}</td>
              <td style={{ borderBottom: '1px solid #ddd', padding: '10px' }}>
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString('ko-KR') : '-'}
              </td>
              <td style={{ borderBottom: '1px solid #ddd', padding: '10px' }}>
                <select 
                  value={user.role} 
                  onChange={(e) => updateUserRole(user.id, e.target.value)}
                  style={{
                    padding: '6px',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    backgroundColor: '#fff'
                  }}
                >
                  <option value="guest">비회원</option>
                  <option value="user">일반 유저</option>
                  <option value="verified_user">인증 유저</option>
                  <option value="admin">관리자</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : null;
};

export default AdminUsers;
