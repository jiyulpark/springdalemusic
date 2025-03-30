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
    console.warn('❗ postId가 전달되지 않았습니다.');
    return res.status(400).json({ message: 'Post ID is required' });
  }

  try {
    // 빠르게 응답
    res.status(200).json({ success: true });

    // RPC 실행
    const { error } = await supabase.rpc('increment_downloads', {
      post_id_input: postId,
    });

    if (error) {
      console.error('❌ 다운로드 수 증가 실패 (postId: ', postId, ') →', error.message);
      // 서버에서는 로그 남기되 사용자 응답은 이미 전송됨
    } else {
      console.log('✅ 다운로드 수 증가 성공 (postId:', postId, ')');
    }
  } catch (error: any) {
    console.error('❌ 예외 발생:', error.message || error);
    // 응답은 이미 완료되었기 때문에 여기선 로그만 남김
  }
}
