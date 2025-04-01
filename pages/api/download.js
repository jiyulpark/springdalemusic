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

    console.log('✅ 원본 파일 경로:', finalPath);

    // 5-1. 실제 파일이 존재하는지 확인을 위한 파일 조회 작업
    // 파일 ID만 추출 (날짜_파일명 형태로 있다고 가정)
    const fileNameMatch = finalPath.match(/(\d+_[^/]+)$/);
    if (!fileNameMatch) {
      console.error('❌ 파일명 추출 실패:', finalPath);
      return res.status(400).json({ error: '파일 경로 형식이 올바르지 않습니다.' });
    }

    const fileName = fileNameMatch[1];
    console.log('📄 추출된 파일명:', fileName);

    // 5-2. files 테이블에서 실제 파일 정보 조회
    try {
      const { data: fileData, error: fileError } = await supabase
        .from('files')
        .select('file_url')
        .eq('post_id', postId)
        .like('file_url', `%${fileName}%`)
        .maybeSingle();

      if (fileError) {
        console.error('❌ 파일 정보 조회 실패:', fileError.message);
      } else if (fileData?.file_url) {
        console.log('✅ DB에서 파일 정보 찾음:', fileData.file_url);
        finalPath = fileData.file_url;
      }
    } catch (error) {
      console.error('❌ 파일 정보 조회 중 오류:', error.message);
    }

    // 버킷 이름 처리
    const bucketName = 'uploads';
    let pathWithoutBucket = finalPath;

    // uploads/ 접두사 처리
    if (finalPath.startsWith('uploads/')) {
      pathWithoutBucket = finalPath.substring(8); // 'uploads/'의 길이인 8을 자름
    } else if (finalPath.startsWith('thumbnails/')) {
      pathWithoutBucket = finalPath.substring(11); // 'thumbnails/'의 길이인 11을 자름
    } else if (finalPath.startsWith('avatars/')) {
      pathWithoutBucket = finalPath.substring(8); // 'avatars/'의 길이인 8을 자름
    }

    console.log('📁 처리된 파일 정보:', {
      원본경로: finalPath,
      버킷내경로: pathWithoutBucket,
      버킷: bucketName
    });

    // 7. 다운로드 URL 생성 전략
    // 먼저 공개 URL 시도 (가장 안정적)
    console.log('🔗 공개 URL 생성 시도:', pathWithoutBucket);
    const publicUrlResult = supabase.storage
      .from(bucketName)
      .getPublicUrl(pathWithoutBucket);
      
    if (publicUrlResult?.data?.publicUrl) {
      console.log('✅ 공개 URL 생성 성공');
      
      // 다운로드 카운트 증가
      try {
        await supabase
          .from('posts')
          .update({ download_count: (post.download_count || 0) + 1 })
          .eq('id', postId);
      } catch (updateError) {
        console.error('❌ 다운로드 카운트 업데이트 실패:', updateError.message);
      }
      
      return res.status(200).json({ url: publicUrlResult.data.publicUrl });
    }

    // 공개 URL 실패 시 서명된 URL 시도
    try {
      console.log('🔗 서명된 URL 생성 시도:', pathWithoutBucket);
      
      const { data, error } = await Promise.race([
        supabase.storage
          .from(bucketName)
          .createSignedUrl(pathWithoutBucket, 60),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('URL 생성 시간 초과')), 5000)
        )
      ]);
      
      if (error) {
        console.error('❌ 서명된 URL 생성 오류:', error);
        
        // 다른 경로 형식으로 재시도
        let alternativePath = pathWithoutBucket;
        
        // 파일이 다른 폴더에 있을 수 있음
        if (alternativePath.includes('/')) {
          // 폴더 경로 제거하고 파일명만으로 시도
          alternativePath = alternativePath.split('/').pop();
          console.log('🔄 대체 경로 시도 (파일명만):', alternativePath);
          
          const altResult = supabase.storage
            .from(bucketName)
            .getPublicUrl(alternativePath);
            
          if (altResult?.data?.publicUrl) {
            console.log('✅ 대체 경로로 공개 URL 생성 성공');
            
            // 다운로드 카운트 증가
            try {
              await supabase
                .from('posts')
                .update({ download_count: (post.download_count || 0) + 1 })
                .eq('id', postId);
            } catch (updateError) {
              console.error('❌ 다운로드 카운트 업데이트 실패:', updateError.message);
            }
            
            return res.status(200).json({ url: altResult.data.publicUrl });
          }
        }
        
        throw error;
      }
      
      if (!data?.signedUrl) throw new Error('서명된 URL을 생성할 수 없습니다.');
      
      // 다운로드 카운트 증가
      try {
        await supabase
          .from('posts')
          .update({ download_count: (post.download_count || 0) + 1 })
          .eq('id', postId);
      } catch (updateError) {
        console.error('❌ 다운로드 카운트 업데이트 실패:', updateError.message);
      }

      console.log('✅ 다운로드 URL 생성 성공:', data.signedUrl.substring(0, 50) + '...');
      return res.status(200).json({ url: data.signedUrl });
    } catch (error) {
      console.error('❌ 다운로드 URL 생성 실패:', error.message);
      
      // 모든 시도가 실패하면 자세한 에러 메시지 반환
      const errorMessage = `파일을 찾을 수 없습니다. 경로를 확인해 주세요. (요청 경로: ${pathWithoutBucket})`;
      console.error('❌ 최종 오류:', errorMessage);
      return res.status(404).json({ error: errorMessage });
    }
  } catch (error) {
    console.error('❌ 다운로드 처리 중 에러:', error.message);
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}
