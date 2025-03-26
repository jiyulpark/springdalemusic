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

    const getInitialSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('🚨 세션 가져오기 에러:', error.message);
        setLoading(false);
        return;
      }

      if (session && session.user) {
        console.log('🧩 초기 세션 존재:', session);
        setSession(session);

        console.log('🛠 ensureUserInDatabase 호출!');
        await ensureUserInDatabase(session.user);

        console.log('🔍 getUserRole 호출!');
        const userRole = await getUserRole(session.user.id);

        console.log('✅ getUserRole 결과:', userRole);
        setRole(userRole);
      } else {
        console.log('🚩 세션 없음: 게스트로 설정');
        setRole('guest');
      }

      setLoading(false);
      console.log('✅ 초기 로딩 종료');
    };

    getInitialSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log('🌀 onAuthStateChange triggered:', _event);

        if (session && session.user) {
          setSession(session);

          console.log('🛠 ensureUserInDatabase 호출!');
          await ensureUserInDatabase(session.user);

          console.log('🔍 getUserRole 호출!');
          const userRole = await getUserRole(session.user.id);

          console.log('✅ getUserRole 결과:', userRole);
          setRole(userRole);
        } else {
          setSession(null);
          setRole('guest');
        }

        setLoading(false);
        console.log('✅ 이벤트 처리 후 로딩 종료');
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
