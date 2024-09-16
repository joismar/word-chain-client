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