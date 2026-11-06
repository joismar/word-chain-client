/** Longest suffix of `prev` that is also a prefix of `next` (how the chain links). */
export function countOverlap(prev: string, next: string): number {
  let overlap = 0;
  const max = Math.min(prev.length, next.length);
  for (let i = 1; i <= max; i++) {
    if (prev.slice(-i) === next.slice(0, i)) overlap = i;
  }
  return overlap;
}

/**
 * Column of each word's first letter when every word starts under the letters
 * it shares with the one before (a staircase), relative to the first word.
 */
export function chainOffsets(words: readonly string[]): number[] {
  const offsets: number[] = [];
  words.forEach((word, i) => {
    if (i === 0) offsets.push(0);
    else {
      const prev = words[i - 1];
      offsets.push(offsets[i - 1] + prev.length - countOverlap(prev, word));
    }
  });
  return offsets;
}
