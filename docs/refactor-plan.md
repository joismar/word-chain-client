# Plano de Refatoração — Word Chain

> Escrito em 2026-10-20 a partir da leitura do código (não da documentação existente).
> Decisões tomadas: **PixiJS v8 + anime.js v4**, **evoluir o grid de tiles**, **React 19 como casca**, **backend redesenhado junto**, **Commit Mono** nos tiles, **visual minimalista** (face lisa sobre uma faixa de sombra, sem relevo por shader), **HUD em DOM separado do tabuleiro** (U1).

---

## 0. Diagnóstico

### Front (`word-chain-client`, branch `new-grid-layout`)

| Área | Situação atual | Problema |
| :--- | :--- | :--- |
| Renderização | 1 `<div>` por célula da tela (~1000 no desktop), recriadas a cada render (`GridLayout.tsx`) | Custo alto a cada tecla; sem identidade estável de tile → impossível animar uma letra "viajando" entre posições |
| Animação | react-spring em 3 lugares (`useWordAnimations`, `Letter`, `CustomInput`) + classe CSS inexistente (`transition-y`) | Springs concorrentes, sem tokens, timings arbitrários (50ms, 100ms, -6px…) → motion inconsistente |
| Estado | `GameBloc` (RxJS Subjects) + `useGameBloc` com estado React duplicado | Socket criado no import do módulo, sem reconexão/backoff, URL hardcoded, erros detectados por substring (`'não existe'`) |
| Telas | `screens/grid/*` montam dicionários `"row,col"` à mão | Coordenadas mágicas espalhadas; layout não se adapta a tela pequena |
| Código morto | `screens/{Home,Lobby,Game,End}.tsx`, `Word.tsx`, `WordContainer.tsx`, `Letter.tsx`, `useWordList`, `useInputManager`, `useVerticalScroll`… | ~45% do código não é usado |
| Git | 15 arquivos modificados sem commit | Risco de perda ao iniciar a refatoração |
| `.agents/` | Kit genérico do Google Antigravity (47 skills, 20 agentes) | Não é lido pelo Claude Code; quase nada é específico do projeto |

### Bugs confirmados

1. **Host não consegue iniciar partida** — front envia `start` com `['3','true']`; `Game.start(self, mode)` aceita 1 argumento → `TypeError` → HTTP 500.
2. **Timer de 5 horas** — `GameGrid.tsx` usa `config.time * 6000`; além disso o backend não envia `config` no `GameData` e o front ignora `started_at`.
3. **Jogo pode travar** — fim de partida depende do host enviar `END`; troca de turno depende do jogador da vez enviar `PASS`. Fechou a aba → travou.
4. Front não tem `GameStatus.FINISHED = 2`.
5. Backend lê `wordlist.txt` (537k linhas) **a cada requisição** e valida com `word in list` (O(n)).
6. Sem controle de concorrência no DynamoDB: duas jogadas simultâneas → last-write-wins.
7. CI com Python 3.9 (EOL out/2025); infraestrutura (API Gateway, tabelas, GSI `name-index`) não está versionada como código.

---

## 1. Arquitetura alvo do front

```
┌──────────────────────────── React 19 (casca) ────────────────────────────┐
│  <App>  ── useSelector(gameActor) ──►  <GameCanvas/>   <HiddenInput/>    │
│                                           │  (mount)      (teclado/IME)  │
└───────────────────────────────────────────┼──────────────────────────────┘
                                            ▼
┌──────────────── engine/ (TS imperativo, sem React) ──────────────────────┐
│  Stage (Pixi Application, WebGPU→WebGL)                                  │
│   ├─ Board        sistema de coordenadas centrado (0,0), resize/DPR      │
│   ├─ TileLayer    join por chave estável: enter / update / exit          │
│   │    └─ Tile    Container + BitmapText + shader de relevo              │
│   ├─ FxLayer      partículas, brilho de corrente, flash de erro          │
│   └─ Motion       anime.js v4 sincronizado ao ticker do Pixi + tokens    │
└──────────────────────────────────────────────────────────────────────────┘
                                            ▲
                                  scenes/*.ts  (funções puras)
                     estado do jogo ─► TileSpec[] { key, char, row, col, tone, … }
                                            ▲
┌──────────────── state/ (XState v5) ──────────────────────────────────────┐
│  gameMachine: connecting → home → lobby ⇄ settings → playing → ended     │
│  socketActor: reconexão c/ backoff, fila de envio, protocolo v2 (zod)    │
└──────────────────────────────────────────────────────────────────────────┘
```

