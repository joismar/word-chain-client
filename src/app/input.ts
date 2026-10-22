import { sanitizeInput } from '@src/lib/sanitize';

/** What a board text field keeps from raw typing, IME output or a paste. */
export function acceptInput(raw: string, maxLength: number): string {
  return sanitizeInput(raw).slice(0, maxLength);
}
