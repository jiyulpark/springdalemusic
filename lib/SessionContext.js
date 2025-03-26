import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { getUserRole, ensureUserInDatabase } from './auth';

const SessionContext = createContext();

export const SessionProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState('guest');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        // 세션이 있든 없든 무조건 로딩 해제
        setSession(session);
        
        if (session) {
          await ensureUserInDatabase();
          const userRole = await getUserRole();
          setRole(userRole);
        } else {
          setRole('guest');
        }
      } catch (error) {
        console.error('세션 확인 중 오류:', error);
        setRole('guest');
      } finally {
        // 무조건 로딩 해제
        setLoading(false);
      }
    };

    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        
        if (session) {
          await ensureUserInDatabase();
          const userRole = await getUserRole();
          setRole(userRole);
        } else {
          setRole('guest');
        }
      }
    );

    return () => listener.unsubscribe();
  }, []);

  return (
    <SessionContext.Provider value={{ session, role, loading }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => useContext(SessionContext);