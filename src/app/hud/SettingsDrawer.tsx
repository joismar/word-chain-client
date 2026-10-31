import React from 'react';
import type { GameConfig } from '@src/protocol/schema';
import type { SoundSettings, VolumeLevel } from '@src/sound';
import { TIME_CHOICES } from '../ui';
import { PieceButton } from './Piece';

const VOLUME_CHOICES: readonly { level: VolumeLevel; label: string }[] = [
  { level: 'low', label: 'BAIXO' },
  { level: 'medium', label: 'MÉDIO' },
  { level: 'high', label: 'ALTO' },
];

type SettingsDrawerProps = {
  config: GameConfig;
  /** Only the host changes the room settings; everyone else reads them. */
  editable: boolean;
  /** From the right on wide screens, from the bottom otherwise. */
  side: boolean;
  onChange: (config: Partial<GameConfig>) => void;
  /** This device's sound, which everyone edits. */
  sound: SoundSettings;
  onSound: (patch: Partial<SoundSettings>) => void;
  onClose: () => void;
};

/** The room settings as plain text over a dimmed screen, one option per row. */
export function SettingsDrawer({ config, editable, side, onChange, sound, onSound, onClose }: SettingsDrawerProps) {
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

        {!editable && <div className="note">Só quem criou a sala altera a partida.</div>}

        <div className="hud-option">
          <strong>Som</strong>
          <span>Efeitos sonoros neste aparelho</span>
          <PieceButton
            role="switch"
            aria-checked={sound.enabled}
            aria-label="Som"
            className="hud-switch"
            variant={sound.enabled ? 'solid' : 'neutral'}
            tone={sound.enabled ? 'emerald' : 'stone'}
            onClick={() => onSound({ enabled: !sound.enabled })}
          >
            <div className="knob" />
          </PieceButton>
        </div>

        <div className="hud-option">
          <strong>Volume</strong>
          <span>Altura dos efeitos</span>
          <div className="hud-segmented" role="radiogroup" aria-label="Volume">
            {VOLUME_CHOICES.map(({ level, label }) => {
              const on = sound.volume === level;
              return (
                <PieceButton
                  key={level}
                  role="radio"
                  aria-checked={on}
                  variant={on ? 'solid' : sound.enabled ? 'neutral' : 'disabled'}
                  tone={on ? 'sky' : 'stone'}
                  disabled={!sound.enabled}
                  onClick={() => onSound({ volume: level })}
                >
                  {label}
                </PieceButton>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
