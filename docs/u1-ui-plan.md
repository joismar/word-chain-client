# U1 — Redesenho da UI: HUD × tabuleiro

> Fase intermediária do `docs/refactor-plan.md`, entre F5 e F6. **Concluída em 2026-10-23**; F6, F7 e B3 estão liberadas.
> Referência visual: `docs/design/index.html` (com `npm run dev`, abra `/docs/design/`). Tokens e regras: `docs/design-system.md`.
> Decidido em 2026-10-23, depois de explorar dois estilos (uma placa recortada na grade com HUD em tiles vazados, e uma bandeja escura sobre papel com HUD em DOM). Ficou uma mistura: a grade e os tiles de hoje, com o HUD da bandeja.

## 1. Problema

Hoje relógio, placar, voltar, configurar e botões são tiles iguais às palavras do jogo: HUD e jogo se confundem. O placar não aparece durante a partida, as ações ficam no meio da tela (longe do polegar no celular) e a mensagem de erro é um texto DOM solto.

## 2. Decisão

- **Fundo**: a grade atual cobre a tela; a área central encaixa nela. As casas vazias perto da borda da tela somem ao acaso (degradê pixelado, `board.edgeFade.*`).
- **Tiles**: voltam a ter a faixa de sombra dentro da casa (face 90%, sombra 10%), como antes da F5. Campos de texto em cinza (`stone`).
- **HUD**: fora da grade, em DOM, no material de peça (face, canto `hud.radius`, sombra dura `hud.shadow`). Título no topo, relógio e chips dos jogadores, ações na base, mensagem acima das ações.

### Telas

Coordenadas em casas, com (0,0) no centro (como nas cenas). "Grade" = tiles; "HUD" = DOM.

| Tela | Grade | HUD |
| :--- | :--- | :--- |
| Início | `CRIAR` (−1), `ENTRAR` (+1), tocáveis, amber | Logo `WORD`/`CHAIN` em escada no topo |
| Criar sala | `APELIDO` (−2), campo de 10 (0) | `<`, título `CRIAR`; ação `CRIAR SALA ↵` (primária, emerald) |
| Entrar | `APELIDO` (−4), campo 10 (−2), `SALA` (+1), campo 6 (+3) | `<`, título `ENTRAR`; ação `ENTRAR ↵` |
| Sala | Só os participantes: nome no tom do jogador e ✓/✕ uma casa depois do nome mais longo | `<`, título `SALA: <NOME>` + copiar, `⚙`; ações `PRONTO` (soft) e `INICIAR` (primária, só host); convidado pronto vê `ESPERAR` (neutra) |
| Configurações | (sala por baixo, escurecida) | Drawer em texto: de baixo no celular, pela direita no desktop. Opções atuais: tempo de partida (segmentado `3 MIN`/`5 MIN`) e repetir palavras (switch). Convidado vê só leitura com aviso. A lista é feita para crescer |
| Contagem | `PARTIDA` (−4), `INICIA EM` (−3), tile do número na linha +3, crescendo 3×3 → 5×5 → 7×7 casas, com pop | Relógio parado, chips sem destaque |
| Minha vez | Campo de 12 casas na última linha livre acima da mensagem e das ações; corrente (até 5 palavras, quantas couberem abaixo dos chips) com a mais nova duas linhas acima | Relógio, chips (o meu na cor, com segundos e barra); ações `PASSAR` (soft rose) e `ENVIAR ↵` (primária emerald, desabilitada sem texto) |
| Vez do outro | Corrente e campo desabilitado (sem cursor, `slot.disabledAlpha`) | Chip de quem joga destacado; ações desabilitadas. Sem `VEZ DE …` |
| Palavra inválida | Campo em rose com shake | Mensagem `PALAVRA NÃO EXISTE` acima das ações |
| Teclado aberto | Mesma regra: campo logo acima das ações, corrente com o que couber (até 5) | Relógio e chips numa linha só no topo; ações acima do teclado |
| Fim | Classificação: posição, nome no tom, pontos (o primeiro em amber) | Título `FIM`; ação `NOVO JOGO` |

A tela "conectando" continua como está (hoje o menu já aparece antes de conectar).

## 3. Arquitetura

