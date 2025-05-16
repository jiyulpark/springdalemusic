import { createClient } from '@supabase/supabase-js';

export const config = { api: { bodyParser: true } };

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method Not Allowed' });

  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  // 1) Auth 계정 삭제
  const { error: authErr } = await admin.auth.admin.deleteUser(userId);
  if (authErr) return res.status(500).json({ error: authErr.message });

  // 2) 앱 프로필 삭제
  const { error: dbErr } = await admin.from('users').delete().eq('id', userId);
  if (dbErr) return res.status(500).json({ error: dbErr.message });

  return res.status(200).json({ success: true });
} 