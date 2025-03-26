import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { getUserRole, ensureUserInDatabase } from './auth';

const SessionContext = createContext();

export const SessionProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState('guest');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('🌀 onAuthStateChange triggered:', _event, session);

      setSession(session);

      if (session) {
        console.log('🛠 ensureUserInDatabase 호출!');
        await ensureUserInDatabase();

        console.log('🔍 getUserRole 호출!');
        const userRole = await getUserRole();

        console.log('✅ getUserRole 결과:', userRole);
        setRole(userRole);
      } else {
        setRole('guest');
      }

      console.log('✅ loading 상태 false로 변경');
      setLoading(false);
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
