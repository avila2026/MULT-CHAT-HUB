import { createClient } from '@supabase/supabase-js';

// Client com service role — uso exclusivo em Route Handlers e Server Actions
// NUNCA importar em Client Components
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios no servidor.');
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
