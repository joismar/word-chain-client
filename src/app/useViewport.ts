import React from 'react';
import { readViewport, watchViewport, type VisualViewport } from '@src/engine/viewport';

/** The visible viewport, updated as it resizes or the mobile keyboard opens. */
export function useViewport(): VisualViewport {
  const [viewport, setViewport] = React.useState(readViewport);
  React.useEffect(() => watchViewport(setViewport), []);
  return viewport;
}
