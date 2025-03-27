import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';
import { getUserRole, ensureUserInDatabase } from './auth';

const SessionContext = createContext();

export const SessionProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState('guest');
  const [loading, setLoading] = useState(true);

  const handleSession = async (incomingSession) => {
    try {
      if (!incomingSession || !incomingSession.user) {
        console.log('🚩 세션 없음: guest');
        setSession(null);
        setRole('guest');
        return;
      }

      setSession(incomingSession);
      console.log('🛠 ensureUserInDatabase 호출!');
      await ensureUserInDatabase(incomingSession.user);

      console.log('🔍 getUserRole 호출!');
      const userRole = await getUserRole(incomingSession.user.id);

      console.log('✅ getUserRole 결과:', userRole);
      setRole(userRole);
    } catch (err) {
      console.error('❌ handleSession 에러:', err.message);
      setRole('guest');
    }
  };

  useEffect(() => {
    console.log('🧠 SessionProvider 시작됨');

    const init = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) console.error('🚨 세션 가져오기 실패:', error.message);

        await handleSession(session);
      } catch (err) {
        console.error('❌ init 에러:', err.message);
        setRole('guest');
      } finally {
        setLoading(false);
        console.log('✅ 초기 로딩 종료');
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('🌀 onAuthStateChange triggered:', event);
        try {
          await handleSession(newSession);
        } catch (e) {
          console.error('❌ Auth 이벤트 처리 에러:', e.message);
          setRole('guest');
        } finally {
          setLoading(false);
          console.log('✅ 이벤트 처리 후 로딩 종료');
        }
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