**Ideia central:** as telas deixam de posicionar elementos e passam a ser **funções puras** `(estado, viewport) → TileSpec[]`. A engine faz o *diff* por `key` estável (no estilo do data-join do D3):

- **enter** → tile nasce com a coreografia de entrada
- **update** → tile se move/recolore com spring (é isso que permite a palavra subir na corrente letra a letra, ou o "SALA" virar o código da sala sem sumir e reaparecer)
- **exit** → coreografia de saída, depois o tile é destruído/reciclado (pool)

Isso deixa as telas testáveis em Vitest sem canvas, e todo o motion fica centralizado.

### Estrutura de pastas proposta

```
src/
  app/            App.tsx, providers, HiddenInput.tsx
  engine/         Stage.ts, Board.ts, TileLayer.ts, Tile.ts, FxLayer.ts, pool.ts
  motion/         tokens.ts, choreography.ts, ticker-bridge.ts
  scenes/         home.ts, lobby.ts, settings.ts, game.ts, end.ts  (puras)
  state/          gameMachine.ts, socketActor.ts
  protocol/       schema.ts (zod) — gerado/espelhado do schema do backend
  theme/          palette.ts (OKLCH), typography.ts
  lib/            overlap.ts, sanitize.ts
```

---

## 2. Sistema de motion

**Biblioteca:** anime.js v4. Motivos: anima qualquer objeto JS (inclusive `Container` do Pixi), tem springs físicos, timelines e, o principal, **`stagger` com `grid` e `from: 'center'`**, que encaixa direto no tabuleiro com origem `(0,0)`.

**Loop único:** desligar o loop próprio do anime.js e avançá-lo a partir do `Ticker` do Pixi, com um frame só para render e animação (confirmar a API do engine do anime v4 no Context7 antes de implementar).

### Motion tokens (`motion/tokens.ts`)

| Token | Uso | Valor inicial (ajustar no protótipo) |
| :--- | :--- | :--- |
| `spring.snappy` | press, hover, cursor | rígido, quase sem overshoot |
| `spring.bouncy` | entrada de tile, letra digitada | overshoot leve |
| `spring.glide` | deslocamento na corrente, troca de tela | amortecido, sem overshoot |
| `stagger.letter` | letra a letra numa palavra | ~28 ms |
| `stagger.wave` | onda pelo grid a partir do centro | ~12 ms/célula |
| `duration.flash` | feedback de erro/acerto | ~180 ms |

Regra: **nenhum número mágico de animação fora de `tokens.ts`**.

### Coreografias (`motion/choreography.ts`)

- **Troca de tela:** saída em onda centrípeta, entrada em onda centrífuga (`stagger grid from center`)
- **Digitação:** letra "cai" no slot com `bouncy`; cursor respira com `snappy`
- **Palavra aceita:** as letras do input voam até a posição na corrente; as letras sobrepostas se fundem com o tile anterior (brilho + partículas); a corrente inteira sobe com `glide`
- **Palavra inválida:** shake horizontal amortecido + flash rose
- **Troca de turno:** pulso na cor do jogador da vez percorrendo o grid
- **Timer:** os últimos 10 s pulsam na cadência do segundo; os 3 últimos com escala
- **Hover/press:** ripple vertical nas letras vizinhas (a ideia atual, com tokens)
- **Reduced motion:** `prefers-reduced-motion` troca springs por fades curtos e desliga partículas

---

## 3. Direção visual (evolução do grid)

- Paleta em **OKLCH** com a mesma luminosidade e croma em todas as faces; só o matiz muda, e o contraste letra/face fica em AA (4,5:1) para todos os tons. Nove tons, um por cor de jogador mais o neutro
- **Minimalista**: o tile é uma face lisa sobre uma faixa de sombra na base da própria casa (a F5 tirou a faixa e a U1 devolve); o slot vazio é a face com opacidade baixa. O relevo por shader foi testado (chanfro + sombra de contato) e descartado por parecer datado
- Células vazias do fundo quase imperceptíveis; a troca de turno passa por elas como uma onda na cor de quem joga
- Tipografia: **Commit Mono** 600 (via `@fontsource/commit-mono`), também no DOM. Escolhida comparando com Departure Mono e Fragment Mono num protótipo em Pixi
- Tamanho de célula adaptativo: mínimo de colunas garantido no mobile (hoje as palavras cortam em telas estreitas)
- HUD separado do tabuleiro, em DOM, com material de peça (face lisa, sombra dura); bordas da grade em degradê pixelado: U1 (`docs/u1-ui-plan.md`, `docs/design-system.md`)

