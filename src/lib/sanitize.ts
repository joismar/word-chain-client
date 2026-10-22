/** Letters and digits only, upper case, accents dropped: what the player can type. */
export function sanitizeInput(value: string): string {
  return stripAccents(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Characters the tile font has besides letters and digits. */
export const BOARD_SYMBOLS = " <>?!.,:;-_/+='*#↵←→✓✕⚙";

const drawable = new Set(Array.from(BOARD_SYMBOLS));

/** Text as the board can draw it: upper case, no accents, unknown symbols as '?'. */
export function toBoardText(value: string): string {
  return Array.from(stripAccents(value).toUpperCase(), (c) => (/[A-Z0-9]/.test(c) || drawable.has(c) ? c : '?'))
    .join('');
}

function stripAccents(value: string) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '');
}
