// lib/SessionContext.js
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { getUserRole, ensureUserInDatabase } from './auth';

const SessionContext = createContext();

export const SessionProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState('guest');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);

        if (session) {
          await ensureUserInDatabase();
          const userRole = await getUserRole();
          console.log('🧾 유저 권한:', userRole);
          setRole(userRole);
        } else {
          setRole('guest');
        }
      } catch (error) {
        console.error('🔴 세션 로딩 실패:', error);
        setRole('guest');
      } finally {
        setLoading(false); // ✅ 무조건 loading 해제
      }
    };

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        await ensureUserInDatabase();
        const userRole = await getUserRole();
        console.log('🧾 유저 권한 (변경 감지):', userRole);
        setRole(userRole);
      } else {
        setRole('guest');
      }
    });

    return () => listener.unsubscribe();
  }, []);

  return (
    <SessionContext.Provider value={{ session, role, loading }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => useContext(SessionContext);