---

## 4. Fases do front

### F0 — Preparação
- [x] Commitar/arquivar o WIP da `new-grid-layout`; criar branch `refactor/engine`
- [x] Instalar skills (seção 6) e criar `CLAUDE.md` do projeto
- [x] Atualizar deps: React 19, Vite (atual), Tailwind 4, TypeScript (atual); remover `@react-spring/web` e `rxjs` ao final (o `rxjs` saiu na F1, o `@react-spring/web` na F4)
- [x] Adicionar Vitest + Playwright; configurar `VITE_WS_URL` via env
- [x] Remover código morto (lista no diagnóstico)

### F1 — Protocolo e estado
- [x] `protocol/schema.ts` com zod, alinhado ao protocolo v2 do backend (B2)
- [x] `socketActor`: reconexão com backoff exponencial + jitter, fila de envio offline, reidratação via `reconnect`
- [x] `gameMachine` (XState v5) substituindo `GameBloc` + `useGameBloc`
- [x] Testes da máquina (transições, reconexão, erros por código e não por texto)

### F2 — Engine core
- [x] `Stage` montado por `<GameCanvas/>` (mount/unmount limpos, compatível com StrictMode)
- [x] `Board`: coordenadas centradas, resize via `visualViewport`, DPR, cálculo de célula adaptativo
- [x] `Tile` + pool; `TileLayer` com join enter/update/exit por `key`
- [x] Hit-testing (hover/click/tap) no Pixi, emitindo eventos para a máquina
- [x] `HiddenInput` DOM sincronizado com o slot de input no canvas (teclado mobile, IME, colar)

A engine roda isolada em `/dev/engine` (só em dev). O app continua no `GridLayout` até a F4 portar as cenas; os eventos `tap`/`hover` chegam à máquina quando as cenas existirem.

### F3 — Motion
- [x] `ticker-bridge` (anime ↔ Pixi), `tokens.ts`, `choreography.ts`
- [x] Playground de motion (`/dev/motion`) para ajustar tokens visualmente

As coreografias são planos puros (`choreography.ts`) executados por um `Director` com anime.js; o ticker do Pixi só roda enquanto há animação (render sob demanda). Ficam para depois: as letras sobrepostas se fundindo com brilho e partículas (F5, `FxLayer`) e o pulso de turno percorrendo as células vazias do fundo (hoje percorre os tiles; F5). O alinhamento por sobreposição na corrente é da F4.

### F4 — Cenas
- [x] `home` → `lobby` → `settings` → `game` → `end` como funções puras + testes de snapshot de `TileSpec[]`
- [x] Corrente com alinhamento por sobreposição (lógica atual de `countOverlapStartEnd`) e rolagem quando passa da tela
- [x] Timers derivados de `turn_deadline`/`ends_at` do servidor (B2), sem `setInterval` decrementando estado

O app passou a ser um único canvas Pixi; o grid DOM, o react-spring e os hooks antigos saíram. A palavra digitada usa a key da próxima palavra da corrente, então a palavra aceita voa até a escada. Shake, pulso de turno e tick dos relógios vêm do estado (`useBoardEffects`). O Pixi agora entra no bundle de produção (cerca de 715 kB, 220 kB gzip); o orçamento é da F7. As telas usam coordenadas fixas pensadas para 15 colunas: o ajuste fino para telas baixas (paisagem com teclado aberto) é da F6.

### F5 — Visual e FX
- [x] Paleta OKLCH (`theme/oklch.ts` + `theme/palette.ts`, testada: gamut, mesma luminosidade, contraste AA, um tom por cor de jogador)
- [x] Commit Mono nos tiles e no DOM
- [x] ~~Shader de relevo~~: descartado em favor do visual flat
- [x] `FxLayer` (partículas onde a palavra nova se liga à corrente, onda de turno nas células vazias)

A fonte continua num atlas de BitmapText gerado em runtime (48 px × DPR), agora esperando a Commit Mono carregar antes de desenhar: os tiles só ficam menores que o atlas, então MSDF não traria ganho visível e exigiria um passo de build para gerar o atlas. As partículas são quadrados lisos na cor da sobreposição, saem das letras compartilhadas depois que a palavra pousa e somem encolhendo; os planos (`motion/fx.ts`) são puros e os números ficam em `tokens.ts`. Com `prefers-reduced-motion`, partículas e onda não tocam.

