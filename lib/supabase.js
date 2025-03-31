import { createClient } from '@supabase/supabase-js';

// .env.local에서 Supabase URL과 API 키를 가져옵니다.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// ✅ 세션 지속 + 토큰 자동 갱신 설정 추가!
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'springdalemusic-auth',
    storage: {
      getItem: (key) => {
        if (typeof window !== 'undefined') {
          return localStorage.getItem(key);
        }
        return null;
      },
      setItem: (key, value) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem(key, value);
        }
      },
      removeItem: (key) => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(key);
        }
      },
    },
  },
  global: {
    headers: {
      'x-client-info': 'springdalemusic',
    },
  },
  db: {
    schema: 'public',
  },
  realtime: {
    timeout: 30000, // 30초로 증가
  },
  // 연결 설정 추가
  connection: {
    pool: {
      min: 1,
      max: 10,
      idleTimeoutMillis: 30000,
    },
    retry: {
      maxRetries: 3,
      retryDelay: 1000,
    },
  },
});

export const createClient = () => createClient(supabaseUrl, supabaseAnonKey);

// 재시도 로직이 포함된 쿼리 실행 함수
export async function executeQuery(query, maxRetries = 3, isInitialConnection = false) {
  let lastError = null;
  const timeout = isInitialConnection ? 10000 : 5000; // 초기 연결 시 10초, 그 외 5초

  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`쿼리 시도 ${i + 1}/${maxRetries} (타임아웃: ${timeout}ms)`);
      
      // 연결 상태 확인
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.warn('인증 상태 확인 실패:', authError.message);
      }

      const result = await Promise.race([
        query(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`쿼리 타임아웃 (${timeout}ms)`)), timeout)
        )
      ]);
      return result;
    } catch (err) {
      console.error(`시도 ${i + 1}/${maxRetries} 실패:`, err.message);
      lastError = err;
      
      if (i < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, i), 5000);
        console.log(`${delay}ms 대기 후 재시도...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('모든 시도 실패');
}

// 재시도 로직이 포함된 스토리지 URL 생성 함수
export async function createSignedUrl(bucket, filePath, expiresIn = 60) {
  const maxRetries = 3;
  let lastError = null;

  // 파일 경로 정리
  const cleanPath = filePath?.replace(/^uploads\//, '').replace(/^thumbnails\//, '').replace(/^avatars\//, '');
  
  console.log('=== createSignedUrl 디버그 정보 ===');
  console.log('버킷:', bucket);
  console.log('원본 경로:', filePath);
  console.log('정리된 경로:', cleanPath);
  console.log('만료 시간:', expiresIn);
  console.log('============================');

  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`시도 ${i + 1}/${maxRetries}: ${bucket}/${cleanPath}`);
      
      // 파일 존재 여부 확인
      const { data: fileExists, error: checkError } = await Promise.race([
        supabase.storage
          .from(bucket)
          .getPublicUrl(cleanPath),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('파일 존재 확인 타임아웃')), 10000)
        )
      ]);

      if (checkError) {
        console.error('파일 존재 확인 실패:', checkError);
        throw checkError;
      }

      if (!fileExists?.publicUrl) {
        throw new Error('파일을 찾을 수 없습니다.');
      }

      // 서명된 URL 생성
      const { data, error } = await Promise.race([
        supabase.storage
          .from(bucket)
          .createSignedUrl(cleanPath, expiresIn),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('URL 생성 타임아웃')), 10000)
        )
      ]);

      if (error) {
        console.error(`시도 ${i + 1} 실패:`, error.message);
        throw error;
      }
      
      if (data?.signedUrl) {
        console.log(`성공: ${data.signedUrl}`);
        return { data, error: null };
      }
      
    } catch (err) {
      console.error(`시도 ${i + 1}/${maxRetries} 실패:`, err.message);
      lastError = err;
      
      if (i < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, i), 5000);
        console.log(`${delay}ms 대기 후 재시도...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.error('모든 시도 실패:', lastError);
  return { data: null, error: lastError };
}

// RLS 정책 설정 함수
export async function setupRLSPolicies() {
  try {
    // Storage 버킷 RLS 정책
    const { error: storagePolicyError } = await supabase.rpc('create_storage_policy', {
      policy_name: 'storage_policy',
      bucket_name: 'uploads',
      policy: `
        CREATE POLICY "Storage access policy"
        ON storage.objects
        FOR ALL
        USING (
          bucket_id = 'uploads' AND (
            -- 비로그인 사용자
            (auth.role() = 'anon' AND EXISTS (
              SELECT 1 FROM posts p
              WHERE p.download_permission = 'guest'
            ))
            OR
            -- 로그인한 사용자
            (auth.role() = 'authenticated' AND EXISTS (
              SELECT 1 FROM posts p, users u
              WHERE p.download_permission = u.role
              AND u.id = auth.uid()
            ))
          )
        );
      `
    });

    if (storagePolicyError) {
      console.error('Storage 정책 설정 실패:', storagePolicyError);
    }

    // Posts 테이블 RLS 정책
    const { error: postsPolicyError } = await supabase.rpc('create_table_policy', {
      policy_name: 'posts_policy',
      table_name: 'posts',
      policy: `
        CREATE POLICY "Posts access policy"
        ON posts
        FOR ALL
        USING (
          -- 모든 사용자가 조회 가능
          true
        )
        WITH CHECK (
          -- 게시글 작성/수정/삭제 권한
          EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND (
              -- verified_user는 자신의 게시글만 수정/삭제 가능
              (u.role = 'verified_user' AND posts.user_id = auth.uid())
              OR
              -- admin은 모든 게시글 수정/삭제 가능
              u.role = 'admin'
            )
          )
        );
      `
    });

    if (postsPolicyError) {
      console.error('Posts 정책 설정 실패:', postsPolicyError);
    }

    // Comments 테이블 RLS 정책
    const { error: commentsPolicyError } = await supabase.rpc('create_table_policy', {
      policy_name: 'comments_policy',
      table_name: 'comments',
      policy: `
        CREATE POLICY "Comments access policy"
        ON comments
        FOR ALL
        USING (
          -- 모든 사용자가 조회 가능
          true
        )
        WITH CHECK (
          -- 댓글 작성/수정/삭제 권한
          EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND (
              -- user, verified_user는 자신의 댓글만 수정/삭제 가능
              (u.role IN ('user', 'verified_user') AND comments.user_id = auth.uid())
              OR
              -- admin은 모든 댓글 수정/삭제 가능
              u.role = 'admin'
            )
          )
        );
      `
    });

    if (commentsPolicyError) {
      console.error('Comments 정책 설정 실패:', commentsPolicyError);
    }

    // Users 테이블 RLS 정책
    const { error: usersPolicyError } = await supabase.rpc('create_table_policy', {
      policy_name: 'users_policy',
      table_name: 'users',
      policy: `
        CREATE POLICY "Users access policy"
        ON users
        FOR ALL
        USING (
          -- 자신의 데이터만 조회 가능
          auth.uid() = id
        )
        WITH CHECK (
          -- admin만 수정 가능
          EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
          )
        );
      `
    });

    if (usersPolicyError) {
      console.error('Users 정책 설정 실패:', usersPolicyError);
    }

    console.log('RLS 정책 설정 완료');
  } catch (error) {
    console.error('RLS 정책 설정 중 오류:', error);
  }
}