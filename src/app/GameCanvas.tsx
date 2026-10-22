import React from 'react';
import { Stage } from '@src/engine/Stage';
import type { Board } from '@src/engine/layout';
import type { EngineEvent, TileSpec } from '@src/engine/types';
import { readViewport, watchViewport } from '@src/engine/viewport';

type GameCanvasProps = {
  tiles: readonly TileSpec[];
  onEvent?: (event: EngineEvent) => void;
  /** DOM laid over the canvas in board coordinates (e.g. HiddenInput). */
  overlay?: (board: Board) => React.ReactNode;
  /** The live stage once it exists, null after teardown (effects, motion settings). */
  onStage?: (stage: Stage | null) => void;
};

type DevWindow = Window & { __boardTiles?: readonly TileSpec[] };

/** Mounts the Pixi stage over the visible viewport and feeds it tiles. */
export function GameCanvas({ tiles, onEvent, overlay, onStage }: GameCanvasProps) {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const onEventRef = React.useRef(onEvent);
  const onStageRef = React.useRef(onStage);
  const [stage, setStage] = React.useState<Stage | null>(null);
  const [viewport, setViewport] = React.useState(readViewport);
  const [board, setBoard] = React.useState<Board | null>(null);

  React.useEffect(() => {
    onEventRef.current = onEvent;
    onStageRef.current = onStage;
  });

  React.useEffect(() => {
    const controller = new AbortController();
    let created: Stage | null = null;
    Stage.create(hostRef.current!, {
      viewport: readViewport(),
      onEvent: (event) => onEventRef.current?.(event),
    }, controller.signal).then((s) => {
      if (!s) return;
      created = s;
      // The viewport may have moved while the renderer was starting.
      s.resize(readViewport());
      setStage(s);
      setBoard(s.board);
      onStageRef.current?.(s);
    });
    const unwatch = watchViewport((next) => {
      setViewport(next);
      if (!created) return;
      created.resize(next);
      setBoard(created.board);
    });
    return () => {
      controller.abort();
      unwatch();
      if (created) onStageRef.current?.(null);
      created?.destroy();
      setStage(null);
    };
  }, []);

  React.useEffect(() => {
    stage?.setTiles(tiles);
    // The e2e suite finds words on the board through this (dev server only).
    if (import.meta.env.DEV) (window as DevWindow).__boardTiles = tiles;
  }, [stage, tiles]);

  return (
    <div
      className="fixed overflow-hidden"
      style={{ left: viewport.offsetLeft, top: viewport.offsetTop, width: viewport.width, height: viewport.height }}
    >
      <div ref={hostRef} className="absolute inset-0" data-testid="game-canvas" data-ready={stage ? true : undefined} />
      {board && overlay?.(board)}
    </div>
  );
}
