import { setupRLSPolicies } from '../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '허용되지 않은 메서드입니다.' });
  }

  try {
    await setupRLSPolicies();
    return res.status(200).json({ message: 'RLS 정책 설정이 완료되었습니다.' });
  } catch (error) {
    console.error('RLS 정책 설정 중 오류:', error);
    return res.status(500).json({ 
      error: 'RLS 정책 설정 중 오류가 발생했습니다.',
      details: error.message 
    });
  }
} 