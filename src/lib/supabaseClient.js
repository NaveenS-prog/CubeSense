import { createClient } from '@supabase/supabase-js';

// Retrieve credentials from environment variables or localStorage fallback
const getEnvOrStorage = (envKey, storageKey) => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[envKey]) {
    return import.meta.env[envKey];
  }
  try {
    return localStorage.getItem(storageKey) || '';
  } catch {
    return '';
  }
};

const DEFAULT_SUPABASE_URL = 'https://wavykrfrqsqzvthvjnpt.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_8sKDHSZm7U7wVPfu7ODRXg_gyZ_Pn4Z';

const supabaseUrl = getEnvOrStorage('VITE_SUPABASE_URL', 'cubesense_supabase_url') || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = getEnvOrStorage('VITE_SUPABASE_ANON_KEY', 'cubesense_supabase_anon_key') || DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('your-project-ref')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
    })
  : null;

export function configureSupabaseCredentials(url, key) {
  try {
    if (url && key) {
      localStorage.setItem('cubesense_supabase_url', url.trim());
      localStorage.setItem('cubesense_supabase_anon_key', key.trim());
      window.location.reload();
      return true;
    }
  } catch (err) {
    console.error('Failed to save Supabase credentials:', err);
  }
  return false;
}

