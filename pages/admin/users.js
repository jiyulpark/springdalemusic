import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { getUserRole } from '../../lib/auth';
import { useRouter } from 'next/router';

const AdminUsers = () => {
  const [role, setRole] = useState('guest');
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState('all');
  const [searchEmail, setSearchEmail] = useState('');
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
        // 각 사용자별로 개별 조회
        const authUsersPromises = data.map(async (dbUser) => {
          try {
            // 일반 사용자 정보 조회 API 사용
            const { data: { user }, error } = await supabase.auth.getUser(dbUser.id);
            if (error) {
              console.error(`사용자 ${dbUser.email} 정보 조회 실패:`, error.message);
              return null;
            }
            return user;
          } catch (err) {
            console.error(`사용자 ${dbUser.email} 정보 조회 중 오류:`, err.message);
            return null;
          }
        });

        const authUsers = await Promise.all(authUsersPromises);

        // Auth 사용자 정보와 DB 사용자 정보 병합
        const mergedUsers = data.map((dbUser, index) => {
          const authUser = authUsers[index];
          
          // 디버그 로그: 특정 사용자의 메타데이터 확인
          if (authUser) {
            console.log(`사용자 ${dbUser.email} 메타데이터:`, {
              user_metadata: authUser.user_metadata,
              raw_user_meta_data: authUser.raw_user_meta_data,
              app_metadata: authUser.app_metadata
            });
          }
          
          // Display name 우선순위 설정
          const displayName = 
            authUser?.user_metadata?.name || // Auth의 name 필드
            authUser?.user_metadata?.full_name || // Auth의 full_name 필드
            authUser?.raw_user_meta_data?.name || // raw_user_meta_data의 name 필드
            authUser?.raw_user_meta_data?.full_name || // raw_user_meta_data의 full_name 필드
            authUser?.app_metadata?.name || // app_metadata의 name 필드
            '-';
          
          return {
            ...dbUser,
            rawAuthUser: authUser,
            displayName,
            avatarUrl: 
              authUser?.user_metadata?.avatar_url || 
              authUser?.raw_user_meta_data?.avatar_url || '',
            createdAt: authUser?.created_at || authUser?.identities?.[0]?.created_at || dbUser.created_at || '-'
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
            <th style={{ borderBottom: '2px solid #ddd', padding: '10px' }}>닉네임</th>
            <th style={{ borderBottom: '2px solid #ddd', padding: '10px' }}>Display Name</th>
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
                <span style={{ 
                  color: '#333',
                  fontWeight: user.nickname ? '500' : 'normal'
                }}>
                  {user.nickname || '-'}
                </span>
              </td>
              <td style={{ borderBottom: '1px solid #ddd', padding: '10px' }}>
                <span style={{ 
                  color: '#666',
                  fontSize: '0.95em'
                }}>
                  {user.displayName}
                </span>
              </td>
              <td style={{ borderBottom: '1px solid #ddd', padding: '10px' }}>{user.role}</td>
              <td style={{ borderBottom: '1px solid #ddd', padding: '10px' }}>
                {user.createdAt
                  ? new Date(user.createdAt).toLocaleDateString()
                  : '-'}
              </td>
              <td style={{ borderBottom: '1px solid #ddd', padding: '10px' }}>
                {user.role === 'admin' ? (
                  <span style={{ color: '#d32f2f', fontWeight: 600 }}>관리자</span>
                ) : (
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
                  </select>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : null;
};

export default AdminUsers;
