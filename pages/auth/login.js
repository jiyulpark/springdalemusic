useEffect(() => {
  setIsClient(true);

  const fetchSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setSession(session);

    if (session) {
      router.push('/');
    }
  };

  fetchSession();
}, [router]);
