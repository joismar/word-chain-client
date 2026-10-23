# Design system — Word Chain

> Fonte dos tokens visuais da U1 (`docs/u1-ui-plan.md`). A referência viva é `docs/design/index.html` (com `npm run dev`, abra `/docs/design/`): cada ajuste do painel corresponde a um token desta página, e "Copiar ajustes" gera os valores. O zoom da galeria não é token.
>
> Ao implementar, os tokens vão para o código e esta página aponta para lá: cores em `src/theme/palette.ts`, geometria e HUD num novo `src/theme/tokens.ts`, animação em `src/motion/tokens.ts`. Nenhum número visual fora desses arquivos (a mesma regra que o motion já segue).

## 1. Princípios

1. **O fundo é o tabuleiro.** A grade cobre a tela toda e o conteúdo do jogo encaixa nela (sem placa ou bandeja separando uma área jogável).
2. **Tile é jogo, peça é HUD.** Letras na grade só para o que é jogo: participantes, corrente, campo da palavra, palavras de menu, contagem. Título, relógio, jogadores, ações, mensagens e configurações são **peças de HUD** em DOM, fora da grade.
3. **Um material só para HUD e tiles.** Face lisa, cantos levemente arredondados e sombra dura embaixo, como uma peça. No tile a sombra é uma faixa dentro da própria casa; na peça de HUD, ela fica por baixo.
4. **Bordas que se desfazem.** Perto da borda da tela, as casas vazias somem ao acaso, num degradê pixelado.
5. **Cor diz quem é, não o que é.** As faces dos tiles têm a mesma luminosidade e croma; só o matiz muda (um por jogador). Texto de campo é cinza (`stone`).

## 2. Cor (OKLCH)

Já existentes em `theme/palette.ts` (F5), sem mudança:

| Token | Valor | Uso |
| :--- | :--- | :--- |
| `FACE` | `l 0.53, c 0.105` | Face de todo tile; o matiz vem do tom |
| `TEXT` | `l 0.97, c ≤ 0.025` | Letra sobre a face (contraste AA testado) |
| `TONE_COLORS` | stone `h60 c0.012` · brown `h55 c0.06` · amber `h75` · orange `h48` · rose `h18` · pink `h350` · purple `h305` · sky `h240` · emerald `h160` | Tons; um por cor de jogador (`playerTone`) |
| `SLOT_ALPHA` | `0.22` | Casa vazia de um campo ativo |
| `BOARD_COLORS.background` | `l 0.268, c 0.007, h 34.3` | Fundo (e `index.css`) |
| `BOARD_COLORS.emptyCell` | `l 0.228, c 0.006, h 34.3` | Casa vazia da grade |
| `BOARD_COLORS.cursor` | `l 0.82, c 0.01, h 60` | Cursor do campo |

Novos:

| Token | Valor | Uso |
| :--- | :--- | :--- |
| `tile.shadowDelta` | `l −0.12` (mesmo c e h da face) | Faixa de sombra do tile |
| `slot.disabledAlpha` | `0.14` | Campo desabilitado (vez do outro) |
| `hud.ink` | `l 0.93, c 0.01, h 60` | Texto de HUD sobre o fundo (títulos) |
| `hud.muted` | `l 0.72, c 0.01, h 60` | Texto secundário (descrições no drawer) |
| `hud.piece.solid` | face do tom (`FACE`) + texto `TEXT` | Ação primária, chip do jogador da vez, mensagem |
| `hud.piece.neutral` | `l 0.355, c 0.012, h 60`; texto `hud.ink` | Ícones, relógio, chips fora da vez, opções não selecionadas |
| `hud.piece.soft` | `l 0.355, c 0.03, h` do tom; texto `l 0.82, c 0.1` | Ação secundária com tom (PASSAR, PRONTO) |
| `hud.piece.disabled` | `l 0.3, c 0.008`; texto `l 0.55, c 0.01` | Ação indisponível |
| `hud.shadowDelta` | `l −0.15` da face da peça | Sombra da peça de HUD |
| `hud.chip.activeMini` | `l 0.96, c 0.02`; letra `l 0.45, c 0.105` no matiz do jogador | Mini-tile dentro do chip da vez (invertido) |
| `hud.meter` | `currentColor` a 45% | Barra de tempo no relógio e no chip da vez |
| `drawer.surface` | `l 0.235, c 0.008, h 40` | Fundo do drawer |
| `drawer.divider` | `l 0.30, c 0.008, h 40` | Linha entre opções |
| `drawer.handle` | `l 0.42, c 0.01, h 40` | Alça do drawer (celular) |
| `scrim` | `l 0.12, c 0.005, h 34` a 60% | Fundo escurecido sob o drawer |

## 3. Grade e tiles

Já existentes (`engine/layout.ts`, `engine/Tile.ts`):

| Token | Valor | Uso |
| :--- | :--- | :--- |
| `board.maxPitch` | `28.8 px` | Casa + espaço em telas largas |
| `board.minCols` | `15` | Colunas garantidas (encolhe a casa no celular) |
| `board.gapRatio` | `0.111` (0.2/1.8) | Fração do pitch que é espaço entre casas (ajuste "Espaço entre casas") |
| `tile.radius` | `0.08` da casa | Arredondamento do tile e da casa vazia (ajuste "Tiles: arredondamento") |

Novos:

