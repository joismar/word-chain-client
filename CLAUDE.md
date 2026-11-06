# Word Chain — client

Jogo multiplayer de corrente de palavras (pt-BR). Front React + Vite falando por WebSocket com o backend em `../word-chain-backend` (AWS API Gateway WebSocket + Lambda Python + DynamoDB).

**Refatoração em andamento:** `docs/refactor-plan.md` é a fonte da verdade sobre a arquitetura alvo e as fases do front (F0–F7, U1, S1). Leia antes de mudar estrutura, estado, renderização ou motion. O backend é um projeto à parte, com `CLAUDE.md` e plano próprios (`../word-chain-backend/docs/backend-plan.md`, fases B1–B3).

**U1 (HUD × tabuleiro) e S1 (sound design) concluídas; próximas: F6 e F7 (e B3 no backend).** Som: `docs/sound-plan.md`, referência viva em `/dev/sound`. Telas e decisões em `docs/u1-ui-plan.md`; tokens e regras visuais em `docs/design-system.md` (nenhum número visual fora de `theme/palette.ts`, `theme/tokens.ts` e `motion/tokens.ts`); referência viva em `docs/design/index.html` (com `npm run dev`, abra `/docs/design/`).

## Comandos

```bash
npm run dev        # Vite em --host (porta 5173)
npm run build      # tsc -b && vite build
npm run lint       # ESLint 10
npm test           # Vitest (unitários, *.test.ts ao lado do código)
npm run e2e        # Playwright (desktop + mobile), sobe o Vite na porta 5174 (E2E_PORT muda)
```

## Ambiente

- `VITE_WS_URL` (obrigatória, `ws://` ou `wss://`). `.env` traz o default de dev; sobrescreva em `.env.local`.
- O e2e aponta para um socket inalcançável (`ws://127.0.0.1:9`) para nunca tocar o backend real. Use `E2E_WS_URL` para apontar para um backend de teste; sem ele, `e2e/match.spec.ts` é pulado.
- Backend local para testar ponta a ponta sem deploy: em `../word-chain-backend/lambda`, `.venv/Scripts/python -u -m local.server --port 3001`, depois `E2E_WS_URL=ws://localhost:3001 npm run e2e` (ou `VITE_WS_URL` no `.env.local` para jogar no navegador).
- No celular: rode o servidor local com `--host 0.0.0.0` e aponte `VITE_WS_URL` para o IP da máquina na rede. Aberta por `http://<ip>`, a página não é contexto seguro: nada de `crypto.randomUUID`, `navigator.clipboard` e outras APIs só de https. O firewall do Windows bloqueia o Node 22 nesta máquina, então o Vite não fica acessível na rede; sirva um `npm run build` (com o `VITE_WS_URL` da rede) pelo Python (`python -m http.server 5180 --bind 0.0.0.0 --directory dist`).

## Backend

- Trabalho no backend se faz no projeto dele (`../word-chain-backend`, com `CLAUDE.md` próprio), não deste repositório. Para uma tarefa daqui que precisa de mudança lá, abra uma sessão na pasta do backend; leitura pontual de um arquivo de lá pode ser feita daqui.
- Mudança de protocolo começa no backend (modelos pydantic → `export_schema` → commit) e só depois chega aqui por `npm run protocol:sync`. Nunca edite `v2.schema.json` à mão.

## Estado atual do código (pós-U1)

