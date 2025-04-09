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

      const { data, error } = await supabase.from('users').select('*');
      if (!error) setUsers(data);
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
        user.email.toLowerCase().includes(searchEmail.toLowerCase())
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
          <label style={{ marginRight: '10px' }}>이메일 검색: </label>
          <input
            type="text"
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            placeholder="이메일 주소 입력"
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
            <th style={{ borderBottom: '2px solid #ddd', padding: '10px' }}>권한</th>
            <th style={{ borderBottom: '2px solid #ddd', padding: '10px' }}>변경</th>
          </tr>
        </thead>
        <tbody>
          {getFilteredUsers().map(user => (
            <tr key={user.id}>
              <td style={{ borderBottom: '1px solid #ddd', padding: '10px' }}>{user.email}</td>
              <td style={{ borderBottom: '1px solid #ddd', padding: '10px' }}>{user.role}</td>
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
