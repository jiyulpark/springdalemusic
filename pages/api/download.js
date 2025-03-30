import { supabase, createSignedUrl } from '../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '허용되지 않은 메서드입니다.' });
  }

  const { postId, filePath } = req.body;

  if (!postId || !filePath) {
    return res.status(400).json({ error: 'postId 또는 filePath가 없습니다.' });
  }

  try {
    // ✅ 토큰 추출
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    // ✅ 사용자 인증 (타임아웃 설정)
    const { data: userInfo, error: userError } = await Promise.race([
      supabase.auth.getUser(token),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('인증 시간 초과')), 5000)
      )
    ]);

    if (userError || !userInfo?.user) {
      console.error('인증 에러:', userError);
      return res.status(401).json({ error: '세션이 유효하지 않습니다.' });
    }

    const userId = userInfo.user.id;

    // ✅ 유저 역할 확인 (타임아웃 설정)
    const { data: userData, error: fetchUserError } = await Promise.race([
      supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('권한 조회 시간 초과')), 5000)
      )
    ]);

    if (fetchUserError || !userData) {
      console.error('권한 조회 에러:', fetchUserError);
      return res.status(403).json({ error: '권한 조회 실패' });
    }

    const userRole = userData.role;

    // ✅ 게시글 다운로드 권한 확인 (타임아웃 설정)
    const { data: postData, error: postError } = await Promise.race([
      supabase
        .from('posts')
        .select('download_permission, downloads')
        .eq('id', postId)
        .single(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('게시글 조회 시간 초과')), 5000)
      )
    ]);

    if (postError || !postData) {
      console.error('게시글 조회 에러:', postError);
      return res.status(404).json({ error: '게시글이 존재하지 않습니다.' });
    }

    const { download_permission, downloads } = postData;

    const roleOrder = ['guest', 'user', 'verified_user', 'admin'];
    const userLevel = roleOrder.indexOf(userRole);
    const requiredLevel = roleOrder.indexOf(download_permission);

    if (userLevel < requiredLevel) {
      return res.status(403).json({ error: '다운로드 권한이 없습니다.' });
    }

    // ✅ 파일 경로 정리
    const rawPath = typeof filePath === 'string'
      ? filePath
      : filePath?.file_url;

    // 파일 경로에서 버킷 이름 추출
    const bucketMatch = rawPath.match(/^(uploads|thumbnails|avatars)\//);
    const bucket = bucketMatch ? bucketMatch[1] : 'uploads';
    const finalPath = rawPath.replace(/^(uploads|thumbnails|avatars)\//, '');

    console.log('=== 파일 다운로드 디버그 정보 ===');
    console.log('원본 경로:', rawPath);
    console.log('버킷:', bucket);
    console.log('최종 경로:', finalPath);
    console.log('============================');

    // ✅ 다운로드 수 증가 (타임아웃 설정)
    await Promise.race([
      supabase
        .from('posts')
        .update({ downloads: downloads + 1 })
        .eq('id', postId),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('다운로드 수 업데이트 시간 초과')), 5000)
      )
    ]);

    // ✅ 서명된 URL 생성 (재시도 로직 사용)
    const { data: fileData, error: fileError } = await createSignedUrl(bucket, finalPath, 60);

    if (fileError || !fileData?.signedUrl) {
      console.error('URL 생성 에러:', fileError);
      return res.status(500).json({ 
        error: '다운로드 URL 생성 실패',
        details: fileError?.message || '알 수 없는 오류'
      });
    }

    return res.status(200).json({
      success: true,
      url: fileData.signedUrl,
    });
  } catch (error) {
    console.error('서버 오류:', error);
    return res.status(500).json({ 
      error: '서버 오류 발생',
      details: error.message 
    });
  }
} 