### U1 — Redesenho da UI: HUD × tabuleiro

**Concluída.** Relógio, placar, voltar, configurar e botões usavam o mesmo tile das palavras do jogo. A U1 separou as duas coisas sem perder o tabuleiro de letras: a grade atual cobre a tela, com as bordas se desfazendo num degradê pixelado; os tiles voltaram a ter a faixa de sombra; o HUD saiu da grade e virou DOM (`src/app/hud/`), em peças com sombra dura. As cenas devolvem `{ tiles, fields, hud }`.

- Plano, telas e passos: `docs/u1-ui-plan.md`
- Tokens e regras visuais: `docs/design-system.md`
- Referência viva: `docs/design/index.html` (com `npm run dev`, abra `/docs/design/`)

### S1 — Sound design

**Concluída.** O jogo era mudo. Cada evento da partida (contagem, digitar, palavra aceita e recusada, troca de turno, relógios, passar, tempo esgotado, fim) e as ações do HUD ganharam um som curto da família "Madeira" (estalo de peça e marimba numa pentatônica de Ré), sintetizado na hora com a Web Audio API, sem arquivos nem dependências. Som e volume ficam no drawer, por aparelho; começa ligado.

- Plano, mapa de eventos e decisões: `docs/sound-plan.md`
- Plano de implementação: `docs/superpowers/plans/2026-10-30-sound-design.md`
- Código: `src/sound/` (tokens → cues → synth → mixer, gatilhos em `triggers.ts`); referência viva em `/dev/sound`

### F6 — Acessibilidade e mobile

- [ ] Região `aria-live` anunciando turno, palavra aceita/recusada, tempo restante (a U1 já tem a região da mensagem no HUD, `role="status"`, e botões com rótulo)
- [ ] Navegação por teclado completa; foco visível desenhado no canvas
- [ ] Teste em Android intermediário: meta de 60 fps estável

### F7 — Qualidade

- [ ] Playwright: fluxo host → join (2 contextos) → partida → fim
- [ ] Orçamento de bundle (Pixi com imports seletivos) e de frame
- [ ] Atualizar README a partir do código final

---

## 5. Backend (redesenho em paralelo) - ../word-chain-backend

O plano do backend (B1 e B2 concluídas, B3 pendente) e as decisões dele foram movidos para `../word-chain-backend/docs/backend-plan.md`, junto do `CLAUDE.md` do backend. O contrato entre os dois é o protocolo: o backend exporta `v2.schema.json` e o front copia com `npm run protocol:sync`.

---

## 6. Skills e ferramentas

| Skill / ferramenta | Origem | Para quê |
| :--- | :--- | :--- |
| `frontend-design` | Anthropic (`claude-plugins-official`) | Direção visual e qualidade de UI |
| `webapp-testing` | Anthropic (`anthropics/skills`, bundle example-skills) | Playwright para validar telas e animações |
| `pixijs-skills` | Equipe PixiJS | API do v8 (Application, Ticker, BitmapText, filtros) |
| `ui-sound-design` | `dannyjpwilliams/ui-sound-design-skill` (MIT) | Síntese de sons de UI com Web Audio, receitas e página de audição |
| `sounds-on-the-web` | `raphaelsalaja/userinterface-wiki`, seções de áudio (MIT) | Regras de quando tocar som, acessibilidade e Web Audio |
| Context7 (MCP, já conectado) | — | Docs atuais de anime.js v4, XState v5, zod, Powertools |
| `word-chain-motion` (a criar) | `skill-creator` | Tokens, coreografias e convenções do grid; mantém o motion consistente entre sessões |

Ler o SKILL.md de cada skill de terceiros antes de instalar.

---

## 7. Decisões pendentes

1. ~~Fonte~~: Commit Mono (F5)
2. ~~IaC e linguagem do backend~~: movidas para `../word-chain-backend/docs/backend-plan.md`
3. O que fazer com `.agents/`: remover ou manter fora do fluxo do Claude Code
4. ~~Estilo da UI (U1)~~: grade atual com fade pixelado nas bordas, tiles com faixa de sombra e HUD em DOM (`docs/u1-ui-plan.md`)
