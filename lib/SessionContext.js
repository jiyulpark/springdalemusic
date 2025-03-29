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
        localStorage.removeItem('userRole');
        return;
      }

      console.log('🧾 세션 있음:', incomingSession);
      setSession(incomingSession);

      console.log('🛠 ensureUserInDatabase 호출!');
      await ensureUserInDatabase(incomingSession.user);

      // 🔥 로컬 캐시 우선 사용
      const cachedRole = localStorage.getItem('userRole');
      if (cachedRole) {
        console.log('📦 캐시된 role 사용:', cachedRole);
        setRole(cachedRole);
        return;
      }

      console.log('🔍 getUserRole 호출!');
      const userRole = await getUserRole(incomingSession.user.id);
      console.log('✅ getUserRole 결과:', userRole);

      setRole(userRole);
      localStorage.setItem('userRole', userRole);
    } catch (err) {
      console.error('❌ handleSession 에러:', err.message);
      setRole('guest');
      localStorage.removeItem('userRole');
    }
  };

  useEffect(() => {
    console.log('🧠 SessionProvider 시작됨');

    const init = async () => {
      try {
        let { data: { session }, error } = await supabase.auth.getSession();
        console.log('📦 getSession 결과:', session);

        if ((!session || !session.user) && !error) {
          console.log('🧪 fallback: getUser() 호출');
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (user) {
            session = { user };
          } else {
            console.error('❌ getUser 실패:', userError?.message);
          }
        }

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

    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, []);

  return (
    <SessionContext.Provider value={{ session, role, loading }}>
      {!loading && children}
    </SessionContext.Provider>
  );
};

export const useSession = () => useContext(SessionContext);
