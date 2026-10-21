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
- [Sistema de Grid Layout (Branch `new-grid-layout`)](#-sistema-de-grid-layout-branch-new-grid-layout)
  - [Sistema de Coordenadas Centrado](#sistema-de-coordenadas-centrado)
  - [Animações com `@react-spring/web`](#animações-com-react-springweb)
  - [Input Customizado na Grade](#input-customizado-na-grade)
- [Estrutura de Pastas](#-estrutura-de-pastas)
- [Instalação e Execução](#-instalação-e-execução)
- [Próximos Passos](#-próximos-passos)

---

## 🎯 Visão Geral

O **Word Chain** é um jogo de vocabulário e agilidade mental onde:
1. Um jogador cria uma sala (*Host*) ou entra em uma existente via código (*Join*).
2. O Host define configurações da partida (duração de 3 ou 5 minutos, penalidade de repetição de palavras).
3. Durante a partida, os jogadores se revezam enviando palavras que devem começar com as letras finais da palavra anterior (ou sobreposição válida calculada por `countOverlapStartEnd`).
4. Cada rodada conta com timer geral da partida e timer por turno (15 segundos).
5. No fim do tempo, a tela de encerramento exibe o ranking final e pontuações calculadas.

---

## 🛠️ Tecnologias Utilizadas

- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler & Dev Server**: [Vite](https://vitejs.dev/)
- **Estilização**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Estado**: [XState v5](https://stately.ai/docs) (`gameMachine` + `socketActor`)
- **Protocolo**: [zod](https://zod.dev/) espelhando o JSON Schema do backend (protocolo v2)
- **Animações de UI**: [@react-spring/web](https://www.react-spring.dev/) (até a engine Pixi da refatoração)
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
│        React UI Screens         │  (Home, Lobby, Game, End / GridLayout)
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

## 🎨 Sistema de Grid Layout (Branch `new-grid-layout`)

A branch `new-grid-layout` reformula toda a experiência de interface do Word Chain, transformando a visualização em uma grade 2D interativa baseada em células tipográficas dinâmicas.

### Sistema de Coordenadas Centrado

- A grade calcula dinamicamente linhas e colunas ímpares com base no `useVisualViewport`:
  $$\text{gridRows} = \text{round}\left(\frac{\text{viewportHeight}}{\text{itemSize} + \text{itemGap}}\right)$$
- O centro exato da tela é o ponto **`(0, 0)`**.
- Células e palavras são indexadas por strings `"linha,coluna"` (ex: `"-4,-3"`, `"0,0"`, `"4,5"`).

```
         (-Y) Topo
            │
(-X) ──────(0,0)────── (+X)
 Esquerda   │           Direita
         (+Y) Base
```

### Animações com `@react-spring/web`

O hook `useWordAnimations.ts` gerencia 3 níveis de animações reativas:
1. **Propagate Hover**: Efeito ondulatório nos caracteres vizinhos ao passar o mouse sobre uma letra (`propagateProps`).
2. **Hidden/Reveal Scale**: Animação de entrada e saída com efeito elástico escalonado letra a letra (`hiddenProps`).
3. **Spatial Shift**: Deslocamento físico de palavras na grade de uma coordenada antiga para uma nova (`newIndexProps`).

### Input Customizado na Grade (`CustomInput.tsx`)

Combina um `<input>` nativo transparente (que captura teclado físico e virtual mobile) com blocos renderizados na grade:
- Cursor piscante sincronizado com o índice da letra digitada (`animate-blink`).
- Converte entradas automaticamente para minúsculas.
- Renderização visual das letras respeitando o design system de blocos com relevo e sombra.

---

## 📁 Estrutura de Pastas

```
word-chain-client/
├── e2e/                         # Playwright: smoke e partida completa (match.spec.ts)
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
│   ├── components/              # GridLayout, CustomInput, Toast...
│   ├── hooks/                   # useWordAnimations, useVisualViewport...
│   ├── screens/grid/            # HomeGrid, LobbyGrid, SettingsGrid, GameGrid, EndGrid
│   ├── lib/env.ts               # Leitura de VITE_WS_URL
│   ├── App.tsx
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

---

## 🗺️ Próximos Passos

Consulte o documento completo [new-grid-layout-spec.md](./docs/new-grid-layout-spec.md) para detalhes do roadmap de implementação a partir do primeiro commit da branch `new-grid-layout` (`3d4c5a7`).