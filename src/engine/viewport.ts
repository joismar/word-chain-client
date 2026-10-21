export interface VisualViewport {
  width: number;
  height: number;
  /** Offset of the visible area inside the layout viewport (mobile keyboard, pinch zoom). */
  offsetTop: number;
  offsetLeft: number;
}

/** The area actually visible, which shrinks when the mobile keyboard opens. */
export function readViewport(): VisualViewport {
  const vv = window.visualViewport;
  return {
    width: vv?.width ?? window.innerWidth,
    height: vv?.height ?? window.innerHeight,
    offsetTop: vv?.offsetTop ?? 0,
    offsetLeft: vv?.offsetLeft ?? 0,
  };
}

export function watchViewport(onChange: (viewport: VisualViewport) => void): () => void {
  const update = () => onChange(readViewport());
  const vv = window.visualViewport;
  vv?.addEventListener('resize', update);
  vv?.addEventListener('scroll', update);
  window.addEventListener('resize', update);
  return () => {
    vv?.removeEventListener('resize', update);
    vv?.removeEventListener('scroll', update);
    window.removeEventListener('resize', update);
  };
}
