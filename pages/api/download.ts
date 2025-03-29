// pages/api/download.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';

export default async function handler(
  req: NextApiRequest, 
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { postId } = req.body;

  if (!postId) {
    return res.status(400).json({ message: 'Post ID is required' });
  }

  try {
    res.status(200).json({ success: true }); // 빠른 응답

    const { error } = await supabase.rpc('increment_downloads', {
      post_id_input: postId,
    });

    if (error) {
      console.error('❌ RPC 다운로드 증가 실패:', error.message);
    }
  } catch (error) {
    console.error('❌ API 에러:', error);
  }
}
