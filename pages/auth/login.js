useEffect(() => {
  setIsClient(true);
  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      router.push('/');
    } else {
      setSession(null);
    }
  };
  checkSession();
}, [router]);