- Protocolo v2: `src/protocol/schema.ts` (zod) espelha `src/protocol/v2.schema.json`, cópia do schema exportado pelo backend. `schema.test.ts` falha se divergirem; atualize com `npm run protocol:sync` depois de mudar o protocolo no backend.
- Estado: `src/state/gameMachine.ts` (XState v5) com o `socketActor` invocado. As telas usam `useGame()` (`src/state/useGame.ts`); seletores puros em `selectors.ts`. Decisões por `code` de erro, nunca pelo texto.
- Timers vêm dos prazos do servidor (`startedAt`/`endsAt`/`turnDeadline` + offset de `serverTime`); o cliente só manda `timeout` quando o prazo vence, nunca `pass` automático.
- O app é um único canvas: `src/app/App.tsx` junta `useGame()`, o estado local da UI (`app/ui.ts`, reducer puro: modo do menu, texto digitado, foco, config do host) e `sceneFor` (`src/scenes/index.ts`), e passa os tiles ao `GameCanvas`, com um `HiddenInput` por campo da cena e o `Hud` por cima. Toques em tiles com `action` e cliques nas ações do HUD viram comandos da máquina no `onAction` do `App`. Avisos do servidor (`notice`) entram em `ui.notice` e aparecem como mensagem no HUD por 3 s.
- Cenas (`src/scenes/*`): funções puras `(estado, área) → { tiles, fields, hud }`, testadas com snapshots em texto (`scenes/testing.ts`: `ascii`, `words` e `hud`). Na grade só fica o que é jogo; título, relógio, jogadores, ações, mensagem e drawer são o `hud`, semântico e sem estilo. Abaixo de `board.compactRows` linhas (teclado aberto) a cena fica `compact`. O que sai da área é cortado (`clip`).
- Keys importam para o motion: o campo da palavra usa a key da próxima palavra da corrente (`inputWordId`), então a palavra aceita voa até a escada (na vez do outro o campo fica desabilitado, mas com as mesmas keys). A corrente (`chainTiles`) alinha por sobreposição (`lib/overlap.ts`), mostra até 5 (quantas couberem) e centraliza o trecho visível. O campo fica na última linha livre acima da mensagem e das ações: `App` calcula as linhas que o HUD deixa livres (`hud/clearRows.ts`, `Area.clear`) e `playRows` posiciona campo e corrente.
- Efeitos do jogo em `app/useBoardEffects.ts`: shake quando `lastError.request === 'word'`, pulso na troca de turno, tick nos últimos 10 s dos relógios.
- Texto do servidor passa por `toBoardText` (`lib/sanitize.ts`); `BOARD_SYMBOLS` é a lista de símbolos que a fonte dos tiles instala.
- Visual: o tile é uma face sobre uma faixa de sombra na base da casa (`tile.shadow`); o slot é a face translúcida, sem faixa (`SLOT_ALPHA`, `SLOT_DISABLED_ALPHA`). As casas vazias perto da borda somem ao acaso (`engine/edgeFade.ts`, nunca sob um tile). `TileSpec.span` faz um tile de n×n casas (a contagem, com atlas de dígitos próprio). Cores em OKLCH em `theme/palette.ts` (faces, peças de HUD via `pieceColors`; `palette.test.ts` cobra gamut e contraste AA), convertidas por `theme/oklch.ts`; geometria em `theme/tokens.ts`. O fundo de `index.css` espelha `BOARD_COLORS.background`.
- HUD (`src/app/hud/`): `Hud` monta barra de título, relógio, chips, mensagem (`role="status"`), ações e `SettingsDrawer` com `Piece`/`PieceButton`. É filho do `GameCanvas`, então acompanha o `visualViewport`. `hud.css` não tem números: lê variáveis de `hudCssVars` e `motionCssVars`, e as cores das peças vêm inline.
- Fonte: Commit Mono (`@fontsource/commit-mono`, importada em `main.tsx`). `Stage.create` espera `loadTileFont()` antes de instalar o atlas, senão o BitmapText assa a fonte de fallback.
- `FxLayer` (`engine/FxLayer.ts`): o que não é tile. Partículas quando uma palavra entra na corrente (`stage.play({ type: 'link', ... })`, disparado por `useBoardEffects` quando a corrente cresce) e onda nas células vazias na troca de turno (junto do `pulse`). Planos puros em `motion/fx.ts`; desenha por frame enquanto há algo tocando e mantém o ticker acordado.
- Som (`src/sound/`, S1): `tokens.ts` (todos os números de som, família Madeira), `cues.ts` (`planCue(cue) → Voice[]`, puro), `synth.ts` (o único que cria nós de áudio) e `mixer.ts` (um `AudioContext` criado ou retomado no gesto; ligado por padrão, volume baixo/médio/alto no drawer, salvo em `word-chain:sound`; com a aba oculta só toca "sua vez"). `triggers.ts` compara dois quadros do jogo (`soundCues`) e `app/useGameSounds.ts` toca; toque, toggle, digitar e aviso saem dos handlers do `App`. O desbloqueio (`installSoundUnlock`) só é instalado no jogo: nas páginas de dev o `AudioContext` no primeiro gesto atrasava o e2e de motion. Em dev, `window.__soundLog` lista os cues tocados (`soundLog(page)` em `e2e/board.ts`); `/dev/sound` toca todos.
- Em dev, `GameCanvas` expõe os tiles em `window.__boardTiles`; o e2e acha palavras no tabuleiro por ali (`e2e/board.ts`: `findWord`, `clickWord`). O HUD é DOM: `hudButton(page, 'PASSAR')` e `turnChip(page, 'ANA')`.
- Engine Pixi (`src/engine/`, F2): `Stage` (Application, ciclo de vida serializado por causa do StrictMode), `layout.ts` (geometria do tabuleiro, puro), `TileLayer` (join por `key`; hooks de coreografia recebem o lote inteiro de enter/update/exit), `Tile` (BitmapText tingido), `HiddenInput` (input real e invisível sobre o slot). Demo em `npm run dev` → `/dev/engine`, só em dev.
- `Stage.setTiles` renderiza na hora quando algo mudou: o hit-testing do Pixi lê transforms que só atualizam no render.
- Render sob demanda: o ticker do Pixi (`autoStart: false`) só roda enquanto há animação (o `Director` acorda o ticker, que dorme quando nada está tocando). Sem isso a página fica com a CPU saturada no e2e (WebGL por software) e gasta bateria no celular.
- Motion (`src/motion/`, F3): `tokens.ts` (todos os números), `choreography.ts` (planos puros `TileSpec → Tween[]`, testados sem canvas), `director.ts` (executa os planos com anime.js e conta o que está em voo), `ticker-bridge.ts` (`engine.useDefaultMainLoop = false` + `engine.update()` no ticker, antes do render). Distâncias em pitches do tabuleiro.
- O `Tile` separa layout de motion: o container fica na célula e tem o hit area; o `body` recebe canais compostos (`x/y` FLIP, `lift`, `nudge`, `scale`, `press`, `pulse`, `alpha`, `flash`, `caret`), aplicados no `onRender`. Clique sempre cai no destino final, mesmo no meio de uma animação.
- Efeitos pontuais (shake, flash, pulso de turno, tick do timer) via `stage.play(effect)`; hover faz ripple e press faz squash automaticamente. `prefers-reduced-motion` troca tudo por fades curtos.
- Playground de motion em `/dev/motion` (tokens editáveis ao vivo, botão para copiar o `tokens.ts`). O anime.js captura `Date.now` no import: fake timers do Vitest não o controlam; teste com tempo real e durações curtas.
- Alias: `@src/*`.

## Convenções

- Texto de UI em pt-BR; código, identificadores e commits em inglês.
- Commits no padrão Conventional Commits (o repo usa commitizen e semantic-release).
- Nenhum número mágico de animação fora de `src/motion/tokens.ts`, nem número visual fora de `src/theme/tokens.ts` e `src/theme/palette.ts`, nem número de som fora de `src/sound/tokens.ts`.
- Cenas (`src/scenes/*`) são funções puras `(estado, área) → Scene`, testáveis sem canvas.
- Antes de usar APIs de PixiJS v8, anime.js v4, XState v5 ou zod, confira a doc atual (skills `pixijs-*` e Context7).

## Gotchas

- Windows com `core.autocrlf=true` e repositório misto: alguns arquivos estão com CRLF no índice. Ao commitar, confira `git diff --cached --stat` para não reescrever arquivos inteiros só por fim de linha.
- TypeScript fixado em 6.0: o typescript-eslint ainda não suporta o 7.
