import { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type AuthState = 'loading' | 'authenticated' | 'unauthenticated';

export function useAuthSession() {
  const [state, setState] = useState<AuthState>('loading');
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!supabase) {
      setState('unauthenticated');
      return;
    }

    // Initial session check
    supabase.auth.getSession().then(({ data }) => {
      const s = data.session ?? null;
      setSession(s);
      setState(s ? 'authenticated' : 'unauthenticated');
    });

    // Listen for auth state changes (magic link callback, sign-out, token refresh)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setState(s ? 'authenticated' : 'unauthenticated');
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return { state, session };
}
