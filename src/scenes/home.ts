import { clip, fieldTiles, text } from './text';
import type { Area, Field, FieldId, Scene } from './types';

export type HomeMode = 'menu' | 'host' | 'join';

export interface HomeState {
  mode: HomeMode;
  player: string;
  room: string;
  focused: FieldId | null;
  /** A host/join request is in flight. */
  loading: boolean;
}

export const PLAYER_LENGTH = 10;
/** Room names are five-letter words; one spare cell. */
export const ROOM_LENGTH = 6;

/**
 * Menu with CRIAR / ENTRAR. Picking one turns the first word into the
 * nickname label (same tiles, new letters) and opens the fields below it.
 */
export function homeScene(state: HomeState, area: Area): Scene {
  const { mode, loading } = state;
  const menu = mode === 'menu';
  const fields: Field[] = [];
  if (!menu) fields.push({ id: 'player', row: -3, col: -5, length: PLAYER_LENGTH, label: 'Apelido', value: state.player });
  if (mode === 'join') fields.push({ id: 'room', row: 0, col: -5, length: ROOM_LENGTH, label: 'Sala', value: state.room });

  const tiles = [
    ...(menu ? [] : text('back', '<', -6, -5, { tone: 'rose', action: 'menu' })),
    ...text('first', menu ? 'CRIAR' : 'APELIDO', -4, -5, { tone: 'amber', ...(menu && { action: 'host' }) }),
    ...(mode === 'host' ? [] : text('second', menu ? 'ENTRAR' : 'SALA', -1, -5, {
      tone: 'amber', ...(menu && { action: 'join' }),
    })),
    ...fields.flatMap((field) => fieldTiles(field.id, field, state.focused === field.id)),
    ...(menu ? [] : text('submit', loading ? '...' : '↵', 4, 5, { tone: 'emerald', ...(!loading && { action: 'submit' }) })),
  ];
  return { tiles: clip(tiles, area), fields };
}
