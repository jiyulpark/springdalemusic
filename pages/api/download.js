import { supabase } from '../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { postId, filePath } = req.body;

    // 세션 확인
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      console.error('세션 오류:', sessionError);
      return res.status(401).json({ error: '인증되지 않은 사용자입니다.' });
    }

    // 게시글 정보 조회
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (postError) {
      console.error('게시글 조회 오류:', postError);
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    }

    // 다운로드 권한 확인
    const canDownload = await checkDownloadPermission(session.user.id, post);
    if (!canDownload) {
      return res.status(403).json({ error: '다운로드 권한이 없습니다.' });
    }

    // 다운로드 URL 생성
    const { data: urlData, error: urlError } = await supabase.storage
      .from('uploads')
      .createSignedUrl(filePath, 60);

    if (urlError) {
      console.error('URL 생성 오류:', urlError);
      return res.status(500).json({ error: '다운로드 URL 생성 실패' });
    }

    // 다운로드 횟수 증가
    const { error: updateError } = await supabase
      .from('posts')
      .update({ download_count: (post.download_count || 0) + 1 })
      .eq('id', postId);

    if (updateError) {
      console.error('다운로드 횟수 업데이트 오류:', updateError);
    }

    return res.status(200).json({ url: urlData.signedUrl });
  } catch (error) {
    console.error('다운로드 처리 오류:', error);
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
} 