import React from 'react';
import type { TileTone } from '@src/engine/types';
import { css, pieceColors, type PieceVariant } from '@src/theme/palette';

/** Inline colours of a piece; the material itself is in hud.css. */
function pieceStyle(variant: PieceVariant, tone: TileTone = 'stone'): React.CSSProperties {
  const { face, text, shadow } = pieceColors(variant, tone);
  return { '--piece-face': css(face), '--piece-text': css(text), '--piece-shadow': css(shadow) } as React.CSSProperties;
}

interface Look {
  variant: PieceVariant;
  tone?: TileTone;
}

/** One HUD piece that only shows something: a flat face with a hard shadow. */
export function Piece({ variant, tone, className = '', style, ...rest }: Look & React.HTMLAttributes<HTMLDivElement>) {
  return <div {...rest} className={`piece ${className}`} data-variant={variant} style={{ ...pieceStyle(variant, tone), ...style }} />;
}

/** A piece you can press; it sinks into its shadow while held. */
export function PieceButton({
  variant, tone, className = '', style, ...rest
}: Look & React.ComponentProps<'button'>) {
  return (
    <button
      type="button"
      {...rest}
      className={`piece ${className}`}
      data-variant={variant}
      style={{ ...pieceStyle(variant, tone), ...style }}
    />
  );
}
