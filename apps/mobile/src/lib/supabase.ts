import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { env } from './env';

export const supabase =
  env.supabaseUrl && env.supabaseAnonKey
    ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          // web에서는 URL hash의 access_token을 파싱해야 Magic Link가 작동함
          detectSessionInUrl: Platform.OS === 'web',
        },
      })
    : null;
