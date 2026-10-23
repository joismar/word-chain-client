import React from 'react';
import type { GameConfig } from '@src/protocol/schema';
import { TIME_CHOICES } from '../ui';
import { PieceButton } from './Piece';

type SettingsDrawerProps = {
  config: GameConfig;
  /** Only the host changes the settings; everyone else reads them. */
  editable: boolean;
  /** From the right on wide screens, from the bottom otherwise. */
  side: boolean;
  onChange: (config: Partial<GameConfig>) => void;
  onClose: () => void;
};

/** The room settings as plain text over a dimmed screen, one option per row. */
export function SettingsDrawer({ config, editable, side, onChange, onClose }: SettingsDrawerProps) {
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const onCloseRef = React.useRef(onClose);
  React.useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Focus moves into the drawer once, as it opens; Escape closes it.
  React.useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <button type="button" className="hud-scrim" aria-label="Fechar configurações" tabIndex={-1} onClick={onClose} />
      <div className={`hud-sheet${side ? ' side' : ''}`} role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="handle" />
        <header>
          <h2 id="settings-title">CONFIGURAÇÕES</h2>
          <PieceButton ref={closeRef} variant="neutral" className="close" aria-label="Fechar" onClick={onClose}>✕</PieceButton>
        </header>

        <div className="hud-option">
          <strong>Tempo de partida</strong>
          <span>Duração total da partida</span>
          <div className="hud-segmented" role="radiogroup" aria-label="Tempo de partida">
            {TIME_CHOICES.map((time) => {
              const on = config.time === time;
              return (
                <PieceButton
                  key={time}
                  role="radio"
                  aria-checked={on}
                  variant={on ? 'solid' : editable ? 'neutral' : 'disabled'}
                  tone={on ? 'sky' : 'stone'}
                  disabled={!editable}
                  onClick={() => onChange({ time })}
                >
                  {time} MIN
                </PieceButton>
              );
            })}
          </div>
        </div>

        <div className="hud-option">
          <strong>Repetir palavras</strong>
          <span>Palavras já usadas podem voltar</span>
          <PieceButton
            role="switch"
            aria-checked={config.repetition}
            aria-label="Repetir palavras"
            className="hud-switch"
            variant={config.repetition ? 'solid' : 'neutral'}
            tone={config.repetition ? 'purple' : 'stone'}
            disabled={!editable}
            onClick={() => onChange({ repetition: !config.repetition })}
          >
            <div className="knob" />
          </PieceButton>
        </div>

        {!editable && <div className="note">Só quem criou a sala altera as configurações.</div>}
      </div>
    </>
  );
}