| Token | Valor | Uso |
| :--- | :--- | :--- |
| `tile.shadow` | `0.1` da casa | Altura da faixa de sombra; a face ocupa os 90% de cima e a letra centraliza na face (ajuste "Tiles: sombra"). É o desenho original de antes da F5 |
| `board.edgeFade.depth` | `3` casas | Até onde, a partir da borda da tela, casas podem sumir |
| `board.edgeFade.density` | `0.5` | Chance de sumir na casa da borda |
| `board.edgeFade.curve` | `1.4` | Expoente da queda: `chance = density × (1 − d/depth)^curve`, com `d` = casas até a borda mais próxima |
| `board.edgeFade.seed` | `7` | Semente do sorteio; o sorteio é um hash estável de `(row, col, seed)`, então nada pisca entre telas nem em re-render |
| `countdown.spans` | `3, 5, 7` casas | Lado do tile do número para 3, 2 e 1 (cresce a cada segundo; tamanho = `n × pitch − gap`) |
| `countdown.tones` | amber, orange, rose | Tom do número para 3, 2 e 1 |

Só casas **vazias** somem no fade: tiles nunca. Com 15 colunas e `depth 3`, o conteúdo das telas (até 12 colunas de campo) não encosta na faixa mais rala.

## 4. HUD

| Token | Valor | Uso |
| :--- | :--- | :--- |
| `hud.radius` | `6 px` | Cantos das peças (ajuste "HUD: arredondamento"); mini-tile `× 0.7`, botão do switch `× 0.6` |
| `hud.shadow` | `3 px` | Sombra dura por baixo (ajuste "HUD: sombra"). Pressionar ou desabilitar desce a peça `hud.shadow` px e tira a sombra |
| `hud.inset.top` / `.side` | `14 px` / `14 px` | Margem da barra de título |
| `hud.inset.bottom` / `.side` | `18 px` / `16 px` | Margem da linha de ações |
| `hud.playersTop` | `64 px` | Linha dos chips abaixo do relógio |
| `hud.toastBottom` | `84 px` | Mensagem logo acima das ações |
| `hud.gap` | `10 px` (barra, ações), `8 px` (chips), `6 px` (chips compactos, segmentado) | Espaço entre peças |
| `hud.icon` | `40 × 40 px`, glifo `17 px` | `<`, `⚙`, fechar (`34 px` no drawer) |
| `hud.copy` | `30 × 30 px`, ícone `15 px` | Copiar nome da sala |
| `hud.button` | altura `50 px`, largura máx. `230 px`, texto `15 px / 600 / 0.1em`, glifo `18 px` | Ações da base |
| `hud.clock` | altura `38 px`, largura mín. `84 px`, texto `17 px` tabular | Relógio da partida |
| `hud.chip` | altura `34 px`, mini `26 px`, texto `13 px`; compacto `30 / 22 / 11 px` | Jogador: mini-tile com a inicial, nome, pontos; o da vez com segundos |
| `hud.meter` | altura `3 px` | Barra de tempo no pé do relógio e do chip |
| `hud.toast` | altura `32 px`, texto `12 px / 0.1em` | Mensagem de erro |
| `hud.title` | `15 px / 600 / 0.16em` | Título da tela |
| `hud.logo` | tiles de `23 px`, passo `26 px`, `WORD` / `CHAIN` em escada | Logo do início |
| `font` | Commit Mono 400/600 | Tudo, DOM e tiles |

## 5. Drawer de configurações

| Token | Valor | Uso |
| :--- | :--- | :--- |
| `drawer.radius` | `16 px` | Cantos voltados para a tela |
| `drawer.sideWidth` | `380 px` | Largura no desktop (abre pela direita; no celular sobe de baixo, largura total) |
| `drawer.padding` | `10 20 24 px` (celular), topo `22 px` (desktop) | |
| `drawer.option` | padding `14 px 0`, título `14 px / 600`, descrição `12 px` `hud.muted` | Uma opção por linha |
| `drawer.segmented` | altura `32 px`, texto `12 px` | Escolha entre poucos valores; selecionado = peça sólida no tom da opção |
| `drawer.switch` | `52 × 30 px`, botão `22 px` | Liga/desliga |

## 6. Motion (novos, para `motion/tokens.ts`)

| Token | Valor | Uso |
| :--- | :--- | :--- |
| `duration.countdownPop` | `520 ms`, `cubic-bezier(.2, 1.6, .4, 1)` | Pop do tile da contagem a cada número |
| `scale.countdownFrom` | `0.35` | Escala inicial do pop |
| `opacity.countdownFlash` | brilho `1.6 → 1` | Flash do número ao entrar (no Pixi: canal `flash`) |
| `press` (HUD) | desce `hud.shadow` px, sem sombra | Pressionar uma peça de HUD |

`prefers-reduced-motion`: o pop vira troca simples de número; o shake e o caret seguem as regras atuais.

## 7. Tipos de texto na grade

- Texto fixo de interface na grade (`PARTIDA`, `COMEÇA EM`, `APELIDO`, `SALA`) usa o tom `amber`.
- Campos (letras digitadas e casas vazias) usam `stone`; erro troca para `rose` com shake.
- A fonte dos tiles precisa de `Ç` (`COMEÇA`): incluir em `BOARD_SYMBOLS` / no atlas. Texto vindo do servidor continua passando por `toBoardText`.
