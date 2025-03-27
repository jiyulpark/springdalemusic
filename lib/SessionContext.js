import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';
import { getUserRole, ensureUserInDatabase } from './auth';

const SessionContext = createContext();

export const SessionProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState('guest');
  const [loading, setLoading] = useState(true);
  const [hasHandled, setHasHandled] = useState(false); // ✅ 중복 방지

  const handleSession = async (incomingSession) => {
    if (hasHandled) {
      console.log('⛔ 이미 세션 처리됨. 중복 호출 방지');
      return;
    }
    setHasHandled(true);

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
      console.error('❌ 세션 처리 중 에러:', err.message);
      setRole('guest');
    }
  };

  useEffect(() => {
    console.log('🧠 SessionProvider 시작됨');

    const init = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('🚨 세션 가져오기 실패:', error.message);
      }
      await handleSession(session);
      setLoading(false);
      console.log('✅ 초기 로딩 종료');
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('🌀 onAuthStateChange triggered:', event);
        await handleSession(newSession);
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
