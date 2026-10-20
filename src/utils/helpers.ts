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

export function getCSSPlayerColor(color: PlayerColor) {
  console.log(color)

  return {
    [PlayerColor.RED]: 'bg-red-700',
    [PlayerColor.BLUE]: 'bg-blue-700',
    [PlayerColor.GREEN]: 'bg-green-700',
    [PlayerColor.YELLOW]: 'bg-yellow-700',
    [PlayerColor.PURPLE]: 'bg-purple-700',
    [PlayerColor.ORANGE]: 'bg-orange-700',
    [PlayerColor.PINK]: 'bg-pink-700',
    [PlayerColor.BROWN]: 'bg-cyan-700',
  }[color];
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