- **Cenas** (`src/scenes/*`): continuam puras. `Scene` passa a ser `{ tiles, fields, hud }`, com `hud` semântico e sem estilo: `title` (texto, `copy?`), `back?`, `settings?`, `logo?`, `clock?` (segundos, fração), `players?` (id, nome, tom, pontos, vez, segundos, fração), `actions` (id, rótulo, tom, `primary?`, `disabled?`, `glyph?`), `toast?`, `drawer?`, `compact`. Os snapshots ganham o HUD em texto.
- **Coordenadas**: as linhas fixas das cenas saem das bordas. A grade só tem conteúdo de jogo, e o topo e a base são do HUD.
- **HUD** (`src/app/hud/*`, React): `TitleBar`, `Clock`, `PlayerChips`, `Actions`, `Toast`, `SettingsDrawer`, todos sobre um componente `Piece` (o material). Ações viram os mesmos comandos de hoje (`onAction`). Fica fácil dar foco, rótulos e região `aria-live` (adianta a F6).
- **Engine**:
  - `BoardBackground` pula as casas sorteadas pelo `edgeFade`. A função é pura (`row, col, area, tokens`), testada sem canvas.
  - `Tile` volta a desenhar a faixa de sombra (`tile.shadow`, `tile.shadowDelta`); `palette.ts` ganha a cor da sombra por tom.
  - Tile grande: `TileSpec` ganha `span` (n×n casas, ímpar) para a contagem. Layout e hit area usam o span; motion de pop com tokens.
  - Slots continuam como face translúcida, sem a faixa de sombra.
- **Tokens**: `src/theme/tokens.ts` (geometria, fade, HUD, drawer) e `src/theme/palette.ts` (cores novas); o HUD lê os mesmos tokens via variáveis CSS geradas a partir deles, para não duplicar números.
- **Texto**: a contagem diz `INICIA EM` (em vez de `COMEÇA EM`), então a fonte dos tiles continua sem `Ç` e todo texto da grade segue passando por `toBoardText`.

## 4. Passos

- [x] Capturas das telas antigas e estudo com dois estilos (descartados depois da escolha)
- [x] Direção escolhida e referência viva (`docs/design/index.html`)
- [x] Design system com os tokens (`docs/design-system.md`)
- [x] Tokens no código: `theme/tokens.ts`, cores novas em `palette.ts` (testes de gamut/contraste para as peças de HUD), novos números de motion em `motion/tokens.ts`
- [x] Fundo: `edgeFade` puro + `BoardBackground` (casas sob um tile nunca somem); tile com faixa de sombra
- [x] Contrato `Scene.hud` e cenas reescritas (sala, configurações, contagem, vez do outro, fim), com snapshots
- [x] Componentes de HUD em DOM sobre o canvas (`Piece`, título, relógio, chips, ações, mensagem)
- [x] Drawer de configurações (celular de baixo, desktop pela direita; host edita, convidado lê)
- [x] Tile grande da contagem (`span`) com pop
- [x] ~~`Ç` na fonte dos tiles~~: a contagem passou a dizer `INICIA EM`
- [x] Layout compacto com teclado aberto (`visualViewport`)
- [x] e2e: `findWord` só no tabuleiro; HUD por papel/rótulo (`hudButton`, `turnChip`); `match.spec.ts` sem `VEZ DE …`
- [x] Atualizar `CLAUDE.md` e a seção 3 do `refactor-plan.md`; marcar a U1 como concluída

### Como ficou

- `Scene` é `{ tiles, fields, hud }`; `scenes/testing.ts` ganhou `hud()` para os snapshots. A mensagem do servidor entra em qualquer tela por `sceneFor` (`ui.notice`, 3 s), em maiúsculas e sem o ponto final.
- O HUD (`src/app/hud/`) é filho do `GameCanvas`, então acompanha o `visualViewport`: com o teclado aberto as ações ficam logo acima dele. `compact` vem das linhas do tabuleiro (`board.compactRows`).
- As cores das peças saem de `pieceColors` (`palette.ts`) e entram como variáveis inline; geometria e tempos entram como variáveis CSS geradas por `hudCssVars` e `motionCssVars`. `hud.css` não tem números próprios.
- O dígito da contagem usa um segundo atlas (`TileFontLarge`, só dígitos, 160 px) para não borrar no 7×7.
- Copiar o nome da sala troca o ícone por ✓ por 2 s (resolve o primeiro ponto em aberto).

## 5. Em aberto

- ~~Copiar o nome da sala: confirmação visual~~: o ícone vira ✓ por 2 s.
- Duração do turno: o protocolo só manda o prazo (`turnDeadline`), então a barra do chip usa `TURN_MS = 15 000` espelhado do backend (`entities/session.py`). Mandar a duração no `GameState` (ou na config) tira essa cópia.
- O drawer do convidado mostra a config do servidor; a escolha do host só chega a ele no `start`. Se o convidado precisar ver a escolha antes, o backend precisa de uma mensagem de config na sala.
- Desktop: o HUD fica ancorado nas bordas da janela, e em telas muito largas o relógio pode ficar longe da corrente. Avaliar uma largura máxima para a faixa de HUD.
- Opções futuras do drawer (ex.: tempo por turno) dependem do backend.
