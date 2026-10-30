# S1 — Sound design

> Fase nova do `docs/refactor-plan.md`, pedida para o MVP (as fases de infra F6, F7 e B3 não bloqueiam). **Aprovado em 2026-10-30: família Madeira, som ligado por padrão.** Plano de implementação em `docs/superpowers/plans/2026-10-30-sound-design.md`.
> Audição: `docs/sound/index.html` (com `npm run dev`, abra `/docs/sound/`). Nada vai para `src/` antes da aprovação.
> Skills: `.claude/skills/ui-sound-design` (síntese, receitas, preview) e `.claude/skills/sounds-on-the-web` (regras de quando tocar, acessibilidade e Web Audio).

## 1. Objetivo

O jogo é mudo. Para o MVP, cada momento importante da partida ganha um som curto e coerente com o visual (tile liso, Commit Mono, fundo escuro e quente): você sabe que é sua vez sem olhar, sente a palavra encaixar na corrente e ouve o relógio acabando. O som complementa, nunca substitui: todo som tem um equivalente visual que já existe.

**Sucesso:** dá para jogar uma partida de olhos no teclado e entender o que aconteceu; ninguém precisa abaixar o volume do celular; desligar é um toque no drawer.

## 2. Decisões propostas

### Síntese na hora, sem arquivos

Os sons são gerados com a Web Audio API no momento de tocar, a partir de números em `src/sound/tokens.ts`, como o motion faz com `motion/tokens.ts`.

| Abordagem | Prós | Contras |
| :--- | :--- | :--- |
| **Síntese na hora** (recomendada) | Zero assets e zero dependências; números editáveis como os do motion; variação natural (cada letra soa um pouco diferente); notas que mudam com o jogo (cor do jogador, tamanho da sobreposição) | Precisa de ouvido para afinar; timbre pode variar um pouco entre navegadores |
| WAVs pré-renderizados pela mesma síntese | Som idêntico em todo lugar | Pipeline de assets, download extra, perde a variação e as notas dinâmicas |
| Biblioteca (Tone.js, Howler) | API mais curta | Dependência de ~100 kB para o que cabe em ~300 linhas |

A página de audição já baixa qualquer som como `.wav`, então a segunda opção fica de saída de emergência se algum navegador soar mal.

### Uma família, uma escala

Toda nota vem de uma pentatônica maior: duas notas quaisquer soam bem juntas, então sons que se sobrepõem (tick + pulso de turno) nunca brigam. Cada família define três instrumentos (`hit` percussivo, `note` tonal, `thud` grave e abafado) e os eventos são os mesmos nas três.

**Escolhida: Madeira** (raiz D4, MIDI 62). `hit` é um estalo de ruído em banda (~1,9 kHz) somado a uma batida senoidal que cai de altura; `note` é marimba (fundamental, 4º harmônico curto, um pouco de oitava em triângulo); `thud` é triângulo com passa-baixa e um sopro grave de ruído. Os números saem da audição como estão e vão para `sound/tokens.ts`.

Descartadas na audição: Vidro (sininhos em FM, cauda longa) e Fliperama (8-bit suave). A página continua com as três como referência.

### Mapa de eventos

| Evento | Gatilho no código | Som | Equivalente visual |
| :--- | :--- | :--- | :--- |
| Toque | `PieceButton` e tiles com `action` (evento `tap` do `Stage`) | `hit` curto | press/squash |
| Ligar / desligar | `PRONTO`, switch das configurações | dois `hit` subindo / descendo | estado do botão |
| Copiado | copiar o código da sala | `hit` + nota aguda | aviso no HUD |
| Entrou / saiu da sala | `game.players` cresce / encolhe no lobby | duas notas subindo / descendo | lista de participantes |
| Aviso | `ui.notice` | duas notas iguais, suaves | mensagem no HUD |
| Contagem | `times.startsIn` 3 → 2 → 1 → 0 | nota curta por número; acorde no JÁ | tile grande com pop |
| Digitar / apagar | `HiddenInput` muda o texto (mais / menos letras) | `hit` baixinho com variação de altura e volume | letra no slot, cursor |
| Palavra aceita | `useBoardEffects` quando a corrente cresce (o mesmo ponto do `link`) | escada de *letras em comum + 1* notas; a base sobe com a corrente | voo + partículas |
| Palavra recusada | `lastError.request === 'word'` (o mesmo ponto do `shake`) | dois `thud` descendo, sem buzz | shake + rose |
| Sua vez | troca de `turnPlayerId` para mim | duas notas subindo, na altura da minha cor | pulso + chip |
| Vez do outro | troca de `turnPlayerId` para outro | uma nota baixa na cor dele | pulso + chip |
| Relógio da vez | `times.turn` nos últimos 10 s (o mesmo `tick`) | `hit` agudo; nos 3 últimos mais forte, com nota | tick no relógio |
| Relógio da partida | `times.match` nos últimos 10 s | `hit` grave (não confunde com o da vez) | tick no relógio |
| Passar | troca de turno sem a corrente crescer, com prazo ainda aberto | duas notas descendo | chip troca |
| Tempo esgotado | troca de turno sem a corrente crescer, com o prazo vencido | `thud` + nota grave | relógio zera |
| Fim / vitória | `screen` vira `end`; vitória se eu estou em primeiro | escada + acorde; a vitória é mais longa | classificação |

