import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// 👇 여기 추가!
export const executeQuery = async (queryFn) => {
  try {
    const { data, error } = await queryFn();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('❌ executeQuery 에러:', err.message);
    throw err;
  }
};

export const setupRLSPolicies = async () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.');
  }

  const adminClient = createClient(supabaseUrl, serviceKey);

  // RLS 정책 설정
  const policies = [
    {
      table: 'posts',
      policies: [
        {
          name: 'Enable read access for all users',
          definition: 'CREATE POLICY "Enable read access for all users" ON posts FOR SELECT USING (true)',
        },
        {
          name: 'Enable insert for authenticated users only',
          definition: 'CREATE POLICY "Enable insert for authenticated users only" ON posts FOR INSERT WITH CHECK (auth.role() = \'authenticated\')',
        },
        {
          name: 'Enable update for users based on user_id',
          definition: 'CREATE POLICY "Enable update for users based on user_id" ON posts FOR UPDATE USING (auth.uid() = user_id)',
        },
        {
          name: 'Enable delete for users based on user_id',
          definition: 'CREATE POLICY "Enable delete for users based on user_id" ON posts FOR DELETE USING (auth.uid() = user_id)',
        },
      ],
    },
    {
      table: 'comments',
      policies: [
        {
          name: 'Enable read access for all users',
          definition: 'CREATE POLICY "Enable read access for all users" ON comments FOR SELECT USING (true)',
        },
        {
          name: 'Enable insert for authenticated users only',
          definition: 'CREATE POLICY "Enable insert for authenticated users only" ON comments FOR INSERT WITH CHECK (auth.role() = \'authenticated\')',
        },
        {
          name: 'Enable update for users based on user_id',
          definition: 'CREATE POLICY "Enable update for users based on user_id" ON comments FOR UPDATE USING (auth.uid() = user_id)',
        },
        {
          name: 'Enable delete for users based on user_id',
          definition: 'CREATE POLICY "Enable delete for users based on user_id" ON comments FOR DELETE USING (auth.uid() = user_id)',
        },
      ],
    },
  ];

  for (const { table, policies: tablePolicies } of policies) {
    for (const policy of tablePolicies) {
      try {
        await adminClient.rpc('create_policy', {
          table_name: table,
          policy_name: policy.name,
          policy_definition: policy.definition,
        });
      } catch (error) {
        if (!error.message.includes('already exists')) {
          throw error;
        }
      }
    }
  }
};
