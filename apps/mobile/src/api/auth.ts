import AsyncStorage from '@react-native-async-storage/async-storage';
import { env } from '../lib/env';
import { supabase } from '../lib/supabase';

const FALLBACK_ACCESS_TOKEN_KEY = 'niche.mobile.auth.access-token';

export async function getAccessToken() {
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    const sessionToken = data.session?.access_token;

    if (sessionToken) {
      return sessionToken;
    }
  }

  const storedToken = await AsyncStorage.getItem(FALLBACK_ACCESS_TOKEN_KEY);
  return storedToken ?? null;
}

export async function setTemporaryAccessToken(token = env.devAccessToken) {
  await AsyncStorage.setItem(FALLBACK_ACCESS_TOKEN_KEY, token);
}

export async function clearTemporaryAccessToken() {
  await AsyncStorage.removeItem(FALLBACK_ACCESS_TOKEN_KEY);
}
