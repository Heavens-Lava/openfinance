import { createClient } from '@supabase/supabase-js';
import { IS_MACYFINANCE_VARIANT, MACY_LOGIN_EMAIL } from './appConfig.js';

const url = import.meta.env.VITE_SUPABASE_URL || '';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const cloudConfigured = Boolean(
  IS_MACYFINANCE_VARIANT && url && anonKey && MACY_LOGIN_EMAIL,
);

// The anon key is intentionally public. Access to finance data is enforced by
// Supabase Auth and the Storage RLS policies in supabase/macyfinance.sql.
export const supabase = cloudConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;

export async function signInWithPassword(password) {
  if (!supabase) throw new Error('MacyFinance cloud access is not configured.');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: MACY_LOGIN_EMAIL,
    password,
  });
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut();
}

export async function getSession() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function onAuthStateChange(callback) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}
