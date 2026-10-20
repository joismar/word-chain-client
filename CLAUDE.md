# Word Chain — client

Jogo multiplayer de corrente de palavras (pt-BR). Front React + Vite falando por WebSocket com o backend em `../word-chain-backend` (AWS API Gateway WebSocket + Lambda Python + DynamoDB).

**Refatoração em andamento:** `docs/refactor-plan.md` é a fonte da verdade sobre a arquitetura alvo e as fases (F0–F7, B1–B3). Leia antes de mudar estrutura, estado, renderização ou motion.

## Comandos

```bash
npm run dev        # Vite em --host (porta 5173)
npm run build      # tsc -b && vite build
npm run lint       # ESLint 10 (há erros conhecidos no código legado, ver abaixo)
npm test           # Vitest (unitários, *.test.ts ao lado do código)
npm run e2e        # Playwright (desktop + mobile), sobe o Vite na porta 5174
```

## Ambiente

- `VITE_WS_URL` (obrigatória, `ws://` ou `wss://`). `.env` traz o default de dev; sobrescreva em `.env.local`.
- O e2e aponta para um socket inalcançável (`ws://127.0.0.1:9`) para nunca tocar o backend real. Use `E2E_WS_URL` para apontar para um backend de teste.

## Estado atual do código (pré-F1)

- `src/screens/grid/*` montam a tela como dicionários `"row,col"` renderizados por `GridLayout` (um `div` por célula, animações com react-spring).
- Estado: `bloc/GameBloc.ts` (RxJS) + `src/hooks/useGameBloc.ts`, expostos por `GameBlocProvider`. Serão substituídos pela `gameMachine` (XState v5) na F1.
- `shared/` tem o protocolo atual (`enums.ts`, `interfaces.ts`) e o `SocketWrapper`.
- Aliases: `@src/*`, `@shared/*`, `@bloc/*`.
- Os erros de lint restantes (`no-explicit-any`, `set-state-in-effect`) estão no código que a F1/F4 substitui; não vale corrigir antes.

## Convenções

- Texto de UI em pt-BR; código, identificadores e commits em inglês.
- Commits no padrão Conventional Commits (o repo usa commitizen e semantic-release).
- Motion: nenhum número mágico de animação fora de `src/motion/tokens.ts` (quando existir, F3).
- Cenas futuras (`src/scenes/*`) são funções puras `(estado, viewport) → TileSpec[]`, testáveis sem canvas.
- Antes de usar APIs de PixiJS v8, anime.js v4, XState v5 ou zod, confira a doc atual (skills `pixijs-*` e Context7).

## Gotchas

- Windows com `core.autocrlf=true` e repositório misto: alguns arquivos estão com CRLF no índice. Ao commitar, confira `git diff --cached --stat` para não reescrever arquivos inteiros só por fim de linha.
- TypeScript fixado em 6.0: o typescript-eslint ainda não suporta o 7.
