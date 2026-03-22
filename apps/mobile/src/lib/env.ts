import { Platform } from 'react-native';

const expoPublicApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const expoPublicSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const expoPublicSupabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
const expoPublicDevAccessToken = process.env.EXPO_PUBLIC_DEV_ACCESS_TOKEN?.trim();

// 웹 브라우저에서 실행 시 device IP 대신 localhost로 교체 (개발 전용)
function resolveApiBaseUrl(raw: string | undefined): string | null {
  if (!raw || raw.length === 0) return null;
  if (Platform.OS === 'web') {
    try {
      const url = new URL(raw);
      return `${url.protocol}//localhost:${url.port}`;
    } catch {
      return raw;
    }
  }
  return raw;
}

export const env = {
  apiBaseUrl: resolveApiBaseUrl(expoPublicApiBaseUrl),
  supabaseUrl:
    expoPublicSupabaseUrl && expoPublicSupabaseUrl.length > 0 ? expoPublicSupabaseUrl : null,
  supabaseAnonKey:
    expoPublicSupabaseAnonKey && expoPublicSupabaseAnonKey.length > 0
      ? expoPublicSupabaseAnonKey
      : null,
  devAccessToken:
    expoPublicDevAccessToken && expoPublicDevAccessToken.length > 0
      ? expoPublicDevAccessToken
      : 'niche-mobile-dev-user',
} as const;
