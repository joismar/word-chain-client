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
- O e2e aponta para um socket inalcançável (`ws://127.0.0.1:9`) para nunca tocar o backend real. Use `E2E_WS_URL` para apontar para um backend de teste; sem ele, `e2e/match.spec.ts` é pulado.
- Backend local para testar ponta a ponta sem deploy: em `../word-chain-backend/lambda`, `.venv/Scripts/python -m local.server --port 3001`, depois `E2E_WS_URL=ws://localhost:3001 npm run e2e` (ou `VITE_WS_URL` no `.env.local` para jogar no navegador).

## Estado atual do código (pós-F3)

- Protocolo v2: `src/protocol/schema.ts` (zod) espelha `src/protocol/v2.schema.json`, cópia do schema exportado pelo backend. `schema.test.ts` falha se divergirem; atualize com `npm run protocol:sync` depois de mudar o protocolo no backend.
- Estado: `src/state/gameMachine.ts` (XState v5) com o `socketActor` invocado. As telas usam `useGame()` (`src/state/useGame.ts`); seletores puros em `selectors.ts`. Decisões por `code` de erro, nunca pelo texto.
- Timers vêm dos prazos do servidor (`startedAt`/`endsAt`/`turnDeadline` + offset de `serverTime`); o cliente só manda `timeout` quando o prazo vence, nunca `pass` automático.
- `src/screens/grid/*` montam a tela como dicionários `"row,col"` renderizados por `GridLayout` (um `div` por célula, animações com react-spring), até a F4.
- Engine Pixi (`src/engine/`, F2) pronta mas ainda fora do app: `Stage` (Application, ciclo de vida serializado por causa do StrictMode), `layout.ts` (geometria do tabuleiro, puro), `TileLayer` (join por `key`; hooks de coreografia recebem o lote inteiro de enter/update/exit), `Tile` (BitmapText tingido), `HiddenInput` (input real e invisível sobre o slot). Demo em `npm run dev` → `/dev/engine`, só em dev (o Pixi não entra no bundle de produção ainda).
- `Stage.setTiles` renderiza na hora: o hit-testing do Pixi lê transforms que só atualizam no render.
- Render sob demanda: o ticker do Pixi (`autoStart: false`) só roda enquanto há animação (o `Director` acorda o ticker, que dorme quando nada está tocando). Sem isso a página fica com a CPU saturada no e2e (WebGL por software) e gasta bateria no celular.
- Motion (`src/motion/`, F3): `tokens.ts` (todos os números), `choreography.ts` (planos puros `TileSpec → Tween[]`, testados sem canvas), `director.ts` (executa os planos com anime.js e conta o que está em voo), `ticker-bridge.ts` (`engine.useDefaultMainLoop = false` + `engine.update()` no ticker, antes do render). Distâncias em pitches do tabuleiro.
- O `Tile` separa layout de motion: o container fica na célula e tem o hit area; o `body` recebe canais compostos (`x/y` FLIP, `lift`, `nudge`, `scale`, `press`, `pulse`, `alpha`, `flash`, `caret`), aplicados no `onRender`. Clique sempre cai no destino final, mesmo no meio de uma animação.
- Efeitos pontuais (shake, flash, pulso de turno, tick do timer) via `stage.play(effect)`; hover faz ripple e press faz squash automaticamente. `prefers-reduced-motion` troca tudo por fades curtos.
- Playground de motion em `/dev/motion` (tokens editáveis ao vivo, botão para copiar o `tokens.ts`). O anime.js captura `Date.now` no import: fake timers do Vitest não o controlam; teste com tempo real e durações curtas.
- Alias: `@src/*`.
- Os erros de lint restantes (`only-export-components` no `GridLayout`, `set-state-in-effect` no `useWordAnimations`) estão no código que a F2/F4 substitui; não vale corrigir antes.

## Convenções

- Texto de UI em pt-BR; código, identificadores e commits em inglês.
- Commits no padrão Conventional Commits (o repo usa commitizen e semantic-release).
- Motion: nenhum número mágico de animação fora de `src/motion/tokens.ts`.
- Cenas futuras (`src/scenes/*`) são funções puras `(estado, viewport) → TileSpec[]`, testáveis sem canvas.
- Antes de usar APIs de PixiJS v8, anime.js v4, XState v5 ou zod, confira a doc atual (skills `pixijs-*` e Context7).

## Gotchas

- Windows com `core.autocrlf=true` e repositório misto: alguns arquivos estão com CRLF no índice. Ao commitar, confira `git diff --cached --stat` para não reescrever arquivos inteiros só por fim de linha.
- TypeScript fixado em 6.0: o typescript-eslint ainda não suporta o 7.
