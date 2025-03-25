import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { getUserRole } from '../../lib/auth';
import { useRouter } from 'next/router';

const AdminUsers = () => {
  const [role, setRole] = useState('guest');
  const [users, setUsers] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const fetchUsers = async () => {
      const userRole = await getUserRole();
      setRole(userRole);

      if (userRole !== 'admin') {
        alert('관리자만 접근 가능합니다.');
        router.push('/'); // ✅ 비관리자는 홈으로 리디렉트
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

  return role === 'admin' ? (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '20px', background: '#fff', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}>
      <h1>유저 관리</h1>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ borderBottom: '2px solid #ddd', padding: '10px' }}>이메일</th>
            <th style={{ borderBottom: '2px solid #ddd', padding: '10px' }}>권한</th>
            <th style={{ borderBottom: '2px solid #ddd', padding: '10px' }}>변경</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td style={{ borderBottom: '1px solid #ddd', padding: '10px' }}>{user.email}</td>
              <td style={{ borderBottom: '1px solid #ddd', padding: '10px' }}>{user.role}</td>
              <td style={{ borderBottom: '1px solid #ddd', padding: '10px' }}>
                <select value={user.role} onChange={(e) => updateUserRole(user.id, e.target.value)}>
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
