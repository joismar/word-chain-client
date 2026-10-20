# Especificação Técnica: Branch `new-grid-layout`

## 1. Visão Geral e Motivação da Branch

A branch `new-grid-layout` tem como objetivo substituir a interface de usuário tradicional baseada em flexbox/scroll linear por um **Grid Layout 2D Reativo**, inspirado em jogos de palavras digitais modernos (como Wordle, Scrabble e tabuleiros tipográficos interativos).

Nessa nova proposta:
- A tela inteira se torna uma grade calculada dinamicamente com base nas dimensões do viewport (`useVisualViewport`).
- Cada elemento textual, botão, input ou palavra encadeada ocupa posições em coordenadas cartesianas relativas ao centro `(0,0)`.
- As transições de tela e interações (digitação, hover, confirmação, transições de estado) utilizam animações físicas com `@react-spring/web`.

---

## 2. Análise do Primeiro Commit (`3d4c5a7` - "feat: first layout refactors")

O commit `3d4c5a7` estabeleceu os alicerces do motor de grid e prototipou o fluxo de Home/Menu.

### 2.1 Principais Arquivos Introduzidos/Modificados:

1. **`src/components/Grid.tsx`**:
   - Renderiza a matriz física de células `<div className="bg-stone-900">` usando CSS Grid (`repeat(N, ${itemWidth}rem)`).
   - Calcula o `centerCell` para mapear coordenadas da grade em `[rowIndex - centerCell[0], colIndex - centerCell[1]]`.

2. **`src/components/GridLayout.tsx`**:
   - Calcula a quantidade de linhas (`gridRows`) e colunas (`gridCols`) garantindo que sejam **sempre ímpares**, para que a célula `(0,0)` seja exatamente o centro da tela.
   - Gerencia o dicionário de itens `GridItems` indexados por `"${row},${col}"`.
   - Renderiza componentes `Word`, `Letter` e `CustomInput` associados às suas coordenadas.

3. **`src/components/CustomInput.tsx`**:
   - Input invisível `<input className="opacity-0 pointer-events-none">` que recebe foco real e eventos de teclado.
   - Projeta visualmente as letras digitadas nas células da grade com animações de escala e cursor intermitente (`blink`).

4. **`src/hooks/useWordAnimations.ts`**:
   - Hook de física com `@react-spring/web` para:
     - `hiddenProps`: escala escalonada com delay por caractere (`scale: 0 -> 1`).
     - `propagateProps`: efeito de onda no eixo Y quando o mouse passa sobre uma letra.
     - `newIndexProps`: interpolação suave de deslocamento entre coordenadas `(x, y)` e `(newX, newY)`.

5. **`src/hooks/useVisualViewport.ts`**:
   - Monitora `window.visualViewport` para largura e altura reais, reagindo corretamente a redimensionamentos e teclados virtuais em dispositivos móveis.

6. **`src/App.tsx` (Estado Provisório)**:
   - Prototipou os estados locais do menu inicial:
     - Estado inicial: `CRIAR` em `(-4, -3)` e `ENTRAR` em `(-1, -3)`.
     - Ao clicar em `CRIAR`: altera para `APELIDO`, exibe input de jogador em `(-3, -3)`, exibe botão voltar `<` em `(-4, -5)` e botão confirmar `↵` em `(4, 5)`.
     - Ao clicar em `ENTRAR`: altera para `APELIDO` e `SALA`, exibe inputs de jogador e sala em `(-3, -3)` e `(0, -3)`.
   - `GameBlocProvider` foi temporariamente comentado em `main.tsx` durante a construção do layout visual.

---

## 3. Especificação do Sistema de Coordenadas e Tipagem

### Estruturas de Dados:
```typescript
export type GridItemKey = `${number},${number}`; // Ex: "-4,-3", "0,0", "2,4"

export type GridItem = {
  value: string;
  onClick?: () => void;
  hover?: boolean;
  hidden?: boolean;
  newIndex?: GridItemKey;
  onFinishAnimation?: () => void;
  variant?: "default" | "input";
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  color?: "stone" | "amber" | "emerald" | "sky" | "purple" | "rose";
};

export type GridItems = { [key: GridItemKey]: GridItem };
```

