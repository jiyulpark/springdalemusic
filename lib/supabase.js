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
    timeout: 20000, // 20초
  },
});

// 재시도 로직이 포함된 스토리지 URL 생성 함수
export async function createSignedUrl(bucket, filePath, expiresIn = 60) {
  const maxRetries = 3;
  let lastError = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, expiresIn);

      if (error) throw error;
      if (data?.signedUrl) return { data, error: null };
      
    } catch (err) {
      console.log(`시도 ${i + 1}/${maxRetries} 실패:`, err.message);
      lastError = err;
      // 마지막 시도가 아니면 잠시 대기
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  return { data: null, error: lastError };
}

// RLS 정책 설정 함수
export async function setupRLSPolicies() {
  try {
    // Storage 버킷 RLS 정책
    const { error: storagePolicyError } = await supabase.rpc('create_storage_policy', {
      policy_name: 'role_based_download_policy',
      bucket_name: 'uploads',
      policy: `
        CREATE POLICY "Role based download policy"
        ON storage.objects FOR SELECT
        USING (
          bucket_id = 'uploads' AND (
            -- 비로그인 사용자 (guest)
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
      policy_name: 'role_based_posts_policy',
      table_name: 'posts',
      policy: `
        CREATE POLICY "Role based posts policy"
        ON posts
        USING (
          -- 모든 사용자가 조회 가능
          true
        )
        WITH CHECK (
          -- 게시글 작성은 verified_user와 admin만 가능
          EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role IN ('verified_user', 'admin')
          )
        );
      `
    });

    if (postsPolicyError) {
      console.error('Posts 정책 설정 실패:', postsPolicyError);
    }

    // Comments 테이블 RLS 정책
    const { error: commentsPolicyError } = await supabase.rpc('create_table_policy', {
      policy_name: 'role_based_comments_policy',
      table_name: 'comments',
      policy: `
        CREATE POLICY "Role based comments policy"
        ON comments
        USING (
          -- 모든 사용자가 조회 가능
          true
        )
        WITH CHECK (
          -- 댓글 작성은 user, verified_user, admin만 가능
          EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role IN ('user', 'verified_user', 'admin')
          )
        );
      `
    });

    if (commentsPolicyError) {
      console.error('Comments 정책 설정 실패:', commentsPolicyError);
    }

    // Users 테이블 RLS 정책
    const { error: usersPolicyError } = await supabase.rpc('create_table_policy', {
      policy_name: 'role_based_users_policy',
      table_name: 'users',
      policy: `
        CREATE POLICY "Role based users policy"
        ON users
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