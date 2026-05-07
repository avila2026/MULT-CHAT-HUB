# Skills Catalog — MULT-CHAT-HUB

Catálogo das **Claude Code Skills** extraídas do projeto. Cada skill é um módulo independente em `.claude/skills/<name>/SKILL.md` que pode ser copiado para outros projetos e referenciado pelo agente (`Skill("name")`).

## Status

| # | Skill | Status | Refactor | Deps npm | Caso de uso |
|---|-------|--------|----------|----------|-------------|
| 1 | [`quantile-stats-engine`](../.claude/skills/quantile-stats-engine/SKILL.md) | ✅ extraída | nenhum | — | Estatística descritiva (mean, std, p25/p50/p75, min, max) por coluna numérica |
| 2 | [`balanced-json-extractor`](../.claude/skills/balanced-json-extractor/SKILL.md) | ✅ extraída | nenhum | — | Extrair JSON balanceado de string mista (parser de comandos LLM) |
| 3 | [`csv-numeric-parser`](../.claude/skills/csv-numeric-parser/SKILL.md) | ✅ extraída | nenhum | — | Parse CSV → colunar numérico, sem dependência externa (~30 linhas) |
| 4 | [`client-localstorage-persistence`](../.claude/skills/client-localstorage-persistence/SKILL.md) | ✅ extraída | leve (genéricos `<T>`) | — | State persistido em localStorage com truncamento se exceder limite |
| 5 | [`slash-command-parser`](../.claude/skills/slash-command-parser/SKILL.md) | ✅ extraída | moderado | — (depende de #2) | Parse + dispatch de comandos `/foo "args"` em chats com LLM |
| 6 | [`quantum-analytical-engine`](../.claude/skills/quantum-analytical-engine/SKILL.md) | ✅ extraída | nenhum | `ml-regression-multivariate-linear`, `javascript-lp-solver` | 5 análises locais: descritiva, preditiva, anomalias, otimização linear, recomendação |
| 7 | [`recharts-analysis-visualizer`](../.claude/skills/recharts-analysis-visualizer/SKILL.md) | ✅ extraída | leve | `recharts`, `react` | Renderização condicional de charts (BarChart, ComposedChart, ScatterChart) por tipo de análise |
| 8 | [`ollama-local-proxy`](../.claude/skills/ollama-local-proxy/SKILL.md) | ✅ extraída | moderado (system instruction injetável) | — (Express opcional) | Proxy HTTP para Ollama local com system instruction parametrizável e nível de pensamento |

## Como usar uma skill em outro projeto

1. Copie o diretório `.claude/skills/<name>/` para o repo destino.
2. Em uma sessão Claude Code dentro desse repo, peça ao agente:
   > "Aplique a skill `<name>` no meu código"
3. O agente lê `SKILL.md`, extrai o código canônico embutido e adapta ao contexto do projeto destino.

## Convenções

Cada `SKILL.md` segue:

```yaml
---
name: <slug>
description: 1 frase explicando QUANDO o agente deve invocar
allowed-tools: Read, Write, Edit, Bash
---
```

E corpo dividido em:

1. **Overview** — o que faz, por que existe
2. **API** — assinaturas TypeScript públicas
3. **Source** — código canônico (TS embutido)
4. **Adaptation hints** — variações comuns ao portar
5. **Example** — uso típico
6. **Origin** — link ao arquivo original neste repo

## Histórico

- **2026-05-07**: Skills 1–8 extraídas do `MULT-CHAT-HUB` v2 (PR #7).
