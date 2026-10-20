# Plano de Refatoração — Word Chain

> Escrito em 2026-10-20 a partir da leitura do código (não da documentação existente).
> Decisões tomadas: **PixiJS v8 + anime.js v4**, **evoluir o grid de tiles**, **React 19 como casca**, **backend redesenhado junto**.

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

- Paleta em **OKLCH** com luminância consistente entre as cores dos jogadores (hoje stone-600 e amber-600 têm contrastes bem diferentes)
- Tiles com **relevo por shader** (bevel + sombra de contato) em vez de dois `div`s empilhados
- Células vazias do fundo quase imperceptíveis, reagindo levemente ao cursor/toque
- Tipografia: monoespaçada com personalidade, renderizada em **BitmapText/MSDF** (nítida em qualquer escala). Candidatas: Departure Mono, Commit Mono, Fragment Mono. **Decisão pendente**
- Tamanho de célula adaptativo: mínimo de colunas garantido no mobile (hoje as palavras cortam em telas estreitas)

---

## 4. Fases do front

### F0 — Preparação
- [x] Commitar/arquivar o WIP da `new-grid-layout`; criar branch `refactor/engine`
- [x] Instalar skills (seção 6) e criar `CLAUDE.md` do projeto
- [x] Atualizar deps: React 19, Vite (atual), Tailwind 4, TypeScript (atual); remover `@react-spring/web` e `rxjs` ao final (pendente: saem quando F1/F4 substituírem o código que os usa)
- [x] Adicionar Vitest + Playwright; configurar `VITE_WS_URL` via env
- [x] Remover código morto (lista no diagnóstico)

### F1 — Protocolo e estado
- [ ] `protocol/schema.ts` com zod, alinhado ao protocolo v2 do backend (B2)
- [ ] `socketActor`: reconexão com backoff exponencial + jitter, fila de envio offline, reidratação via `reconnect`
- [ ] `gameMachine` (XState v5) substituindo `GameBloc` + `useGameBloc`
- [ ] Testes da máquina (transições, reconexão, erros por código e não por texto)

### F2 — Engine core
- [ ] `Stage` montado por `<GameCanvas/>` (mount/unmount limpos, compatível com StrictMode)
- [ ] `Board`: coordenadas centradas, resize via `visualViewport`, DPR, cálculo de célula adaptativo
- [ ] `Tile` + pool; `TileLayer` com join enter/update/exit por `key`
- [ ] Hit-testing (hover/click/tap) no Pixi, emitindo eventos para a máquina
- [ ] `HiddenInput` DOM sincronizado com o slot de input no canvas (teclado mobile, IME, colar)

### F3 — Motion
- [ ] `ticker-bridge` (anime ↔ Pixi), `tokens.ts`, `choreography.ts`
- [ ] Playground de motion (`/dev/motion`) para ajustar tokens visualmente

### F4 — Cenas
- [ ] `home` → `lobby` → `settings` → `game` → `end` como funções puras + testes de snapshot de `TileSpec[]`
- [ ] Corrente com alinhamento por sobreposição (lógica atual de `countOverlapStartEnd`) e rolagem quando passa da tela
- [ ] Timers derivados de `turn_deadline`/`ends_at` do servidor (B2), sem `setInterval` decrementando estado

### F5 — Visual e FX
- [ ] Paleta OKLCH, fonte MSDF, shader de relevo, `FxLayer` (partículas de corrente, flashes)

### F6 — Acessibilidade e mobile
- [ ] Região `aria-live` anunciando turno, palavra aceita/recusada, tempo restante
- [ ] Navegação por teclado completa; foco visível desenhado no canvas
- [ ] Teste em Android intermediário: meta de 60 fps estável

### F7 — Qualidade
- [ ] Playwright: fluxo host → join (2 contextos) → partida → fim
- [ ] Orçamento de bundle (Pixi com imports seletivos) e de frame
- [ ] Atualizar README a partir do código final

---

## 5. Backend (redesenho em paralelo)

### B1 — Hotfix (antes de F1, destrava os testes ponta a ponta)
- [ ] `start(time, repetition)` aceitando a config real; persistir `config` na sessão e enviá-la no `GameData`
- [ ] Wordlist carregada **uma vez por container** (escopo de módulo) num `set`/`frozenset`
- [ ] Python 3.13 no CI e no runtime da Lambda

### B2 — Protocolo v2 e servidor autoritativo
- [ ] Envelope versionado: `{ v: 2, type, payload, requestId }`; erros com `code` estável (`INEXISTENT_SESSION`, `INVALID_TURN`…) além da mensagem pt-BR
- [ ] Schema único do protocolo (JSON Schema) → pydantic v2 no back, zod no front
- [ ] **Prazos no servidor:** a sessão guarda `turn_deadline` e `ends_at`. Toda mensagem recebida valida os prazos primeiro (troca o turno ou encerra a partida se venceram). O cliente pode mandar `timeout` quando o prazo vence localmente, e o servidor só aceita se o prazo dele também já passou. Isso resolve os travamentos sem precisar de infraestrutura nova
  - Opcional, numa fase futura: Step Functions (Wait state) para encerrar partidas mesmo sem nenhum cliente conectado
- [ ] Escritas condicionais no DynamoDB (`version` + `ConditionExpression`) contra jogadas simultâneas
- [ ] Broadcast em paralelo e limpeza de conexões `GoneException`
- [ ] AWS Lambda Powertools (logs estruturados, tracing) no lugar de `print(json.dumps(event))`

### B3 — Infraestrutura como código
- [ ] Versionar API Gateway WebSocket, Lambda, tabelas `sessions`/`players` + GSI `name-index` e TTL (SAM ou CDK, **decisão pendente**)
- [ ] Ambientes `dev`/`prod`; deploy via OIDC do GitHub (sem access keys fixas nos secrets)

---

## 6. Skills e ferramentas

| Skill / ferramenta | Origem | Para quê |
| :--- | :--- | :--- |
| `frontend-design` | Anthropic (`claude-plugins-official`) | Direção visual e qualidade de UI |
| `webapp-testing` | Anthropic (`anthropics/skills`, bundle example-skills) | Playwright para validar telas e animações |
| `pixijs-skills` | Equipe PixiJS | API do v8 (Application, Ticker, BitmapText, filtros) |
| Context7 (MCP, já conectado) | — | Docs atuais de anime.js v4, XState v5, zod, Powertools |
| `word-chain-motion` (a criar) | `skill-creator` | Tokens, coreografias e convenções do grid; mantém o motion consistente entre sessões |

Ler o SKILL.md de cada skill de terceiros antes de instalar.

---

## 7. Decisões pendentes

1. Fonte (Departure Mono / Commit Mono / Fragment Mono / outra)
2. IaC: SAM ou CDK
3. Backend continua em Python ou migra para TypeScript (Node 22) para compartilhar tipos diretamente com o front. A recomendação atual é **Python + JSON Schema**, por ser a menor ruptura
4. O que fazer com `.agents/`: remover ou manter fora do fluxo do Claude Code
