import { NextResponse } from 'next/server';
import { createServerClient } from '../../../lib/supabase-server';

export async function GET() {
  const t0 = Date.now();
  try {
    const db = createServerClient();
    const { error } = await db.from('conversations').select('id').limit(1);
    if (error) {
      return NextResponse.json(
        { status: 'degraded', supabase: 'error', detail: error.message, checkMs: Date.now() - t0 },
        { status: 503 }
      );
    }
    return NextResponse.json({ status: 'ok', supabase: 'ok', checkMs: Date.now() - t0 });
  } catch (err) {
    return NextResponse.json(
      { status: 'error', detail: err instanceof Error ? err.message : String(err), checkMs: Date.now() - t0 },
      { status: 500 }
    );
  }
}
