import { createServerClient } from '../lib/supabase-server';
import type { Database } from '../lib/database.types';

type ConversationRow = Database['public']['Tables']['conversations']['Row'];

async function getConversations() {
  try {
    const db = createServerClient();
    const { data, error } = await db
      .from('conversations')
      .select('id, title, agent_name, updated_at')
      .order('updated_at', { ascending: false })
      .limit(10);
    if (error) return { conversations: [], error: error.message };
    return { conversations: (data ?? []) as ConversationRow[], error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Supabase não configurado';
    return { conversations: [] as ConversationRow[], error: msg };
  }
}

export default async function Home() {
  const { conversations, error } = await getConversations();

  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '0.25rem' }}>MULT-CHAT-HUB Cloud</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>Plataforma de agentes multi-IA com persistência Supabase</p>

      <section>
        <h2>Conversas recentes</h2>
        {error && (
          <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
            <strong>⚠ Supabase não conectado:</strong> {error}
            <br />
            <small>Configure <code>NEXT_PUBLIC_SUPABASE_URL</code> e <code>SUPABASE_SERVICE_ROLE_KEY</code> no <code>.env.local</code>.</small>
          </div>
        )}
        {!error && conversations.length === 0 && (
          <p style={{ color: '#888' }}>Nenhuma conversa ainda. Execute a migration SQL e comece a conversar.</p>
        )}
        {conversations.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {conversations.map((c) => (
              <li key={c.id} style={{ borderBottom: '1px solid #eee', padding: '0.75rem 0' }}>
                <strong>{c.title}</strong>
                <span style={{ color: '#888', fontSize: '0.85rem', marginLeft: '0.5rem' }}>— {c.agent_name}</span>
                <span style={{ color: '#aaa', fontSize: '0.8rem', float: 'right' }}>
                  {new Date(c.updated_at).toLocaleString('pt-BR')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ marginTop: '2rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
        <h3>API disponível</h3>
        <ul style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
          <li><code>GET /api/health</code> — status Supabase</li>
          <li><code>GET /api/conversations</code> — listar conversas</li>
          <li><code>POST /api/conversations</code> — criar conversa</li>
        </ul>
      </section>
    </main>
  );
}
