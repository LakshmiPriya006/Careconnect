import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

let supabaseClient: ReturnType<typeof createSupabaseClient> | null = null;

export function createClient() {
  if (!supabaseClient) {
    const supabaseUrl = `https://${projectId}.supabase.co`;
    
    // Debug logging (dev only) - masked for security
    if (typeof window !== 'undefined' && (import.meta as any)?.env?.DEV) {
      console.log('🔧 [DEBUG] Creating Supabase client...');
      console.log('🔧 [DEBUG] Project ID:', projectId);
      console.log('🔧 [DEBUG] Supabase URL:', supabaseUrl);
      console.log('🔧 [DEBUG] Anon Key (preview):', publicAnonKey?.slice(0, 8) + '...' + publicAnonKey?.slice(-8));
    }
    
    supabaseClient = createSupabaseClient(
      supabaseUrl,
      publicAnonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        },
      }
    );
    
    if (typeof window !== 'undefined' && (import.meta as any)?.env?.DEV) {
      console.log('✅ [DEBUG] Supabase client created successfully');
    }
  }
  return supabaseClient;
}
