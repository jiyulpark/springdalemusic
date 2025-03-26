useEffect(() => {
  const checkSession = async () => {
    try {
      // 이 부분을 명확하게 변경
      const { data } = await supabase.auth.getSession();
      
      console.log('세션 데이터:', data);
      
      if (data.session) {
        setSession(data.session);
        const userRole = await getUserRole();
        setRole(userRole);
      } else {
        console.log('세션 없음');
        setSession(null);
        setRole('guest');
      }
    } catch (error) {
      console.error('세션 확인 중 에러:', error);
      setRole('guest');
    } finally {
      setLoading(false);
    }
  };

  checkSession();

  const { data: listener } = supabase.auth.onAuthStateChange(
    async (_event, session) => {
      console.log('Auth State Change:', _event, session);
      
      if (session) {
        setSession(session);
        const userRole = await getUserRole();
        setRole(userRole);
      } else {
        setSession(null);
        setRole('guest');
      }
    }
  );

  return () => listener.unsubscribe();
}, []);
