import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';
import { getUserRole, ensureUserInDatabase } from './auth';

const SessionContext = createContext();

export const SessionProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState('guest');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🧠 SessionProvider 시작됨');

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🌀 onAuthStateChange triggered:', event);
      setSession(session);

      if (session) {
        try {
          console.log('🛠 ensureUserInDatabase 호출!');
          await ensureUserInDatabase();

          console.log('🔍 getUserRole 호출!');
          const userRole = await getUserRole();

          console.log('✅ getUserRole 결과:', userRole);
          setRole(userRole);
        } catch (error) {
          console.error('❌ 세션 처리 중 오류:', error);
          setRole('guest');
        }
      } else {
        console.log('👤 로그아웃됨. role: guest');
        setRole('guest');
      }

      console.log('✅ loading 상태 false로 변경');
      setLoading(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <SessionContext.Provider value={{ session, role, loading }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => useContext(SessionContext);
