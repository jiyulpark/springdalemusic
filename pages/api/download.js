import { supabase } from '../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '허용되지 않는 메서드입니다.' });
  }

  try {
    const { postId, filePath } = req.body;
    const authHeader = req.headers.authorization;

    console.log('📥 다운로드 요청 수신: ', { postId, filePath });

    // 1. 게시글 정보 조회
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single();
      
    if (postError) {
      console.error('❌ 게시글 조회 실패:', postError);
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    }

    // 2. 사용자 인증 확인 (guest 권한일 경우 건너뜀)
    let user = null;
    if (post.download_permission !== 'guest') {
      // 인증 헤더가 있는 경우 사용자 정보 확인
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        console.log('🔑 토큰:', token.substring(0, 10) + '...');

        const { data: { user: authUser } } = await supabase.auth.getUser(token);
        if (authUser) {
          user = authUser;
          console.log('✅ 인증된 사용자:', user.id);
        }
      }
      
      // guest 권한이 아닌데 로그인도 안된 경우
      if (!user && post.download_permission !== 'guest') {
        console.error('❌ 권한 없음: 로그인이 필요합니다.');
        return res.status(401).json({ error: '로그인이 필요합니다.' });
      }
    }

    // 3. 권한 체크
    let hasPermission = false;
    
    // 사용자가 관리자인지 확인
    let isAdmin = false;
    if (user) {
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      
      isAdmin = userData?.role === 'admin';
    }
    
    // 권한 체크 로직 개선
    // 1. 관리자는 항상 다운로드 가능
    if (isAdmin) {
      hasPermission = true;
      console.log('👑 관리자 권한으로 다운로드 승인');
    }
    // 2. guest 권한 게시물은 모든 사용자 다운로드 가능
    else if (post.download_permission === 'guest') {
      hasPermission = true;
      console.log('✅ 게스트 허용 게시물: 모든 사용자 다운로드 가능');
    }
    // 3. 로그인한 사용자 권한 체크
    else if (user) {
      if (post.download_permission === 'user') {
        // 일반 유저 이상 가능한 게시물
        hasPermission = true;
        console.log('✅ 일반 사용자 권한으로 다운로드 승인');
      } 
      else if (post.download_permission === 'verified_user') {
        // 인증 유저만 가능한 게시물
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (userData && (userData.role === 'verified_user' || userData.role === 'admin')) {
          hasPermission = true;
          console.log('✅ 인증 사용자 권한으로 다운로드 승인');
        }
      }
    }
    
    if (!hasPermission) {
      const roleNames = {
        'guest': '비로그인',
        'user': '일반 회원',
        'verified_user': '인증 회원',
        'admin': '관리자'
      };
      
      let currentRole = 'guest';
      
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
          
        currentRole = userData?.role || 'user';
      }
      
      console.error(`❌ 권한 없음: ${roleNames[post.download_permission]} 이상 권한이 필요합니다. (현재: ${roleNames[currentRole]})`);
      
      return res.status(403).json({ 
        error: `${roleNames[post.download_permission]} 이상만 다운로드할 수 있습니다. (현재: ${roleNames[currentRole]})`, 
        requiredRole: post.download_permission,
        currentRole: currentRole
      });
    }

    console.log('✅ 다운로드 권한 확인 완료:', {
      게시글ID: postId,
      다운로드권한: post.download_permission,
      사용자: user ? `로그인 (${user.id})` : '비로그인'
    });

    // 5. 파일 경로 처리
    if (!filePath) {
      console.error('❌ 파일 경로 없음');
      return res.status(400).json({ error: '파일 경로가 필요합니다.' });
    }

    // 파일 경로가 문자열화된 JSON 객체인 경우 다시 파싱
    let filePathObj = filePath;
    if (typeof filePath === 'string' && (filePath.startsWith('{') || filePath.includes('file_url'))) {
      try {
        filePathObj = JSON.parse(filePath);
        console.log('📝 JSON 문자열에서 파싱된 경로:', filePathObj);
      } catch (e) {
        console.error('❌ JSON 파싱 실패:', e.message);
        // 파싱 실패 시 원래 문자열 사용
      }
    }

    // 파일 경로가 객체로 전달된 경우 처리
    let finalPath = filePath;
    if (typeof filePathObj === 'object') {
      finalPath = filePathObj.file_url || filePathObj.url || null;
      if (!finalPath) {
        console.error('❌ 유효하지 않은 파일 경로 객체:', filePathObj);
        return res.status(400).json({ error: '유효하지 않은 파일 경로입니다.' });
      }
    }

    console.log('✅ 원본 파일 경로:', finalPath);

    // 5-1. files 테이블에서 실제 파일 정보 조회
    try {
      // 파일명 추출 시도
      let fileNameForSearch = finalPath;
      
      // 경로에서 파일명 추출 시도
      const fileNameMatch = finalPath.match(/([^/]+)$/);
      if (fileNameMatch) {
        fileNameForSearch = fileNameMatch[1];
      }
      
      console.log('🔍 DB에서 파일 검색 (파일명):', fileNameForSearch);
      
      const { data: fileData, error: fileError } = await supabase
        .from('files')
        .select('file_url, file_name')
        .eq('post_id', postId)
        .single();

      if (fileError) {
        console.error('❌ 파일 정보 조회 실패:', fileError.message);
      } else if (fileData?.file_url) {
        console.log('✅ DB에서 파일 정보 찾음:', fileData);
        finalPath = fileData.file_url;
      }
    } catch (error) {
      console.error('❌ 파일 정보 조회 중 오류:', error.message);
    }

    // 6. 파일 경로 처리
    const bucketName = 'uploads';  // 버킷 이름 추가
    let pathWithoutBucket = finalPath;
    
    // uploads/ 접두사가 없는 경우 추가
    if (!pathWithoutBucket.startsWith('uploads/')) {
      pathWithoutBucket = `uploads/${pathWithoutBucket}`;
    }
    
    console.log('📂 처리된 파일 경로:', {
      원본경로: finalPath,
      처리된경로: pathWithoutBucket,
      버킷: bucketName
    });

    // 7. 파일 존재 확인
    try {
      // 폴더 경로와 파일명 분리
      const lastSlashIndex = pathWithoutBucket.lastIndexOf('/');
      const folderPath = lastSlashIndex >= 0 ? pathWithoutBucket.slice(0, lastSlashIndex) : '';
      const fileName = lastSlashIndex >= 0 ? pathWithoutBucket.slice(lastSlashIndex + 1) : pathWithoutBucket;
      
      console.log('📂 경로 분석:', { 폴더경로: folderPath, 파일명: fileName });
      
      // Supabase Storage에서 파일 목록 확인
      const { data: fileList, error: listError } = await supabase.storage
        .from(bucketName)
        .list(folderPath);
        
      if (listError) {
        console.error('❌ 폴더 내 파일 목록 조회 실패:', listError);
        
        // 목록 조회 실패 시 파일 직접 조회 시도
        const { data: fileData, error: fileError } = await supabase.storage
          .from(bucketName)
          .download(pathWithoutBucket);
          
        if (fileError) {
          console.error('❌ 파일 직접 조회 실패:', fileError);
          
          if (folderPath) {
            // 상위 폴더 목록 조회 시도
            const parentFolder = folderPath.split('/').slice(0, -1).join('/');
            console.log('🔍 상위 폴더 조회 시도:', parentFolder);
            
            const { data: parentList, error: parentError } = await supabase.storage
              .from(bucketName)
              .list(parentFolder);
              
            if (!parentError && parentList.length > 0) {
              console.log('📋 상위 폴더 내 파일 목록:', parentList.map(f => 
                f.id ? f.name : `${f.name}/`));
            }
          }
        } else {
          console.log('✅ 파일 직접 다운로드 성공');
        }
      } else {
        console.log('📋 폴더 내 파일 목록:', fileList.map(f => f.name));
        // 파일이 존재하는지 확인
        if (!fileList.some(f => f.name === fileName)) {
          console.log('⚠️ 파일이 목록에 없습니다. 대체 파일을 시도합니다.');
          // 대체 파일 검색 (비슷한 이름의 파일 찾기)
          const similarFiles = fileList.filter(f => 
            f.name.includes(fileName.split('_').pop()) || // 원본 파일명 부분만으로 검색
            fileName.includes(f.name.split('_').pop())   // 또는 목록의 파일명 원본 부분이 일치
          );
          
          if (similarFiles.length > 0) {
            console.log('✅ 비슷한 이름의 파일 발견:', similarFiles[0].name);
            pathWithoutBucket = folderPath ? `${folderPath}/${similarFiles[0].name}` : similarFiles[0].name;
          }
        }
      }
      
      // 마지막으로 파일 실제 존재 확인
      console.log('🔍 파일 존재 확인 최종 시도:', pathWithoutBucket);
      const { data: headData, error: headError } = await supabase.storage
        .from(bucketName)
        .download(pathWithoutBucket, {
          transform: {
            size: 10 // 헤더만 가져와서 존재 여부 확인
          }
        });
        
      if (headError) {
        console.error('❌ 파일 최종 확인 실패:', headError);
        if (headError.message?.includes('Object not found')) {
          console.log('⚠️ 파일을 찾을 수 없습니다. 경로:', pathWithoutBucket);
        }
      } else {
        console.log('✅ 파일 존재 확인 성공');
      }
    } catch (error) {
      console.error('❌ 파일 존재 확인 중 오류:', error.message);
    }

    // 8. 다운로드 URL 생성 전략
    // 먼저 공개 URL 시도 (가장 안정적)
    console.log('🔗 공개 URL 생성 시도:', pathWithoutBucket);
    const publicUrlResult = supabase.storage
      .from(bucketName)
      .getPublicUrl(pathWithoutBucket);
      
    if (publicUrlResult?.data?.publicUrl) {
      console.log('✅ 공개 URL 생성 성공:', publicUrlResult.data.publicUrl.substring(0, 50) + '...');
      
      // 다운로드 카운트 증가 - 항상 실행
      try {
        // 다운로드 카운트 업데이트
        const { data: updateData, error: updateError } = await supabase
          .from('posts')
          .update({ downloads: (post.downloads || 0) + 1 })
          .eq('id', postId);
          
        if (updateError) {
          console.error('❌ 다운로드 카운트 업데이트 실패:', updateError);
        } else {
          console.log('✅ 다운로드 카운트 업데이트 성공:', (post.downloads || 0) + 1);
        }
      } catch (countError) {
        console.error('❌ 다운로드 카운트 업데이트 오류:', countError);
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
        let alternativePath = pathWithoutBucket.split('/').pop(); // 파일명만 사용
        console.log('🔄 대체 경로 시도 (파일명만):', alternativePath);
        
        // 파일명만으로 공개 URL 시도
        const altResult = supabase.storage
          .from(bucketName)
          .getPublicUrl(alternativePath);
          
        if (altResult?.data?.publicUrl) {
          console.log('✅ 대체 경로로 공개 URL 생성 성공');
          
          // 다운로드 카운트 증가
          try {
            await supabase
              .from('posts')
              .update({ downloads: (post.downloads || 0) + 1 })
              .eq('id', postId);
          } catch (updateError) {
            console.error('❌ 다운로드 카운트 업데이트 실패:', updateError.message);
          }
          
          return res.status(200).json({ url: altResult.data.publicUrl });
        }
        
        throw error;
      }
      
      if (!data?.signedUrl) throw new Error('서명된 URL을 생성할 수 없습니다.');
      
      // 다운로드 카운트 증가
      try {
        await supabase
          .from('posts')
          .update({ downloads: (post.downloads || 0) + 1 })
          .eq('id', postId);
      } catch (updateError) {
        console.error('❌ 다운로드 카운트 업데이트 실패:', updateError.message);
      }

      console.log('✅ 다운로드 URL 생성 성공:', data.signedUrl.substring(0, 50) + '...');
      return res.status(200).json({ url: data.signedUrl });
    } catch (error) {
      console.error('❌ 다운로드 URL 생성 실패:', error.message);
      
      // 마지막 시도: 원본 저장소 직접 접근
      // Supabase 프로젝트 호스트명을 추출하여 직접 URL 생성
      try {
        // 프로젝트 기본 URL 추출
        const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        if (projectUrl) {
          // 첫 번째 시도: 정상 경로
          let storageUrl = `${projectUrl}/storage/v1/object/public/${bucketName}/${pathWithoutBucket}`;
          
          // URL에 이중 슬래시가 있는지 확인하고 수정
          storageUrl = storageUrl.replace(/([^:])\/\//g, '$1/');
          
          console.log('⚠️ 직접 스토리지 URL 시도 (1):', storageUrl);
          
          // 두 번째 시도: uploads 접두사 추가 (만약 처리 과정에서 제거되었다면)
          let alternativeUrl = `${projectUrl}/storage/v1/object/public/${bucketName}/uploads/${pathWithoutBucket}`;
          alternativeUrl = alternativeUrl.replace(/([^:])\/\//g, '$1/');
          
          console.log('⚠️ 직접 스토리지 URL 시도 (2):', alternativeUrl);
          
          // 세 번째 시도: 파일명만 사용
          const fileNameOnly = pathWithoutBucket.split('/').pop();
          let fileNameUrl = `${projectUrl}/storage/v1/object/public/${bucketName}/${fileNameOnly}`;
          fileNameUrl = fileNameUrl.replace(/([^:])\/\//g, '$1/');
          
          console.log('⚠️ 직접 스토리지 URL 시도 (3):', fileNameUrl);
          
          // 다운로드 카운트 업데이트 시도
          try {
            const { data: updateData, error: updateError } = await supabase
              .from('posts')
              .update({ downloads: (post.downloads || 0) + 1 })
              .eq('id', postId);
              
            if (updateError) {
              console.error('❌ 다운로드 카운트 업데이트 실패:', updateError);
            } else {
              console.log('✅ 다운로드 카운트 업데이트 성공:', (post.downloads || 0) + 1);
            }
          } catch (countError) {
            console.error('❌ 다운로드 카운트 업데이트 오류:', countError);
          }
          
          // 모든 URL을 반환하여 클라이언트가 시도할 수 있도록 함
          return res.status(200).json({ 
            url: storageUrl,
            alternativeUrls: [alternativeUrl, fileNameUrl]
          });
        }
      } catch (finalError) {
        console.error('❌ 최종 URL 생성 시도 실패:', finalError);
      }
      
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
