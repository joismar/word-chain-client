import type { Board } from '@src/engine/layout';
import { hud } from '@src/theme/tokens';

/**
 * The board rows the in-game HUD leaves uncovered: below the clock and chips
 * (one bar when compact) and above the message and the actions.
 */
export function hudClearRows(board: Board, compact: boolean): { top: number; bottom: number } {
  const topPx = compact
    ? hud.insetTop + Math.max(hud.clockHeight, hud.chipCompactHeight)
    : hud.playersTop + hud.chipHeight;
  const bottomPx = hud.toastBottom + hud.toastHeight;
  const half = board.cell / 2;
  return {
    top: Math.ceil((topPx + hud.gap + half - board.originY) / board.pitch),
    bottom: Math.floor((board.height - bottomPx - hud.gap - half - board.originY) / board.pitch),
  };
}
