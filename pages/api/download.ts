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
    const { error } = await supabase
      .from('posts')
      .update({ 
        downloads: currentDownloads 
      })
      .eq('id', postId);

    if (error) throw error;

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Download count update error:', error);
    res.status(500).json({ 
      message: '다운로드 카운트 업데이트 실패', 
      error: error.message 
    });
  }
}