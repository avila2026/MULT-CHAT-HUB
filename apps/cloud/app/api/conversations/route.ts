import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '../../../lib/supabase-server';
import type { Database } from '../../../lib/database.types';

type ConversationRow = Database['public']['Tables']['conversations']['Row'];

export async function GET() {
  const db = createServerClient();
  const { data, error } = await db
    .from('conversations')
    .select('id, title, agent_name, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json((data ?? []) as ConversationRow[]);
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { title?: string; agent_name?: string };
  const title = body.title?.trim() || 'Nova conversa';
  const agent_name = body.agent_name?.trim() || 'Agente Geral';

  const db = createServerClient();
  const { data, error } = await db
    .from('conversations')
    .insert([{ title, agent_name }])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data as ConversationRow, { status: 201 });
}
