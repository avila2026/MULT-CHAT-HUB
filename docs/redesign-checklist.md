# Redesign Checklist — MULT-CHAT-HUB v2

Lista editável de tudo que será tocado no PR #2 (`claude/redesign-v2`). Marque `[x]` à medida que aprovar cada item.

## 1. Design tokens (`src/styles/tokens.css`)

- [ ] Cores: 3 tons indigo (primary/hover/soft), 3 emerald (accent/hover/soft), 5 zinc (50/200/500/700/900), semantic (success/warn/error)
- [ ] Spacing escala: `--space-1` a `--space-8` (0.25rem→2rem)
- [ ] Radius: `--radius-sm` (0.375rem), `--radius-md` (0.5rem), `--radius-lg` (0.75rem)
- [ ] Shadow: `--shadow-sm`, `--shadow-md`, `--shadow-modal`
- [ ] Touch min: `--touch-min: 44px`
- [ ] Dark mode opcional (`[data-theme="dark"]` — fica como toggle futuro)

## 2. Componentes UI base (`src/components/ui/`)

- [ ] `Button.tsx` — variants (primary/secondary/ghost/danger), sizes (sm/md/lg), focus-visible ring, disabled state, opcional `icon` prop
- [ ] `IconButton.tsx` — `aria-label` obrigatório por TypeScript, `min-w-[44px] min-h-[44px]`
- [ ] `Modal.tsx` — `useEscapeKey` + `useFocusTrap`, `AnimatePresence`, `role="dialog"` + `aria-modal`
- [ ] `Drawer.tsx` — slide-in lateral, mesma a11y do Modal
- [ ] `Tooltip.tsx` — visível em hover E focus (teclado)
- [ ] `ConfirmDialog.tsx` — wrapper Modal, retorna `Promise<boolean>`

## 3. Hooks (`src/hooks/`)

- [ ] `useEscapeKey(handler)`
- [ ] `useFocusTrap(ref)` — ou substituir por `radix-ui/react-dialog` se ficar complexo
- [ ] `useMediaQuery(query)`
- [ ] `useDisclosure()` — `{isOpen, open, close, toggle}`

## 4. Refactor de componentes existentes

### `src/App.tsx`
- [ ] Remover ou conectar `<Settings>` button (linhas 32-34) — atualmente decorativo
- [ ] `Manual APIs` button vira `<Button variant="secondary" icon>`
- [ ] Header em `<md`: adiciona `<IconButton>` hamburger pra abrir Sidebar drawer

### `src/components/Sidebar.tsx`
- [ ] Conteúdo extraído em `<SidebarContent>` puro
- [ ] `>=md`: aside fixo (`hidden md:flex`)
- [ ] `<md`: dentro de `<Drawer>` (controlado pelo App)
- [ ] Channel buttons: `<Button variant="ghost">` com `aria-current="page"` quando ativo

### `src/components/ChatArea.tsx`
- [ ] Send button: `<IconButton aria-label="Enviar" disabled={!input.trim() || isLoading}>`
- [ ] Mic e Paperclip: `<IconButton>`
- [ ] Loading state: `isLoading` em `ChatContext.sendMessage`, mostra "..." enquanto fetch
- [ ] Thinking level: `<Button variant={...}>`

### `src/components/ManualModal.tsx`
- [ ] Reescreve sobre `<Modal title="Manual" onClose={...}>`
- [ ] Conteúdo permanece (só muda wrapper)

### `src/components/AgentConfig.tsx`
- [ ] `>=lg`: aside fixo (mantém)
- [ ] `<lg`: floating button + `<Drawer side="right">`
- [ ] Inputs URL/code com focus rings padronizados via tokens

## 5. UX & a11y

- [ ] Confirmation dialog para `/reset` e `/clear`
- [ ] Empty state: "Nenhum canal" / "Nenhuma tarefa" / "Nenhum dado em cache"
- [ ] Empty state em ChatArea quando canal recém-criado
- [ ] Touch targets ≥ 44×44 em TODOS os controles
- [ ] focus-visible ring em todos os botões (via `Button` base)
- [ ] aria-label em todos icon-only (forçado por TypeScript no `IconButton`)
- [ ] ESC fecha Modal e Drawer
- [ ] Tab fica preso dentro de Modal aberto
- [ ] Foco volta ao trigger ao fechar Modal
- [ ] Send button desabilitado quando input vazio

## 6. Mobile

- [ ] Sidebar vira Drawer em `<md` (768px)
- [ ] AgentConfig vira Drawer em `<lg` (1024px) com botão flutuante
- [ ] Header colapsa em `<sm`: title encurtado, botões em ícones
- [ ] ChatArea: input toolbar não quebra em portrait 360×640
- [ ] Modal: padding ajustado em `<sm`

## 7. Verificação

- [ ] `npm run lint` 0 erros
- [ ] `npm run build` < 320KB gzip total
- [ ] Tab navigation visível em todos os controles
- [ ] DevTools mobile (`375×667`): sem overflow, sem botões fora da tela
- [ ] axe DevTools: 0 violações sérias
- [ ] Build Vercel: app continua funcional
- [ ] Build Electron: ícones e logo carregam em `file://`

## Screenshots (TODO)

Antes / depois de cada componente — adicionar links/imagens aqui ao final do PR.

- [ ] Header
- [ ] Sidebar (desktop)
- [ ] Sidebar drawer (mobile)
- [ ] ChatArea (desktop)
- [ ] ChatArea (mobile)
- [ ] ManualModal
- [ ] AgentConfig (desktop)
- [ ] AgentConfig drawer (mobile)
- [ ] ConfirmDialog `/reset`
