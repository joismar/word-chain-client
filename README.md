# Word Chain Client 🔤

Cliente web em React para o jogo multiplayer em tempo real **Word Chain** (Encadeamento de Palavras). Os jogadores competem criando sequências de palavras encadeadas por letras coincidentes antes que o tempo se esgote.

---

## 📋 Sumário

- [Visão Geral](#-visão-geral)
- [Tecnologias Utilizadas](#-tecnologias-utilizadas)
- [Arquitetura do Projeto](#-arquitetura-do-projeto)
  - [Padrão BLoC (Business Logic Component)](#padrão-bloc-business-logic-component)
  - [Fluxo de Estado e Telas](#fluxo-de-estado-e-telas)
- [Protocolo WebSocket](#-protocolo-websocket)
  - [Ações Enviadas pelo Cliente](#ações-enviadas-pelo-cliente)
  - [Eventos Recebidos do Servidor](#eventos-recebidos-do-servidor)
  - [Modelos de Dados](#modelos-de-dados)
- [Tabuleiro: cenas, engine e motion](#-tabuleiro-cenas-engine-e-motion)
  - [Sistema de Coordenadas Centrado](#sistema-de-coordenadas-centrado)
  - [Cenas puras](#cenas-puras)
  - [Corrente](#corrente)
  - [Texto e teclado](#texto-e-teclado)
- [Estrutura de Pastas](#-estrutura-de-pastas)
- [Instalação e Execução](#-instalação-e-execução)
- [Próximos Passos](#-próximos-passos)

---

## 🎯 Visão Geral

O **Word Chain** é um jogo de vocabulário e agilidade mental onde:
1. Um jogador cria uma sala (*Host*) ou entra em uma existente via código (*Join*).
2. O Host define configurações da partida (duração de 3 ou 5 minutos, penalidade de repetição de palavras).
3. Durante a partida, os jogadores se revezam enviando palavras que devem começar com as letras finais da palavra anterior (ou sobreposição válida calculada por `countOverlap`, em `lib/overlap.ts`).
4. Cada rodada conta com timer geral da partida e timer por turno (15 segundos).
5. No fim do tempo, a tela de encerramento exibe o ranking final e pontuações calculadas.

---

## 🛠️ Tecnologias Utilizadas

- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler & Dev Server**: [Vite](https://vitejs.dev/)
- **Estilização**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Estado**: [XState v5](https://stately.ai/docs) (`gameMachine` + `socketActor`)
- **Protocolo**: [zod](https://zod.dev/) espelhando o JSON Schema do backend (protocolo v2)
- **Renderização**: [PixiJS v8](https://pixijs.com/) (WebGPU → WebGL), um canvas para o tabuleiro inteiro
- **Animações**: [anime.js v4](https://animejs.com/) avançado pelo ticker do Pixi
- **Comunicação em Tempo Real**: WebSocket nativo integrado a AWS API Gateway WebSocket
- **Testes**: Vitest (unitários) e Playwright (e2e)

---

## 🏛️ Arquitetura do Projeto

A arquitetura alvo e as fases da refatoração estão em [docs/refactor-plan.md](./docs/refactor-plan.md).

### Estado (`src/state/`)

```
┌─────────────────────────────────┐
│     AWS API Gateway WebSocket   │
└───────────────▲─────────────────┘
                │ JSON (protocolo v2, validado com zod)
┌───────────────▼─────────────────┐
│          socketActor            │  ◄── reconexão com backoff + jitter,
└───────────────▲─────────────────┘      fila de envio offline
                │ socket.open / socket.message / socket.closed
┌───────────────▼─────────────────┐
│          gameMachine            │  ◄── boot → restoring → home → lobby
└───────────────▲─────────────────┘      → playing → ended
                │ useGame()
┌───────────────▼─────────────────┐
│  App → scenes → Stage (Pixi)    │  (cenas puras → TileSpec[] → canvas)
└─────────────────────────────────┘
```

- **Reidratação:** o id do jogador fica no `localStorage`. A cada conexão nova, a máquina manda `reconnect` antes de liberar a fila, porque o servidor só reconhece a conexão depois disso.
- **Erros por código:** a máquina decide pelo `code` (`INEXISTENT_PLAYER`, `DEADLINE_NOT_REACHED`...), nunca pelo texto. O texto pt-BR vai para o toast.
- **Prazos do servidor:** os timers da tela são derivados de `startedAt`, `endsAt` e `turnDeadline` com o offset de `serverTime`. Quando um prazo vence, o cliente manda `timeout`: primeiro o jogador da vez (ou o host, no fim da partida), e os outros um pouco depois, caso ele esteja offline.

### Fluxo de Telas

A tela é derivada do estado da máquina (`screenOf`): `lobby` → **Lobby**, `playing` → **Game**, `ended` → **End**, `home` → **Home**, e `boot`/`restoring` → "CONECTANDO".

---

## 📡 Protocolo WebSocket (v2)

A fonte da verdade são os modelos pydantic do backend (`word-chain-backend/lambda/protocol/models.py`). O JSON Schema exportado por ele fica copiado em `src/protocol/v2.schema.json`, e `src/protocol/schema.ts` (zod) tem um teste que falha se divergir. Para atualizar a cópia: `npm run protocol:sync`.

Todo envelope tem a forma `{ v: 2, type, payload, requestId }`, com campos em camelCase.

| Cliente → servidor | `payload` | Resposta |
| :--- | :--- | :--- |
| `host` | `{ playerName }` | `session` |
| `join` | `{ roomName, playerName }` | `session` |
| `reconnect` | `{ playerId }` | `session` |
| `ready` | `{ ready }` | `ack` |
| `start` | `{ config: { time, repetition } }` (só o host) | `ack` |
| `word` | `{ word }` | `ack` com `points` e `chainPoints` |
| `pass` | `{}` | `ack` |
| `timeout` | `{}` (aceito só se o prazo já venceu no servidor) | `ack` |

O servidor também manda `error` (`{ code, message }`, com `requestId` nulo quando não deu para ler o pedido) e `game_state`, transmitido a todos da sala a cada mudança.

---

## 🎨 Tabuleiro: cenas, engine e motion

O jogo inteiro é um tabuleiro de letras desenhado num único canvas Pixi. As telas não posicionam elementos: cada uma é uma função pura que devolve a lista de tiles, e a engine faz o diff por `key`.

### Sistema de Coordenadas Centrado

- O centro da tela é a célula **`(0, 0)`**; linhas crescem para baixo, colunas para a direita.
- O tamanho da célula se adapta à tela (`engine/layout.ts`), com pelo menos 15 colunas no celular.

```
         (-Y) Topo
            │
(-X) ──────(0,0)────── (+X)
 Esquerda   │           Direita
         (+Y) Base
```

### Cenas puras

`src/scenes/*.ts` (home, lobby, settings, game, end) recebem o estado do jogo mais o que só a tela sabe (modo do menu, texto digitado, foco) e devolvem `{ tiles, fields }`. São testadas em Vitest sem canvas, com snapshots em texto do tabuleiro.

- **`key` estável** é o que dá o motion: o "CRIAR" vira "APELIDO" trocando as letras nos mesmos tiles, o `<` desliza entre telas, e a palavra digitada usa a `key` da próxima palavra da corrente, então quando o servidor aceita, as letras voam do campo até o lugar delas.
- **Ações:** tiles com `action` são clicáveis; o `App` traduz o toque em comandos da máquina (`host`, `ready`, `pass`...).
- **Efeitos pontuais** (`app/useBoardEffects.ts`): tremida na palavra recusada (pelo `code` de erro do pedido `word`), pulso na cor de quem joga a cada troca de turno e batida dos relógios nos últimos 10 s.

### Corrente

Cada palavra começa embaixo das letras que divide com a anterior (`lib/overlap.ts`), formando uma escada; as letras sobrepostas ficam verdes. As 6 palavras mais novas aparecem, a mais nova embaixo; ao chegar uma nova, as outras sobem e as antigas saem pelo topo. O trecho visível fica centralizado e, quando não cabe na largura, a palavra mais nova fica encostada na direita e as antigas são cortadas na borda.

### Texto e teclado

- Os campos (apelido, sala, palavra) são `<input>` reais e invisíveis sobre as células (`app/HiddenInput.tsx`): teclado do celular, IME e colar funcionam de forma nativa, e o canvas só desenha o conteúdo.
- O texto vindo do servidor passa por `toBoardText` (maiúsculas, sem acento, `?` para o que a fonte não tem).

---

## 📁 Estrutura de Pastas

```
word-chain-client/
├── e2e/                         # Playwright: tela inicial, engine, motion e partida completa (match.spec.ts)
├── src/
│   ├── protocol/
│   │   ├── schema.ts            # Protocolo v2 em zod
│   │   └── v2.schema.json       # Cópia do JSON Schema do backend
│   ├── state/
│   │   ├── gameMachine.ts       # Máquina do jogo (XState v5)
│   │   ├── socketActor.ts       # WebSocket: reconexão, fila offline
│   │   ├── selectors.ts         # Derivações puras (host, turno, timers)
│   │   ├── GameProvider.tsx     # Monta a máquina com o socket real
│   │   └── useGame.ts           # Hook usado pelas telas
│   ├── components/Toast.tsx     # Avisos (DOM, fora do canvas)
│   ├── scenes/                  # Telas como funções puras → TileSpec[] (F4)
│   ├── engine/                  # Engine Pixi: Stage, layout, TileLayer, Tile, pool (F2), FxLayer (F5)
│   ├── motion/                  # Tokens, coreografias puras, Director (anime.js), ponte com o ticker (F3) e planos de FX (F5)
│   ├── app/                     # App, GameCanvas, HiddenInput, estado local da UI e efeitos
│   ├── theme/                   # Paleta OKLCH dos tiles e conversão para sRGB
│   ├── dev/                     # Playgrounds só de dev: /dev/engine e /dev/motion
│   ├── lib/                     # env (VITE_WS_URL), overlap da corrente, sanitize
│   └── main.tsx
├── package.json
└── vite.config.ts
```

---

## 🚀 Instalação e Execução

### Pré-requisitos
- Node.js >= 18.x
- npm ou yarn

### Passos

1. **Instalar dependências**:
   ```bash
   npm install
   ```

2. **Executar em ambiente de desenvolvimento**:
   ```bash
   npm run dev
   ```

3. **Build para produção**:
   ```bash
   npm run build
   ```

4. **Linting de código**:
   ```bash
   npm run lint
   ```

### Testar de ponta a ponta sem deploy

O backend tem um servidor local que roda o jogo de verdade com estado em memória:

```bash
# em word-chain-backend/lambda, com o venv ativo
python -m local.server --port 3001
```

Aponte o cliente para ele com `VITE_WS_URL=ws://localhost:3001` no `.env.local` e rode `npm run dev`, ou rode a partida automatizada:

```bash
E2E_WS_URL=ws://localhost:3001 npm run e2e
```

O e2e sobe o Vite na porta 5174 e reaproveita um servidor que já esteja nela; se a porta estiver ocupada por outro `npm run dev`, use `E2E_PORT=5175`.

---

## 🗺️ Próximos Passos

Consulte o documento completo [new-grid-layout-spec.md](./docs/new-grid-layout-spec.md) para detalhes do roadmap de implementação a partir do primeiro commit da branch `new-grid-layout` (`3d4c5a7`).