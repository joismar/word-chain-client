import React from 'react';
import { cellRect, type Board } from '@src/engine/layout';
import { acceptInput } from './input';

type HiddenInputProps = {
  board: Board;
  /** First cell of the field on the board. */
  row: number;
  col: number;
  maxLength: number;
  value: string;
  label: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  onFocusChange?: (focused: boolean) => void;
  autoFocus?: boolean;
};

/**
 * A real, invisible <input> laid exactly over the field's cells. Taps on the
 * cells hit it directly, so the mobile keyboard, IME and paste work natively;
 * the canvas only draws what it holds.
 */
export function HiddenInput({
  board, row, col, maxLength, value, label, onChange, onSubmit, onFocusChange, autoFocus,
}: HiddenInputProps) {
  const ref = React.useRef<HTMLInputElement>(null);
  // While an IME composes, the raw text must reach the input untouched.
  const [composing, setComposing] = React.useState<string | null>(null);
  const rect = cellRect(board, row, col, maxLength);

  React.useEffect(() => {
    if (autoFocus) ref.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  // The board shows letters left to right, so the caret always sits at the end.
  const pinCaret = () => {
    const el = ref.current;
    if (el && el.selectionStart !== el.value.length) el.setSelectionRange(el.value.length, el.value.length);
  };

  return (
    <input
      ref={ref}
      aria-label={label}
      value={composing ?? value}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="characters"
      spellCheck={false}
      enterKeyHint="go"
      className="absolute bg-transparent text-transparent caret-transparent outline-none border-0 p-0 cursor-pointer"
      style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height, fontSize: 16 }}
      onChange={(e) => {
        if (composing !== null) setComposing(e.target.value);
        else onChange(acceptInput(e.target.value, maxLength));
      }}
      onCompositionStart={() => setComposing(value)}
      onCompositionEnd={(e) => {
        setComposing(null);
        onChange(acceptInput(e.currentTarget.value, maxLength));
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && composing === null) onSubmit?.();
      }}
      onSelect={pinCaret}
      onFocus={() => onFocusChange?.(true)}
      onBlur={() => onFocusChange?.(false)}
    />
  );
}
