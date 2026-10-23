# U1 — Redesenho da UI: HUD × tabuleiro

> Fase intermediária do `docs/refactor-plan.md`, entre F5 e F6. **F6, F7 e B3 ficam bloqueadas até a U1 terminar.**
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
| Contagem | `PARTIDA` (−4), `COMEÇA EM` (−3), tile do número na linha +3, crescendo 3×3 → 5×5 → 7×7 casas, com pop | Relógio parado, chips sem destaque |
| Minha vez | Corrente (6 palavras, a mais nova na linha +1) e campo de 12 casas na linha +3 | Relógio, chips (o meu na cor, com segundos e barra); ações `PASSAR` (soft rose) e `ENVIAR ↵` (primária emerald, desabilitada sem texto) |
| Vez do outro | Corrente e campo desabilitado (sem cursor, `slot.disabledAlpha`) | Chip de quem joga destacado; ações desabilitadas. Sem `VEZ DE …` |
| Palavra inválida | Campo em rose com shake | Mensagem `PALAVRA NÃO EXISTE` acima das ações |
| Teclado aberto | Corrente com 3 palavras, campo na linha +1 | Relógio e chips numa linha só no topo; ações acima do teclado |
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
- **Texto**: `Ç` na fonte dos tiles. `toBoardText` tira acentos (NFD), então texto fixo de interface precisa de um caminho que preserve o `Ç` (ou uma exceção na sanitização).

## 4. Passos

- [x] Capturas das telas antigas e estudo com dois estilos (descartados depois da escolha)
- [x] Direção escolhida e referência viva (`docs/design/index.html`)
- [x] Design system com os tokens (`docs/design-system.md`)
- [ ] Tokens no código: `theme/tokens.ts`, cores novas em `palette.ts` (testes de gamut/contraste para as peças de HUD), novos números de motion em `motion/tokens.ts`
- [ ] Fundo: `edgeFade` puro + `BoardBackground`; tile com faixa de sombra
- [ ] Contrato `Scene.hud` e cenas reescritas (sala, configurações, contagem, vez do outro, fim), com snapshots
- [ ] Componentes de HUD em DOM sobre o canvas (`Piece`, título, relógio, chips, ações, mensagem)
- [ ] Drawer de configurações (celular de baixo, desktop pela direita; host edita, convidado lê)
- [ ] Tile grande da contagem (`span`) com pop
- [ ] `Ç` na fonte dos tiles
- [ ] Layout compacto com teclado aberto (`visualViewport`)
- [ ] e2e: `findWord` só no tabuleiro; HUD por papel/rótulo (`getByRole('button', { name: 'ENVIAR' })`); revisar `match.spec.ts` (sem `VEZ DE …`)
- [ ] Atualizar `CLAUDE.md` e a seção 3 do `refactor-plan.md`; marcar a U1 como concluída

## 5. Em aberto

- Copiar o nome da sala: confirmação visual (troca o ícone por ✓ por um instante ou mostra uma mensagem no HUD).
- Desktop: o HUD fica ancorado nas bordas da janela, e em telas muito largas o relógio pode ficar longe da corrente. Avaliar uma largura máxima para a faixa de HUD.
- Opções futuras do drawer (ex.: tempo por turno) dependem do backend.
