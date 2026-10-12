// Adaptadores LLM para o servidor Express (apps/lite).
// Espelha a interface de @mch/provider-adapters — quando o workspace
// estiver com pnpm install completo, este arquivo pode ser substituído
// por um import direto do pacote.

export type ProviderName = 'ollama' | 'openai' | 'anthropic' | 'gemini' | 'openrouter' | 'llamacpp';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AdapterChatParams {
  messages: ChatMessage[];
  model: string;
  maxTokens: number;
  apiKey?: string;
  baseUrl?: string;
  signal?: AbortSignal;
}

export interface ProviderAdapter {
  readonly name: ProviderName;
  chat(params: AdapterChatParams): Promise<string>;
}

export const DEFAULT_MODELS: Record<ProviderName, string> = {
  ollama:     'fazendaavila2026/avila:latest',
  openai:     'gpt-4o-mini',
  anthropic:  'claude-haiku-4-5-20251001',
  gemini:     'gemini-2.0-flash-lite',
  openrouter: 'openai/gpt-4o-mini',
  llamacpp:   'local-model',
};

export const PROVIDER_LABELS: Record<ProviderName, string> = {
  ollama:     'Ollama',
  openai:     'OpenAI',
  anthropic:  'Anthropic',
  gemini:     'Gemini',
  openrouter: 'OpenRouter',
  llamacpp:   'llama.cpp',
};

export const NEEDS_API_KEY: Record<ProviderName, boolean> = {
  ollama:     false,
  openai:     true,
  anthropic:  true,
  gemini:     true,
  openrouter: true,
  llamacpp:   false,
};

export const PROVIDER_ORDER: ProviderName[] = ['ollama', 'openai', 'anthropic', 'gemini', 'openrouter', 'llamacpp'];

// Anthropic and Gemini require messages to strictly alternate user/assistant
// and the first non-system message must be 'user'. This merges consecutive
// same-role messages and drops any leading assistant messages.
function normalizeConversation(messages: { role: 'user' | 'assistant'; content: string }[]): { role: 'user' | 'assistant'; content: string }[] {
  const merged: { role: 'user' | 'assistant'; content: string }[] = [];
  for (const msg of messages) {
    const last = merged[merged.length - 1];
    if (last && last.role === msg.role) {
      last.content = last.content + '\n' + msg.content;
    } else {
      merged.push({ role: msg.role, content: msg.content });
    }
  }
  // Drop leading assistant messages — APIs require first message to be 'user'
  while (merged.length > 0 && merged[0].role !== 'user') {
    merged.shift();
  }
  return merged;
}

// ── Ollama ────────────────────────────────────────────────────────────────────

class OllamaAdapter implements ProviderAdapter {
  readonly name: ProviderName = 'ollama';

  async chat({ messages, model, maxTokens, baseUrl = 'http://localhost:11434', signal }: AdapterChatParams): Promise<string> {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: false, options: { num_predict: maxTokens } }),
      signal,
    });
    if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
    const data = await res.json() as { message?: { content?: string } };
    return data.message?.content ?? 'Sem resposta do modelo.';
  }
}

// ── OpenAI ────────────────────────────────────────────────────────────────────

class OpenAIAdapter implements ProviderAdapter {
  readonly name: ProviderName = 'openai';

  async chat({ messages, model, maxTokens, apiKey = '', signal }: AdapterChatParams): Promise<string> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
      signal,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(`OpenAI ${res.status}: ${err.error?.message ?? res.statusText}`);
    }
    const data = await res.json() as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content ?? 'Sem resposta.';
  }
}

// ── Anthropic ─────────────────────────────────────────────────────────────────

class AnthropicAdapter implements ProviderAdapter {
  readonly name: ProviderName = 'anthropic';

  async chat({ messages, model, maxTokens, apiKey = '', signal }: AdapterChatParams): Promise<string> {
    const systemMsg = messages.find((m) => m.role === 'system')?.content ?? '';
    const convMessages = normalizeConversation(
      messages.filter((m) => m.role !== 'system') as { role: 'user' | 'assistant'; content: string }[]
    );

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        ...(systemMsg ? { system: systemMsg } : {}),
        messages: convMessages,
      }),
      signal,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(`Anthropic ${res.status}: ${err.error?.message ?? res.statusText}`);
    }
    const data = await res.json() as { content?: { type: string; text: string }[] };
    return data.content?.find((b) => b.type === 'text')?.text ?? 'Sem resposta.';
  }
}

// ── Gemini ────────────────────────────────────────────────────────────────────

class GeminiAdapter implements ProviderAdapter {
  readonly name: ProviderName = 'gemini';

  async chat({ messages, model, maxTokens, apiKey = '', signal }: AdapterChatParams): Promise<string> {
    const systemMsg = messages.find((m) => m.role === 'system')?.content;
    const normalized = normalizeConversation(
      messages.filter((m) => m.role !== 'system') as { role: 'user' | 'assistant'; content: string }[]
    );
    const contents = normalized.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const body: Record<string, unknown> = {
      contents,
      generationConfig: { maxOutputTokens: maxTokens },
    };
    if (systemMsg) body['system_instruction'] = { parts: [{ text: systemMsg }] };

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal,
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(`Gemini ${res.status}: ${err.error?.message ?? res.statusText}`);
    }
    const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Sem resposta.';
  }
}

// ── OpenRouter ────────────────────────────────────────────────────────────────

class OpenRouterAdapter implements ProviderAdapter {
  readonly name: ProviderName = 'openrouter';

  async chat({ messages, model, maxTokens, apiKey = '', signal }: AdapterChatParams): Promise<string> {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost',
        'X-Title': 'MULT-CHAT-HUB',
      },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
      signal,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(`OpenRouter ${res.status}: ${err.error?.message ?? res.statusText}`);
    }
    const data = await res.json() as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content ?? 'Sem resposta.';
  }
}

// ── llama.cpp / OpenAI-compatible local server ────────────────────────────────

class LlamaCppAdapter implements ProviderAdapter {
  readonly name: ProviderName = 'llamacpp';

  async chat({ messages, model, maxTokens, apiKey = '', baseUrl = 'http://127.0.0.1:8080/v1', signal }: AdapterChatParams): Promise<string> {
    const endpoint = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) headers.Authorization = `******;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: maxTokens,
        stream: false,
      }),
      signal,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`llama.cpp ${res.status}: ${text || res.statusText}`);
    }

    const data = await res.json() as {
      choices?: { message?: { content?: string } }[];
      error?: { message?: string };
    };
    if (data.error?.message) throw new Error(`llama.cpp: ${data.error.message}`);
    return data.choices?.[0]?.message?.content ?? 'Sem resposta.';
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function createAdapter(provider: ProviderName): ProviderAdapter {
  switch (provider) {
    case 'ollama':      return new OllamaAdapter();
    case 'openai':      return new OpenAIAdapter();
    case 'anthropic':   return new AnthropicAdapter();
    case 'gemini':      return new GeminiAdapter();
    case 'openrouter':  return new OpenRouterAdapter();
    case 'llamacpp':    return new LlamaCppAdapter();
  }
}
