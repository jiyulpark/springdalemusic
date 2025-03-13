import { supabase } from "../lib/supabase";

export default function AuthPage() {
  const handleLogin = async () => {
    const { user, error } = await supabase.auth.signInWithOAuth({
      provider: "google", // Google 로그인 (다른 OAuth 제공자도 가능)
    });

    if (error) {
      console.error("로그인 오류:", error.message);
    } else {
      console.log("로그인 성공:", user);
    }
  };

  return (
    <div>
      <h1>로그인 페이지</h1>
      <button onClick={handleLogin}>Google 로그인</button>
    </div>
  );
}