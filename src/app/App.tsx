import React from 'react';
import type { Stage } from '@src/engine/Stage';
import { computeBoard } from '@src/engine/layout';
import type { EngineEvent } from '@src/engine/types';
import { useEventSystem } from '@src/hooks/useEventSystem';
import { sceneFor, type Area, type FieldId } from '@src/scenes';
import { sound } from '@src/sound';
import { actionCue, typingCue } from '@src/sound/triggers';
import { gameTimes } from '@src/scenes/game';
import { isCompact } from '@src/scenes/text';
import { useGame, useNow } from '@src/state/useGame';
import { GameCanvas } from './GameCanvas';
import { HiddenInput } from './HiddenInput';
import { hudClearRows } from './hud/clearRows';
import { Hud } from './hud/Hud';
import { initialUi, uiReducer } from './ui';
import { useBoardEffects } from './useBoardEffects';
import { useGameSounds } from './useGameSounds';
import { useViewport } from './useViewport';

const COPIED_MS = 2_000;
/** How long a notice from the server stays above the actions. */
const NOTICE_MS = 3_000;

/** Tracks a value across renders and reports when it changes (state adjusted during render). */
function useChanged<T>(value: T): boolean {
  const [previous, setPrevious] = React.useState(value);
  if (Object.is(previous, value)) return false;
  setPrevious(value);
  return true;
}

/** The whole game on one canvas: scenes turn state into tiles, taps come back as actions. */
export function App() {
  const game = useGame();
  const { screen, pending } = game;
  const [ui, dispatch] = React.useReducer(uiReducer, initialUi);
  const [stage, setStage] = React.useState<Stage | null>(null);
  const { subscribe } = useEventSystem();

  const viewport = useViewport();
  const board = computeBoard(viewport);
  const { top, bottom } = hudClearRows(board, isCompact(board));
  const area = React.useMemo<Area>(
    () => ({ rows: board.rows, cols: board.cols, clear: { top, bottom } }),
    [board.rows, board.cols, top, bottom],
  );
  const { startsIn, match, turn } = gameTimes(game.clock(useNow()));
  const times = React.useMemo(() => ({ startsIn, match, turn }), [startsIn, match, turn]);

  const state = game.game;
  const playerId = game.player?.id ?? null;
  const canType = screen === 'game' && game.isMyTurn && startsIn === 0;

  // Each screen starts fresh; a word in progress goes once the chain or turn moves on.
  if (useChanged(screen)) dispatch({ type: 'screen', screen });
  if (useChanged(`${state?.chain.length}|${canType}`)) dispatch({ type: 'clear-typed' });
  if (useChanged(canType) && canType) dispatch({ type: 'request-focus', id: 'word' });
  if (useChanged(game.lastError) && game.lastError?.request === 'word') dispatch({ type: 'word-error' });

  React.useEffect(() => subscribe('infoToast', (text: string) => dispatch({ type: 'notice', text })), [subscribe]);
  React.useEffect(() => {
    if (!ui.notice) return;
    sound.play({ type: 'notice' });
    const id = setTimeout(() => dispatch({ type: 'notice', text: null }), NOTICE_MS);
    return () => clearTimeout(id);
  }, [ui.notice]);

  React.useEffect(() => {
    if (!ui.copied) return;
    const id = setTimeout(() => dispatch({ type: 'copied', copied: false }), COPIED_MS);
    return () => clearTimeout(id);
  }, [ui.copied]);

  useBoardEffects(stage, { screen, game: state, lastError: game.lastError, times });
  useGameSounds({ screen, playerId, game: state, times, lastError: game.lastError });

  const scene = React.useMemo(
    () => sceneFor({ screen, game: state, playerId, ui, times, pending }, area),
    [screen, state, playerId, ui, times, pending, area],
  );

  function submitHome() {
    if (pending.has('host') || pending.has('join')) return;
    const focus = (id: FieldId) => dispatch({ type: 'request-focus', id });
    if (!ui.player) return focus('player');
    if (ui.mode === 'host') game.host(ui.player);
    else if (!ui.room) focus('room');
    else game.join(ui.room, ui.player);
  }

  function submitWord() {
    if (ui.typed) game.playWord(ui.typed);
  }

  function copyRoom() {
    if (!state) return;
    navigator.clipboard?.writeText(state.name).catch(() => {});
    dispatch({ type: 'copied', copied: true });
  }

  function onAction(action: string) {
    const ready = state?.players.find((p) => p.id === playerId)?.status === 'ready';
    sound.play(actionCue(action, ready));
    switch (action) {
      case 'host':
      case 'join':
        return dispatch({ type: 'mode', mode: action });
      case 'menu':
        return dispatch({ type: 'mode', mode: 'menu' });
      case 'submit':
        return screen === 'game' ? submitWord() : submitHome();
      case 'leave':
        return game.leave();
      case 'settings':
      case 'close-settings':
        return dispatch({ type: 'settings', open: action === 'settings' });
      case 'copy':
        return copyRoom();
      case 'ready':
        return game.setReady(!ready);
      case 'start':
        return game.start(ui.config);
      case 'pass':
        return game.pass();
    }
  }

  function onFieldSubmit(id: FieldId) {
    if (id === 'word') submitWord();
    else if (id === 'player' && ui.mode === 'join' && !ui.room) dispatch({ type: 'request-focus', id: 'room' });
    else submitHome();
  }

  return (
    <GameCanvas
      tiles={scene.tiles}
      onEvent={(event: EngineEvent) => {
        if (event.type === 'tap') onAction(event.action);
      }}
      onStage={setStage}
      overlay={(live) => scene.fields.map((field) => (
        <HiddenInput
          key={field.id}
          board={live}
          row={field.row}
          col={field.col}
          maxLength={field.length}
          value={field.value}
          label={field.label}
          onChange={(value) => {
            const cue = typingCue(field.value, value);
            if (cue) sound.play(cue);
            dispatch({ type: 'field', id: field.id, value });
          }}
          onSubmit={() => onFieldSubmit(field.id)}
          onFocusChange={(focused) => dispatch({ type: 'focus', id: field.id, focused })}
          autoFocus={ui.focusTarget === field.id}
        />
      ))}
    >
      <Hud
        hud={scene.hud}
        width={viewport.width}
        onAction={onAction}
        onConfig={(config) => {
          sound.play(config.repetition !== undefined ? { type: 'toggle', on: config.repetition } : { type: 'press' });
          dispatch({ type: 'config', config });
        }}
      />
    </GameCanvas>
  );
}
