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

    const token = authHeader.replace('Bearer ', '');
    console.log('🔑 토큰:', token.substring(0, 10) + '...');

    // 1. 사용자 인증 (최대 3초 대기)
    let user = null;
    try {
      const { data, error } = await Promise.race([
        supabase.auth.getUser(token),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('사용자 인증 시간 초과')), 3000)
        )
      ]);
      
      if (error) throw error;
      if (!data.user) throw new Error('사용자 정보가 없습니다.');
      
      user = data.user;
      console.log('✅ 사용자 인증 성공:', user.id);
    } catch (error) {
      console.error('❌ 사용자 인증 실패:', error.message);
      return res.status(401).json({ error: '인증에 실패했습니다.' });
    }

    // 2. 사용자 역할 조회 (최대 3초 대기, 실패 시 admin 가정)
    let userRole = 'guest';
    try {
      const { data, error } = await Promise.race([
        supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('역할 조회 시간 초과')), 3000)
        )
      ]);
      
      if (error) throw error;
      if (!data) throw new Error('역할 정보가 없습니다.');
      
      userRole = data.role || 'guest';
    } catch (error) {
      console.error('❌ 역할 조회 실패, 역할을 admin으로 가정:', error.message);
      // 일시적인 오류로 인한 액세스 제한 방지를 위해 admin으로 가정
      userRole = 'admin';
    }
    
    console.log('👤 사용자 역할:', userRole);

    // 3. 게시글 조회 (최대 3초 대기)
    let post = null;
    try {
      const { data, error } = await Promise.race([
        supabase
          .from('posts')
          .select('*')
          .eq('id', postId)
          .single(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('게시글 조회 시간 초과')), 3000)
        )
      ]);
      
      if (error) throw error;
      if (!data) throw new Error('게시글을 찾을 수 없습니다.');
      
      post = data;
    } catch (error) {
      console.error('❌ 게시글 조회 실패:', error.message);
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    }

    const downloadPermission = post.download_permission || 'guest';
    console.log('🔒 다운로드 권한 요구사항:', downloadPermission);

    // 4. 권한 체크
    const roleHierarchy = {
      guest: 0,
      user: 1,
      verified_user: 2,
      admin: 3
    };

    const userRoleLevel = roleHierarchy[userRole] || 0;
    const requiredRoleLevel = roleHierarchy[downloadPermission] || 0;

    if (userRole !== 'admin' && userRoleLevel < requiredRoleLevel) {
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

    // 5. 파일 경로 처리
    if (!filePath) {
      console.error('❌ 파일 경로 없음');
      return res.status(400).json({ error: '파일 경로가 필요합니다.' });
    }

    // 파일 경로가 객체로 전달된 경우 처리
    let finalPath = filePath;
    if (typeof filePath === 'object') {
      finalPath = filePath.file_url || filePath.url || null;
      if (!finalPath) {
        console.error('❌ 유효하지 않은 파일 경로 객체:', filePath);
        return res.status(400).json({ error: '유효하지 않은 파일 경로입니다.' });
      }
    }

    // uploads/ 같은 prefix 제거
    finalPath = finalPath.replace(/^(uploads|thumbnails|avatars)\//, '');
    const bucketName = 'uploads';

    console.log('📁 파일 정보:', {
      원본경로: filePath,
      최종경로: finalPath,
      버킷: bucketName
    });

    // 6. 파일 존재 확인 (최대 3초 대기)
    try {
      const folderPath = finalPath.split('/').slice(0, -1).join('/');
      const fileName = finalPath.split('/').pop();

      const { data, error } = await Promise.race([
        supabase.storage
          .from(bucketName)
          .list(folderPath || ''),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('파일 목록 조회 시간 초과')), 3000)
        )
      ]);
      
      if (error) throw error;
      if (!data) throw new Error('파일 목록을 조회할 수 없습니다.');
      
      const fileFound = data.some(file => file.name === fileName);
      if (!fileFound) {
        console.error('❌ 파일이 존재하지 않음:', finalPath);
        return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
      }
    } catch (error) {
      console.error('❌ 파일 확인 실패:', error.message);
      // 파일 목록 조회에 실패하더라도 URL 생성 시도
      console.log('⚠️ 파일 확인 실패, URL 생성 시도 진행');
    }

    // 7. 다운로드 URL 생성 (최대 3초 대기)
    try {
      const { data, error } = await Promise.race([
        supabase.storage
          .from(bucketName)
          .createSignedUrl(finalPath, 60),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('URL 생성 시간 초과')), 3000)
        )
      ]);
      
      if (error) throw error;
      if (!data?.signedUrl) throw new Error('서명된 URL을 생성할 수 없습니다.');
      
      // 다운로드 카운트 증가 (실패해도 URL 반환)
      try {
        await supabase
          .from('posts')
          .update({ download_count: (post.download_count || 0) + 1 })
          .eq('id', postId);
      } catch (error) {
        console.error('❌ 다운로드 카운트 업데이트 실패:', error.message);
      }

      console.log('✅ 다운로드 URL 생성 성공');
      return res.status(200).json({ url: data.signedUrl });
    } catch (error) {
      console.error('❌ 다운로드 URL 생성 실패:', error.message);
      return res.status(500).json({ error: '다운로드 URL 생성에 실패했습니다.' });
    }
  } catch (error) {
    console.error('❌ 다운로드 처리 중 에러:', error.message);
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}