O protocolo não diz se a vez acabou por `pass` ou `timeout`; a diferença sai do prazo (`turnDeadline` vencido ou não) no momento da troca. Corrente que chega inteira (reconexão) não toca nada, igual às partículas.

**Sem som, de propósito:** hover, abrir e fechar o drawer, rolar a corrente, o voo da palavra e as partículas (cobertos por "palavra aceita"). Digitar tem som, contrariando a regra `appropriate-no-high-frequency`, porque aqui digitar é jogar; por isso é o som mais baixo e varia a cada letra.

### Volume, desligar e acessibilidade

- O drawer de configurações ganha **Som** (switch) e **Volume** (segmentado: baixo / médio / alto). As duas opções são do aparelho, não da sala: o convidado também edita, e ficam salvas no `localStorage` (com `try/catch`).
- O som começa **ligado para todos**, inclusive com `prefers-reduced-motion` (decisão de 2026-10-30, contra a regra `a11y-reduced-motion-check`, que usa a preferência como sinal de sensibilidade a som): reduced motion troca o movimento, não o áudio. Quem não quiser som desliga no drawer, e a escolha fica salva.
- Os ganhos de cada som já são baixos (nenhum passa de 0,8) e o master do volume médio é 0,7, como na página. Sons curtos: o maior, a vitória, tem ~1,4 s em Madeira (Vidro tem cauda de até ~2,5 s). Na audição, nenhum dos 135 sons renderizados passou de 0,56 de pico.
- O `AudioContext` é único, criado e retomado no primeiro `pointerdown`/`keydown` (autoplay). Antes disso nada toca e nada quebra.
- Com a aba em segundo plano só toca **sua vez** (avisa quem está em outra aba); o resto espera você voltar.

## 3. Arquitetura

Espelha `src/motion/`: planos puros testados sem áudio, uma camada fina que toca.

- `src/sound/tokens.ts`: todos os números (escala, raiz, ganhos, durações, timbres das famílias). Nenhum número de som fora daqui; entra na regra do `CLAUDE.md` junto dos de motion e tema.
- `src/sound/cues.ts`: `planCue(cue, context) → Voice[]`, puro. Um `Cue` é o evento (`{ type: 'link', letters, chain }`, `{ type: 'turn', mine, color }`, …); um `Voice` é `{ at, instrument, midi | pitch, gain, len }`. Testado com snapshot em texto, como `choreography.test.ts`. A variação aleatória entra por um `random` injetado, para o teste ser determinístico.
- `src/sound/synth.ts`: o único arquivo que cria nós de áudio. Toca um `Voice[]` num `BaseAudioContext` (o mesmo código renderiza offline, o que permite testar com `OfflineAudioContext` no navegador e exportar WAV).
- `src/sound/mixer.ts`: o `AudioContext` único, ganho master, desbloqueio no primeiro gesto, mute, volume, reduced motion, regra da aba em segundo plano e persistência. Expõe `sound.play(cue)`.
- Gatilhos: `src/sound/triggers.ts` compara dois quadros seguidos do jogo (`soundCues(anterior, atual)`, puro e testado) e devolve os cues: contagem, palavra aceita e recusada, troca de turno, passar ou tempo esgotado, ticks, lobby e fim, com a mesma regra do `useBoardEffects` de "só o que mudou enquanto jogava". `app/useGameSounds.ts` toca esses cues. Toque, toggle, digitar e aviso saem direto dos handlers do `App` (`onAction`, `onConfig`, `HiddenInput`, `ui.notice`). O `useBoardEffects` não muda.
- Em dev, `window.__soundLog` guarda os cues tocados (como `window.__boardTiles`), para o e2e.

## 4. Testes

- Vitest: `cues.test.ts` (planos em texto, escala, limites de ganho ≤ 0,8 e de duração), `mixer.test.ts` (mute, volume, reduced motion, persistência e aba oculta com um contexto falso).
- e2e (`e2e/match.spec.ts`, com backend local): depois de uma palavra válida o log tem `link`; depois de uma recusada, `refuse`; antes do primeiro gesto o log está vazio.
- Ouvido: a página de audição continua como referência viva, como `docs/design/`, lendo os mesmos tokens depois da implementação (`/dev/sound` no lugar do HTML solto).

## 5. Passos

- [x] Skills instaladas e mapa de eventos
- [x] Página de audição com as três famílias e a cena de partida
- [x] Família escolhida: Madeira, sem ajustes nos eventos
- [x] Plano aprovado (som ligado por padrão, inclusive com reduced motion)
- [ ] Plano de implementação (`writing-plans`) a partir deste documento
- [ ] `sound/tokens.ts`, `cues.ts` (TDD), `synth.ts`, `mixer.ts`
- [ ] Gatilhos (`useBoardEffects`, `useGameSounds`, toque/toggle) e opções no drawer
- [ ] e2e com o log de sons; `/dev/sound` lendo os tokens reais
- [ ] `CLAUDE.md` e `refactor-plan.md` atualizados

## 6. Padrões aprovados

1. **Digitar tem som**, o mais baixo de todos e variando a cada letra, como na cena da audição.
2. **O som começa ligado**, com ou sem `prefers-reduced-motion`; desliga no drawer.
3. **O volume padrão é o médio** (o mesmo nível da página com o volume em 70%).
