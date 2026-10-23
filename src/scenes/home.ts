import { centred, clip, fieldTiles, isCompact, text } from './text';
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
const FIELD_COL = -5;

/**
 * Menu with CRIAR / ENTRAR under the logo. Picking one turns the first word
 * into the nickname label (same tiles, new letters) and opens the fields;
 * the submit button goes to the HUD.
 */
export function homeScene(state: HomeState, area: Area): Scene {
  const { mode, loading } = state;
  const compact = isCompact(area);

  if (mode === 'menu') {
    const tiles = [
      ...text('first', 'CRIAR', -1, centred(5), { tone: 'amber', action: 'host' }),
      ...text('second', 'ENTRAR', 1, centred(6), { tone: 'amber', action: 'join' }),
    ];
    return { tiles: clip(tiles, area), fields: [], hud: { logo: true, actions: [], compact } };
  }

  const host = mode === 'host';
  const fields: Field[] = [
    { id: 'player', row: host ? 0 : -2, col: FIELD_COL, length: PLAYER_LENGTH, label: 'Apelido', value: state.player },
  ];
  if (!host) fields.push({ id: 'room', row: 3, col: FIELD_COL, length: ROOM_LENGTH, label: 'Sala', value: state.room });

  const tiles = [
    ...text('first', 'APELIDO', host ? -2 : -4, FIELD_COL, { tone: 'amber' }),
    ...(host ? [] : text('second', 'SALA', 1, FIELD_COL, { tone: 'amber' })),
    ...fields.flatMap((field) => fieldTiles(field.id, field, state.focused === field.id, { tone: 'stone' })),
  ];
  return {
    tiles: clip(tiles, area),
    fields,
    hud: {
      back: 'menu',
      title: host ? 'CRIAR' : 'ENTRAR',
      actions: [{
        id: 'submit', label: host ? 'CRIAR SALA' : 'ENTRAR', glyph: '↵', tone: 'emerald', primary: true, disabled: loading,
      }],
      compact,
    },
  };
}
