export const config = { api: { bodyParser: true } };
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  // 1. Auth 계정 삭제
  const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (authErr) return res.status(500).json({ error: authErr.message });

  // 2. users 테이블에서 삭제
  await supabaseAdmin.from('users').delete().eq('id', userId);

  return res.status(204).end();
} 