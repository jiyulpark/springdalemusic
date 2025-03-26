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

    // ✅ 최초 마운트 시 초기 세션 강제 체크
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('🧩 초기 세션 존재:', session);
        setSession(session);

        console.log('🛠 ensureUserInDatabase 호출!');
        await ensureUserInDatabase();

        console.log('🔍 getUserRole 호출!');
        const userRole = await getUserRole();

        console.log('✅ getUserRole 결과:', userRole);
        setRole(userRole);
      } else {
        setRole('guest');
      }

      console.log('✅ 초기 로딩 종료');
      setLoading(false);
    };

    getInitialSession();

    // ✅ 로그인/로그아웃 등 실시간 이벤트 감지
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log('🌀 onAuthStateChange triggered:', _event);
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

        console.log('✅ 이벤트 처리 후 로딩 종료');
        setLoading(false);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <SessionContext.Provider value={{ session, role, loading }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => useContext(SessionContext);
