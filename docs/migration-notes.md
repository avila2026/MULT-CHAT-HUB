# Migration Notes — MULT-CHAT-HUB v2

Notas para quem vinha do app pré-redesign. Mudanças que **podem** afetar uso ou integração.

## UI / Componentes

| Antes | Agora |
|---|---|
| `<button className="...lots of tailwind...">` ad-hoc | `<Button variant="..." size="...">` em `src/components/ui/Button` |
| Botões só ícone com classes hard-coded e sem aria-label | `<IconButton aria-label="..." icon={<Icon/>} />` — `aria-label` agora **obrigatório por TypeScript** |
| `ManualModal` próprio com `AnimatePresence` inline | `<Modal title=... onClose=...>` reutilizável, com ESC + focus trap |
| Sidebar fixa em `w-[300px]` para todas as resoluções | Aside fixo em `>=md`, `<Drawer>` em mobile com hamburger |
| `AgentConfig` com `hidden lg:flex` | Aside fixo em `>=lg`, `<Drawer side="right">` flutuante em tablet/mobile |
| `/clear` e `/reset` apagavam dados sem confirmação | Abre `ConfirmDialog` (variant=danger) antes de executar |
| Sem feedback durante chamada `/api/chat` | Loading dots animados como mensagem temporária |

## Imports / API

- **`src/lib/analyticalEngine.ts`** continua na mesma localização (estabelecido no PR de Vercel).
- **`AnalysisChart`** é agora carregado via `React.lazy` em `ChatArea`. Se você importava diretamente em outro lugar, continue usando `import AnalysisChart from './AnalysisChart'` — só o uso interno em `ChatArea` virou lazy.
- **`ChatContext`** ganhou `isLoading: boolean`. Se você consome o context em algum componente custom, agora pode usar essa flag.
- Novos hooks em `src/hooks/`:
  - `useEscapeKey(handler, enabled?)`
  - `useFocusTrap(ref, enabled?)`
  - `useMediaQuery(query)` + `useIsMobile()` + `useIsTablet()`
  - `useDisclosure()` → `{ isOpen, open, close, toggle }`
- Novo `useConfirm()` para confirmação imperativa retornando `Promise<boolean>` (precisa estar dentro de `<ConfirmDialogProvider>`).

## CSS / Design tokens

`src/styles/tokens.css` agora é a source-of-truth de:
- Cores: `--color-primary`, `--color-accent`, `--color-fg`, etc.
- Spacing: `--space-1` a `--space-8`
- Radius: `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`, `--radius-full`
- Z-index: `--z-drawer` (30), `--z-modal-backdrop` (40), `--z-modal` (50), `--z-tooltip` (60)
- Touch: `--touch-min` (44px)

Componentes Modal/Drawer usam `z-[var(--z-modal)]` etc — se você cria overlays customizados, siga o mesmo padrão para manter stacking ordering.

## Build / Bundle

- **Vite agora aceita `--mode electron`** (`npm run build:frontend:electron`) que define `base: './'` para Electron `file://`. Modo default (`vite build`) usa `base: '/'` para Vercel e dev.
- **Code splitting** automático: `recharts` em chunk próprio (`charts-*.js`, ~119KB gzip) carregado sob demanda via `React.lazy(AnalysisChart)`. Engine analítico em `analysis-engine-*.js` (~29KB gzip).
- **Initial JS bundle: ~114KB gzip** (era 264KB gzip antes do code split).

## Acessibilidade

- Foco visível com anel azul em todos os controles interativos via `:focus-visible` global em `tokens.css`.
- ESC fecha qualquer Modal/Drawer.
- Tab fica preso dentro de Modal/Drawer abertos (focus trap).
- Foco volta ao trigger ao fechar Modal/Drawer.
- Touch targets ≥ 44×44 em todos os controles via `Button size="md"`/`IconButton size="md"`.
- `aria-current="page"` em canal ativo da Sidebar; `aria-pressed` em agente ativo do AgentConfig.
- `aria-busy` em botão durante loading; `role="log"` + `aria-live="polite"` no feed de mensagens.

## Mobile

- Use o **botão hamburger** no header em telas `<768px` para abrir a Sidebar.
- Use o **botão Users** no header em telas `<1024px` para abrir o painel de Agentes.
- Os botões só aparecem nesses breakpoints — em desktop os asides ficam visíveis sempre.

## Compatibilidade

- React 18 OK; React 19 OK (target do projeto).
- Browsers: testado contra Chrome 120+, Firefox 120+, Safari 17+. `:focus-visible`, `dvh`, `useId()` são pré-requisitos.
- Electron 30+ (compat com `app.asar.unpacked` + `process.execPath` + `ELECTRON_RUN_AS_NODE`).
