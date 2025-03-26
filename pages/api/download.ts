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

  const { postId, currentDownloads } = req.body;

  if (!postId) {
    return res.status(400).json({ message: 'Post ID is required' });
  }

  try {
    // 중요: 비동기 작업을 빠르게 응답
    res.status(200).json({ success: true });

    // 백그라운드에서 실제 업데이트 수행
    const { error } = await supabase
      .from('posts')
      .update({ 
        downloads: currentDownloads 
      })
      .eq('id', postId);

    if (error) {
      console.error('Background download count update error:', error);
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}