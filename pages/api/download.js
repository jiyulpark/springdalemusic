import { supabase } from '../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '허용되지 않는 메서드입니다.' });
  }

  try {
    const { postId, filePath } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      console.error('❌ 인증 헤더 없음');
      return res.status(401).json({ error: '인증이 필요합니다.' });
    }

    // 세션 토큰 추출
    const token = authHeader.replace('Bearer ', '');
    console.log('🔑 토큰:', token.substring(0, 10) + '...');

    // 세션 검증
    const { data: { user }, error: sessionError } = await supabase.auth.getUser(token);
    if (sessionError || !user) {
      console.error('❌ 세션 검증 실패:', sessionError?.message);
      return res.status(401).json({ error: '유효하지 않은 세션입니다.' });
    }

    console.log('✅ 세션 검증 성공:', user.id);

    // 사용자 역할 조회
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      console.error('❌ 사용자 정보 조회 실패:', userError?.message);
      return res.status(500).json({ error: '사용자 정보를 가져올 수 없습니다.' });
    }

    const userRole = userData.role || 'guest';
    console.log('👤 사용자 역할:', userRole);

    // 게시물 정보 조회
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      console.error('❌ 게시물 조회 실패:', postError?.message);
      return res.status(404).json({ error: '게시물을 찾을 수 없습니다.' });
    }

    // 다운로드 권한 체크
    const downloadPermission = post.download_permission || 'guest';
    console.log('🔒 다운로드 권한 요구사항:', downloadPermission);

    const roleHierarchy = {
      'guest': 0,
      'user': 1,
      'verified_user': 2,
      'admin': 3
    };

    const userRoleLevel = roleHierarchy[userRole] || 0;
    const requiredRoleLevel = roleHierarchy[downloadPermission] || 0;

    if (userRoleLevel < requiredRoleLevel) {
      console.error('❌ 권한 부족:', {
        사용자역할: userRole,
        요구사항: downloadPermission
      });
      return res.status(403).json({ 
        error: '다운로드 권한이 없습니다.',
        requiredRole: downloadPermission,
        currentRole: userRole
      });
    }

    // 파일 경로 처리
    if (!filePath) {
      console.error('❌ 파일 경로 없음');
      return res.status(400).json({ error: '파일 경로가 필요합니다.' });
    }

    const rawPath = filePath;
    const bucketMatch = rawPath.match(/^(uploads|thumbnails|avatars)\//);
    const bucketName = bucketMatch ? bucketMatch[1] : 'uploads';
    const finalPath = rawPath.replace(/^(uploads|thumbnails|avatars)\//, '');

    console.log('📁 파일 정보:', {
      원본경로: rawPath,
      버킷: bucketName,
      최종경로: finalPath
    });

    // 파일 존재 여부 확인
    const { data: fileExists, error: fileCheckError } = await supabase.storage
      .from(bucketName)
      .list(finalPath.split('/').slice(0, -1).join('/'));

    if (fileCheckError) {
      console.error('❌ 파일 확인 실패:', fileCheckError.message);
      return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
    }

    const fileName = finalPath.split('/').pop();
    const fileFound = fileExists?.some(file => file.name === fileName);

    if (!fileFound) {
      console.error('❌ 파일이 존재하지 않음:', finalPath);
      return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
    }

    // 다운로드 URL 생성
    const { data: urlData, error: urlError } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(finalPath, 60);

    if (urlError) {
      console.error('❌ 다운로드 URL 생성 실패:', urlError.message);
      return res.status(500).json({ error: '다운로드 URL 생성에 실패했습니다.' });
    }

    // 다운로드 카운트 증가
    const { error: updateError } = await supabase
      .from('posts')
      .update({ download_count: (post.download_count || 0) + 1 })
      .eq('id', postId);

    if (updateError) {
      console.error('❌ 다운로드 카운트 업데이트 실패:', updateError.message);
    }

    console.log('✅ 다운로드 URL 생성 성공');
    return res.status(200).json({ url: urlData.signedUrl });
  } catch (error) {
    console.error('❌ 다운로드 처리 중 에러:', error.message);
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}
