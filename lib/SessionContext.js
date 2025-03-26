import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';
import { getUserRole, ensureUserInDatabase } from './auth';

const SessionContext = createContext();

export const SessionProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState('guest');
  const [loading, setLoading] = useState(true);

  // ✅ 사용자 세션 처리 함수 - 중복 방지 & 통합 처리
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
      console.error('❌ 세션 처리 중 에러:', err.message);
      setRole('guest');
    }
  };

  useEffect(() => {
    console.log('🧠 SessionProvider 시작됨');

    // ✅ 초기 세션 불러오기 (F5 대응)
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

    // ✅ auth 상태 변경 시 재처리
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        console.log('🌀 onAuthStateChange triggered:', _event);
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