### Paleta de Cores e Relevo das Células:
Cada bloco possui estilização em camadas para criar efeito tátil:
- `stone`: Padrão/Neutro (`bg-stone-600 text-stone-200`, sombra `bg-stone-700`)
- `amber`: Botões de ação e títulos (`bg-amber-600 text-amber-200`, sombra `bg-amber-700`)
- `emerald`: Confirmações e timers (`bg-emerald-600 text-emerald-200`, sombra `bg-emerald-700`)
- `sky`: Jogador ativo e informações (`bg-sky-600 text-sky-200`, sombra `bg-sky-700`)
- `purple`: Destaque e pontuação (`bg-purple-600 text-purple-200`, sombra `bg-purple-700`)
- `rose`: Cancelamento / Voltar (`bg-rose-600 text-rose-200`, sombra `bg-rose-700`)

---

## 4. Próximos Passos (Roadmap de Implementação a partir de `3d4c5a7`)

### Fase 1: Reconexão do BLoC e Conclusão da Tela Home na Grade
1. **Reativar `GameBlocProvider` em `src/main.tsx`**.
2. **Integrar `App.tsx` com `useGameBlocContext`**:
   - Conectar o botão `↵` (ou pressionamento da tecla `Enter`) ao disparo real de:
     - `sendEvent({ action: Action.HOST, data: [player] })`
     - `sendEvent({ action: Action.JOIN, data: [room, player] })`
   - Exibir feedback de carregamento (`isLoadingAction`) diretamente na grade (ex: palavra `CARREGANDO` ou spinner integrado).
   - Gerenciar mensagens de erro recebidas pelo `errorStream` (usando o `ToastManager` já presente).

### Fase 2: Conversão da Tela de Lobby para a Grade
1. **Representação dos Jogadores na Grade**:
   - Posicionar a lista de jogadores conectados em coordenadas verticais (ex: linhas `-3` a `+2`).
   - Bloco de status do jogador: `✓` (emerald) se `playerReady`, `✕` (rose) se aguardando.
2. **Código da Sala e Controles**:
   - Exibir o código da sala (ex: `SALA: ABCD`) no topo da grade.
   - Ação de copiar código da sala ao clicar no bloco do código.
   - Botão `PRONTO` para jogadores e botão `INICIAR` para o Host.
   - Configurações da partida (tempo de 3/5 min, repetição) adaptadas para seleção na grade.

### Fase 3: Conversão da Tela de Jogo (Game) para a Grade
1. **Visualização do Encadeamento (Word Chain)**:
   - Posicionar a palavra atual no centro `(0, 0)`.
   - Palavras anteriores deslocando-se suavemente para o topo (`newIndexProps`) à medida que novas palavras são submetidas.
   - Destaque visual colorido nas letras coincidentes (sobreposição calculada por `countOverlapStartEnd`).
2. **Entrada da Palavra no Turno**:
   - Quando for a vez do jogador (`isMyTurn()`), ativar o `CustomInput` posicionado logo abaixo da palavra atual (linha `+2`).
   - Pré-preencher ou destacar as letras obrigatórias do início da cadeia.
   - Submissão com `Enter` ou botão `↵`.
3. **Timers e Indicador de Turno**:
   - Exibir tempo restante da partida e tempo do turno (15s) nos cantos superiores da grade.

### Fase 4: Conversão da Tela Final (End / Ranking) para a Grade
1. **Pódio e Tabela de Pontos**:
   - Exibir título `FIM` em destaque central.
   - Listar jogadores ordenados por pontuação decrescente, associando cores e scores em blocos alinhados.
   - Botão `REINICIAR` / `NOVO JOGO` para resetar a partida e retornar ao menu.

### Fase 5: Ajustes de Responsividade, Acessibilidade e Limpeza
1. Ajustar o tamanho das células (`itemSize` e `itemGap`) dinamicamente para telas mobile menores.
2. Tratar abertura do teclado virtual no mobile para reposicionar o centro da grade sem cortar palavras.
3. Limpar código legado não utilizado (ex: hooks antigos ou componentes substituídos).
4. Executar bateria de verificação e build (`npm run build`, `npm run lint`).
