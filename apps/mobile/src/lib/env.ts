const expoPublicApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const expoPublicSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const expoPublicSupabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
const expoPublicDevAccessToken = process.env.EXPO_PUBLIC_DEV_ACCESS_TOKEN?.trim();

export const env = {
  apiBaseUrl: expoPublicApiBaseUrl && expoPublicApiBaseUrl.length > 0 ? expoPublicApiBaseUrl : null,
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
