import { supabase } from '@/lib/supabase';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '허용되지 않은 메서드입니다.' });
  }

  const { postId, filePath } = req.query;

  if (!postId || !filePath || typeof filePath !== 'string') {
    return res.status(400).json({ error: '잘못된 요청입니다.' });
  }

  try {
    // 🧠 쿠키 기반 세션 추출
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies['sb-access-token'];

    let role = 'guest';
    let userId = null;

    if (token) {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error) {
        console.error('유저 정보 조회 실패:', error.message);
      } else {
        userId = user?.id;

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('id', userId)
          .single();

        if (userError) {
          console.error('유저 role 조회 실패:', userError.message);
        } else {
          role = userData?.role || 'guest';
        }
      }
    }

    // ✅ 게시글 권한 조회
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('download_permission')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return res.status(404).json({ error: '게시물을 찾을 수 없습니다.' });
    }

    const permission = post.download_permission || 'guest';

    // ✅ 역할 계층 비교
    const levelMap = {
      guest: 0,
      user: 1,
      verified_user: 2,
      admin: 3,
    };

    const userLevel = levelMap[role] ?? 0;
    const requiredLevel = levelMap[permission] ?? 0;

    if (userLevel < requiredLevel) {
      return res.status(403).json({ error: '다운로드 권한이 없습니다.' });
    }

    // ✅ 다운로드 수 증가
    const { error: rpcError } = await supabase.rpc('increment_downloads', {
      post_id_input: postId,
    });

    if (rpcError) {
      console.error('다운로드 수 증가 실패:', rpcError.message);
    }

    // ✅ 실제 다운로드 URL 반환
    const { data } = supabase.storage.from('uploads').getPublicUrl(filePath);
    const downloadUrl = data?.publicUrl;

    if (!downloadUrl) {
      return res.status(500).json({ error: '파일 경로가 유효하지 않습니다.' });
    }

    return res.redirect(302, downloadUrl);
  } catch (err: any) {
    console.error('다운로드 처리 실패:', err.message);
    return res.status(500).json({ error: '서버 오류 발생' });
  }
}
