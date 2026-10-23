import type { GameConfig } from '@src/protocol/schema';
import type { FieldId } from '@src/scenes';
import type { HomeMode } from '@src/scenes/home';
import type { Screen } from '@src/state/selectors';

/** What only this device knows: menu choice, half-typed text, focus, local settings. */
export interface UiState {
  mode: HomeMode;
  player: string;
  room: string;
  settings: boolean;
  /** Edited by the host before starting; the server only learns it on `start`. */
  config: GameConfig;
  copied: boolean;
  typed: string;
  /** The server refused the typed word; cleared as soon as it changes. */
  wordError: boolean;
  /** Latest notice from the server, shown in the HUD until it times out. */
  notice: string | null;
  focused: FieldId | null;
  /** A field the shell should focus; cleared once any field gains or loses focus. */
  focusTarget: FieldId | null;
}

export type UiAction =
  | { type: 'screen'; screen: Screen }
  | { type: 'mode'; mode: HomeMode }
  | { type: 'field'; id: FieldId; value: string }
  | { type: 'focus'; id: FieldId; focused: boolean }
  | { type: 'request-focus'; id: FieldId }
  | { type: 'settings'; open: boolean }
  | { type: 'config'; config: Partial<GameConfig> }
  | { type: 'copied'; copied: boolean }
  | { type: 'word-error' }
  | { type: 'notice'; text: string | null }
  | { type: 'clear-typed' };

export const DEFAULT_CONFIG: GameConfig = { time: 3, repetition: true };
/** Match lengths the host can pick, in minutes. */
export const TIME_CHOICES = [3, 5] as const;

export const initialUi: UiState = {
  mode: 'menu',
  player: '',
  room: '',
  settings: false,
  config: DEFAULT_CONFIG,
  copied: false,
  typed: '',
  wordError: false,
  notice: null,
  focused: null,
  focusTarget: null,
};

const FIELD_STATE: Record<FieldId, 'player' | 'room' | 'typed'> = { player: 'player', room: 'room', word: 'typed' };

export function uiReducer(state: UiState, action: UiAction): UiState {
  switch (action.type) {
    case 'screen':
      // Each screen starts fresh, as if it had just mounted; the config and a notice survive.
      return { ...initialUi, config: state.config, notice: state.notice };
    case 'mode':
      return {
        ...state,
        mode: action.mode,
        player: action.mode === 'menu' ? '' : state.player,
        room: action.mode === 'menu' ? '' : state.room,
        focusTarget: action.mode === 'menu' ? null : 'player',
      };
    case 'field':
      return { ...state, [FIELD_STATE[action.id]]: action.value, ...(action.id === 'word' && { wordError: false }) };
    case 'focus':
      if (action.focused) return { ...state, focused: action.id, focusTarget: null };
      return state.focused === action.id ? { ...state, focused: null, focusTarget: null } : state;
    case 'request-focus':
      return { ...state, focusTarget: action.id };
    case 'settings':
      return { ...state, settings: action.open };
    case 'config':
      return { ...state, config: { ...state.config, ...action.config } };
    case 'copied':
      return { ...state, copied: action.copied };
    case 'word-error':
      return { ...state, wordError: true };
    case 'notice':
      return { ...state, notice: action.text };
    case 'clear-typed':
      return state.typed === '' && !state.wordError ? state : { ...state, typed: '', wordError: false };
  }
}
