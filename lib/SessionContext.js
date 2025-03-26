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
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (session) {
        await ensureUserInDatabase();
        const userRole = await getUserRole();
        setRole(userRole);
      } else {
        setRole('guest');
      }

      setLoading(false);
    };

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        await ensureUserInDatabase();
        const userRole = await getUserRole();
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
