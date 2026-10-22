const QUERY = '(prefers-reduced-motion: reduce)';

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia(QUERY).matches;
}

/** Calls back whenever the OS setting changes. Returns an unsubscribe. */
export function watchReducedMotion(onChange: (reduced: boolean) => void): () => void {
  if (typeof matchMedia !== 'function') return () => {};
  const media = matchMedia(QUERY);
  const handler = () => onChange(media.matches);
  media.addEventListener('change', handler);
  return () => media.removeEventListener('change', handler);
}
