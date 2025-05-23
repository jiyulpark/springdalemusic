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
      try {
        // 백엔드 트리거가 사용자를 생성할 시간을 주기 위해 약간의 대기 시간 추가
        await ensureUserInDatabase(incomingSession.user);
      } catch (userDbError) {
        console.warn('⚠️ 유저 DB 확인 중 오류:', userDbError.message);
        // 오류가 발생해도 계속 진행 - 백엔드 트리거에 의존
      }

      const cachedRole = localStorage.getItem('userRole');
      if (cachedRole) {
        console.log('📦 캐시된 role 사용:', cachedRole);
        setRole(cachedRole);
        return;
      }

      console.log('🔍 getUserRole 호출!');

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('⏰ SELECT 응답 없음 - 타임아웃')), 5000)
      );

      const userRole = await Promise.race([
        getUserRole(incomingSession.user.id),
        timeoutPromise,
      ]);

      console.log('✅ getUserRole 결과:', userRole);

      setRole(userRole);
      localStorage.setItem('userRole', userRole);
    } catch (err) {
      console.error('❌ handleSession 에러:', err.message);
      const cachedRole = localStorage.getItem('userRole');
      if (cachedRole) {
        console.log('📦 handleSession: 캐시된 역할 사용:', cachedRole);
        setRole(cachedRole);
      } else {
        setRole('guest');
        localStorage.removeItem('userRole');
      }
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
