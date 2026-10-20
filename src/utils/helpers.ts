import { PlayerColor } from '@shared/enums';

export function countOverlapStartEnd(word1: string, word2: string) {
  let maxOverlap = 0;
  const minLength = Math.min(word1.length, word2.length);

  for (let i = 1; i <= minLength; i++) {
    if (word1.slice(-i) === word2.slice(0, i)) {
      maxOverlap = i;
    }
  }

  return maxOverlap;
}

export function getGridPlayerColor(color?: PlayerColor): "stone" | "amber" | "emerald" | "sky" | "purple" | "rose" {
  switch (color) {
    case PlayerColor.RED:
      return "rose";
    case PlayerColor.BLUE:
      return "sky";
    case PlayerColor.GREEN:
      return "emerald";
    case PlayerColor.YELLOW:
    case PlayerColor.ORANGE:
      return "amber";
    case PlayerColor.PURPLE:
    case PlayerColor.PINK:
      return "purple";
    default:
      return "stone";
  }
}

export function sanitizeInput(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

