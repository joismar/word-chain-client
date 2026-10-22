import type { TileTone } from '@src/engine/types';
import type { PlayerColor } from '@src/protocol/schema';

// Tailwind 600/700/200 values, matching the DOM grid until the OKLCH pass (F5).
export const TONES: Record<TileTone, { face: number; shadow: number; text: number }> = {
  stone: { face: 0x57534e, shadow: 0x44403c, text: 0xe7e5e4 },
  amber: { face: 0xd97706, shadow: 0xb45309, text: 0xfde68a },
  emerald: { face: 0x059669, shadow: 0x047857, text: 0xa7f3d0 },
  sky: { face: 0x0284c7, shadow: 0x0369a1, text: 0xbae6fd },
  purple: { face: 0x9333ea, shadow: 0x7e22ce, text: 0xe9d5ff },
  rose: { face: 0xe11d48, shadow: 0xbe123c, text: 0xfecdd3 },
};

export const BOARD = {
  background: 0x292524,
  emptyCell: 0x1c1917,
  cursor: 0xa8a29e,
};

const PLAYER_TONES: Record<PlayerColor, TileTone> = {
  red: 'rose',
  blue: 'sky',
  green: 'emerald',
  yellow: 'amber',
  orange: 'amber',
  purple: 'purple',
  pink: 'purple',
  brown: 'stone',
};

/** Tile tone for a player's colour (six tones for eight colours until F5). */
export function playerTone(color: PlayerColor | null | undefined): TileTone {
  return color ? PLAYER_TONES[color] : 'stone';
}
