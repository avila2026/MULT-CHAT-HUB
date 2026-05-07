---
name: client-localstorage-persistence
description: Use quando precisar persistir state de React/SPA em localStorage com fallback automático de truncamento (FIFO em listas) quando exceder o limite de 5MB do navegador.
allowed-tools: Read, Write, Edit
---

# client-localstorage-persistence

Helper genérico tipado para persistir state em `localStorage` com:

- Carregamento seguro em try/catch (lida com `localStorage` indisponível em modo privado/SSR).
- Truncamento opcional via callback quando o JSON serializado excede limite configurável (default 4MB para deixar margem em relação ao limite usual de 5MB).

## API

```ts
type StorageOptions<T> = {
  /** Limite em bytes do JSON serializado. Default: 4_000_000. */
  maxBytes?: number;
  /** Callback para reduzir o state quando exceder maxBytes. Recebe o state e retorna versão menor. */
  truncate?: (state: T) => T;
};

function createLocalStorageStore<T>(
  key: string,
  opts?: StorageOptions<T>
): {
  load: () => Partial<T>;
  save: (state: T) => void;
  clear: () => void;
};
```

## Source

```ts
// client-localstorage-persistence.ts
const DEFAULT_MAX_BYTES = 4_000_000;

export function createLocalStorageStore<T>(
  key: string,
  opts: { maxBytes?: number; truncate?: (state: T) => T } = {},
) {
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;

  function load(): Partial<T> {
    try {
      if (typeof localStorage === 'undefined') return {};
      const raw = localStorage.getItem(key);
      if (!raw) return {};
      return JSON.parse(raw) as Partial<T>;
    } catch {
      return {};
    }
  }

  function save(state: T): void {
    try {
      if (typeof localStorage === 'undefined') return;
      let toSave: T = state;
      let serialized = JSON.stringify(toSave);
      if (serialized.length > maxBytes && opts.truncate) {
        toSave = opts.truncate(toSave);
        serialized = JSON.stringify(toSave);
      }
      localStorage.setItem(key, serialized);
    } catch {
      // localStorage cheio ou indisponível — falha silenciosa.
    }
  }

  function clear(): void {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.removeItem(key);
    } catch { /* noop */ }
  }

  return { load, save, clear };
}
```

## Uso em React

```tsx
import { useState, useEffect } from 'react';
import { createLocalStorageStore } from './client-localstorage-persistence';

interface AppState {
  messages: Array<{ id: number; text: string }>;
  channels: string[];
}

const store = createLocalStorageStore<AppState>('myapp:v1', {
  maxBytes: 4_000_000,
  // Mantém apenas as 100 mensagens mais recentes se exceder
  truncate: (s) => ({ ...s, messages: s.messages.slice(-100) }),
});

function App() {
  const persisted = store.load();
  const [messages, setMessages] = useState(persisted.messages ?? []);
  const [channels, setChannels] = useState(persisted.channels ?? []);

  useEffect(() => {
    store.save({ messages, channels });
  }, [messages, channels]);

  // ...
}
```

## Adaptation hints

- **Compatibilidade SSR (Next.js)**: as guards `typeof localStorage === 'undefined'` já protegem contra execução no servidor. Em Next.js, garantir que `load()` rode dentro de `useEffect` (não no SSR).
- **Versioning do schema**: ao mudar o formato de `T`, incrementar o `key` (ex: `'myapp:v1' → 'myapp:v2'`) ou implementar migração no `load()`:
  ```ts
  function load() {
    const raw = JSON.parse(localStorage.getItem(key) || '{}');
    if (raw.version !== 2) return migrate(raw);
    return raw;
  }
  ```
- **Compressão**: para datasets grandes (>1MB), considerar `lz-string` antes do `JSON.stringify`. Reduz ~50%.
- **IndexedDB**: para state com muitos MBs, prefira `idb-keyval` (~1KB gzip) em vez de localStorage.
- **Multi-tab sync**: ouça `window.addEventListener('storage', ...)` para sincronizar abas abertas do mesmo app.

## Origin

Extraída de [`src/context/ChatContext.tsx`](https://github.com/avila2026/MULT-CHAT-HUB/blob/main/src/context/ChatContext.tsx), funções `loadPersisted` e `persistState` (linhas ~80-103). Refactor leve para tornar genérico em `<T>`.
