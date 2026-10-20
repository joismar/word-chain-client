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

- **Framework**: [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler & Dev Server**: [Vite](https://vitejs.dev/)
- **Estilização**: [Tailwind CSS](https://tailwindcss.com/) + PostCSS
- **Reatividade & Fluxo**: [RxJS 7](https://rxjs.dev/) (Subjects, Observables)
- **Animações de UI**: [@react-spring/web](https://www.react-spring.dev/)
- **Comunicação em Tempo Real**: WebSocket nativo integrado a AWS API Gateway WebSocket

---

## 🏛️ Arquitetura do Projeto

### Padrão BLoC (Business Logic Component)

A lógica de conexão e estado do jogo é desacoplada da camada visual através da classe `GameBloc` (`bloc/GameBloc.ts`) e consumida via React Context (`src/providers/GameBlocProvider.tsx`):

```
┌─────────────────────────────────┐
│     AWS API Gateway WebSocket   │
└───────────────▲─────────────────┘
                │ Raw JSON
┌───────────────▼─────────────────┐
│         SocketWrapper           │
└───────────────▲─────────────────┘
                │ Event Listeners
┌───────────────▼─────────────────┐
│            GameBloc             │  ◄── Streams RxJS (gameStream, playerStream,
└───────────────▲─────────────────┘      errorStream, connectionStream, actionStateStream)
                │ useGameBloc Hook
┌───────────────▼─────────────────┐
│       GameBlocProvider          │  ◄── React Context
└───────────────▲─────────────────┘
                │
┌───────────────▼─────────────────┐
│        React UI Screens         │  (Home, Lobby, Game, End / GridLayout)
└─────────────────────────────────┘
```

### Fluxo de Estado e Telas

O estado da partida determina a transição automática entre as telas:
- `GameStatus.CREATED` (0) → Tela de **Lobby**
- `GameStatus.STARTED` (1) → Tela de **Game**
- `GameStatus.ENDED` (2) → Tela de **End**

---

## 📡 Protocolo WebSocket

**Endpoint padrão**: `wss://h9qktxoj4a.execute-api.sa-east-1.amazonaws.com/dev`

### Ações Enviadas pelo Cliente

Todos os envios utilizam a interface `EventAction`:
```typescript
{
  action: Action; // 'host' | 'join' | 'status' | 'start' | 'word' | 'pass' | 'end'
  data: string[];
}
```

| Ação (`Action`) | Descrição | Formato do `data` |
| :--- | :--- | :--- |
| `host` | Cria uma nova sala | `[playerName]` |
| `join` | Entra em uma sala existente | `[gameName, playerName]` |
| `status` | Altera status do jogador (Pronto) | `['1']` (Ready) ou `['0']` (Waiting) |
| `start` | Inicia a partida (Host apenas) | `[durationMinutes, allowRepetition]` (ex: `['3', 'true']`) |
| `word` | Envia uma nova palavra na sua vez | `[word]` (convertido para minúsculas) |
| `pass` | Passa o turno | `[]` |
| `end` | Encerra a partida | `[]` |

### Eventos Recebidos do Servidor

| Evento | Payload (`event.data`) | Ação no BLoC |
| :--- | :--- | :--- |
| `open` | Evento de conexão aberta | Atualiza `connectionStream` para `CONNECTED` |
| `close` | Evento de desconexão | Atualiza `connectionStream` para `DISCONNECTED` |
| `game_data` | `{ data: GameData }` | Atualiza `gameStream` |
| `host` | `{ data: { player: Player, game: GameData } }` | Salva o jogador e o jogo no estado |
| `join` | `{ data: Player }` | Salva os dados do jogador atual |
| `any` | `{ action: Action, data?: { error?: string, message?: string } }` | Atualiza `actionStateStream` e emite erro para `errorStream` |

### Modelos de Dados

```typescript
// shared/interfaces.ts
export interface Player {
  id: string;
  session_id: string | null;
  name: string;
  score: number;
  color: PlayerColor;
  status: PlayerStatus; // WAITING = 0, READY = 1
  last_word_time: number;
}

export interface GameData {
  name: string;
  status: GameStatus; // CREATED = 0, STARTED = 1
  chain: Word[];
  players: Player[];
  turn: number;
  started_at: number;
  config: {
    repetition: boolean;
    time: number;
  };
}
```

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
├── bloc/
│   └── GameBloc.ts              # Camada de lógica de negócio e streams RxJS
├── shared/
│   ├── enums.ts                 # Enums: Action, PlayerStatus, PlayerColor, etc.
│   ├── interfaces.ts            # Interfaces de dados do jogo e mensagens
│   └── SocketWrapper.ts         # Wrapper sobre WebSocket nativo
├── src/
│   ├── components/
│   │   ├── CustomInput.tsx      # Input integrado ao sistema de grade
│   │   ├── Grid.tsx             # Componente base de renderização da matriz CSS Grid
│   │   ├── GridLayout.tsx       # Layout orquestrador da grade responsiva e letras
│   │   ├── Letter.tsx           # Bloco visual unitário de letra com sombras e cores
│   │   ├── Word.tsx             # Palavra encadeada na UI clássica
│   │   ├── Timer.tsx            # Componente de contagem regressiva
│   │   ├── Toast.tsx            # Gerenciador global de notificações toast
│   │   └── Modal.tsx, Avatar... # Componentes visuais auxiliares
│   ├── hooks/
│   │   ├── useGameBloc.ts       # Hook de integração React <-> GameBloc
│   │   ├── useWordAnimations.ts # Hook de animações via @react-spring/web
│   │   ├── useVisualViewport.ts # Detecção e monitoramento de viewport responsivo
│   │   └── useSchedule.ts...    # Hooks auxiliares
│   ├── providers/
│   │   └── GameBlocProvider.tsx # Context Provider do GameBloc
│   ├── screens/
│   │   ├── Home.tsx             # Tela inicial (versão clássica)
│   │   ├── Lobby.tsx            # Sala de espera e configurações (versão clássica)
│   │   ├── Game.tsx             # Partida em andamento (versão clássica)
│   │   └── End.tsx              # Tela de pontuação e ranking (versão clássica)
│   ├── App.tsx                  # Componente raiz / protótipo do Grid Layout
│   └── main.tsx                 # Entrypoint da aplicação React
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

---

## 🗺️ Próximos Passos

Consulte o documento completo [new-grid-layout-spec.md](./docs/new-grid-layout-spec.md) para detalhes do roadmap de implementação a partir do primeiro commit da branch `new-grid-layout` (`3d4c5a7`).