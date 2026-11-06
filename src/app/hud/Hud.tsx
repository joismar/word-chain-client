import React from 'react';
import { motionCssVars } from '@src/motion/tokens';
import type { GameConfig } from '@src/protocol/schema';
import type { Hud as HudSpec, HudAction, HudPlayer, HudTime } from '@src/scenes';
import type { SoundSettings } from '@src/sound';
import {
  ACTIVE_MINI, css, HUD_COLORS, METER_ALPHA, SCRIM_ALPHA, TONE_COLORS, tileColors, type PieceVariant,
} from '@src/theme/palette';
import { drawer as drawerTokens, hudCssVars } from '@src/theme/tokens';
import { Piece, PieceButton } from './Piece';
import { SettingsDrawer } from './SettingsDrawer';
import './hud.css';

type HudProps = {
  hud: HudSpec;
  /** Width of the visible viewport, to pick the drawer's side. */
  width: number;
  onAction: (action: string) => void;
  onConfig: (config: Partial<GameConfig>) => void;
  sound: SoundSettings;
  onSound: (patch: Partial<SoundSettings>) => void;
};

const logo = tileColors('amber');
const ROOT_STYLE = {
  ...hudCssVars(),
  ...motionCssVars(),
  '--hud-ink': css(HUD_COLORS.ink),
  '--hud-muted': css(HUD_COLORS.muted),
  '--hud-scrim-color': css(HUD_COLORS.scrim, SCRIM_ALPHA),
  '--hud-meter-alpha': String(METER_ALPHA),
  '--drawer-surface-color': css(HUD_COLORS.drawerSurface),
  '--drawer-divider-color': css(HUD_COLORS.drawerDivider),
  '--drawer-handle-color': css(HUD_COLORS.drawerHandle),
  '--logo-face': css(logo.face),
  '--logo-text': css(logo.text),
  '--logo-shadow': css(logo.shadow),
} as React.CSSProperties;

const LOGO: [string, number, number][] = [['WORD', 0, 0], ['CHAIN', 1, 1]];

/** Seconds as M:SS. */
const clockText = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

const COPY_ICON = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <rect x="5" y="5" width="9" height="9" rx="1.5" />
    <path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5" />
  </svg>
);

function Meter({ fraction }: { fraction: number }) {
  return <div className="hud-meter" style={{ width: `${Math.max(0, Math.min(1, fraction)) * 100}%` }} />;
}

function Logo() {
  return (
    <div className="hud-logo" role="img" aria-label="Word Chain">
      {LOGO.flatMap(([word, row, col]) => [...word].map((char, i) => (
        <span
          key={`${row}-${i}`}
          aria-hidden="true"
          style={{ left: `calc(var(--hud-logo-step) * ${col + i})`, top: `calc(var(--hud-logo-step) * ${row})` }}
        >
          {char}
        </span>
      )))}
    </div>
  );
}

function Clock({ time }: { time: HudTime }) {
  return (
    <Piece
      variant={time.urgent ? 'solid' : 'neutral'}
      tone={time.urgent ? 'rose' : 'stone'}
      className="hud-clock"
      role="timer"
      aria-label={`Tempo da partida: ${clockText(time.seconds)}`}
    >
      {clockText(time.seconds)}
      <Meter fraction={time.fraction} />
    </Piece>
  );
}

function Chip({ player, compact }: { player: HudPlayer; compact: boolean }) {
  const hue = TONE_COLORS[player.tone].h;
  const mini = player.active
    ? { '--mini-face': css({ ...ACTIVE_MINI.face, h: hue }), '--mini-text': css({ ...ACTIVE_MINI.text, h: hue }) }
    : { '--mini-face': css(tileColors(player.tone).face), '--mini-text': css(tileColors(player.tone).text) };
  const label = `${player.name}, ${player.score} pontos${player.active ? ', na vez' : ''}`;
  return (
    <Piece
      variant={player.active ? 'solid' : 'neutral'}
      tone={player.active ? player.tone : 'stone'}
      className={`hud-chip${compact ? ' compact' : ''}`}
      style={mini as React.CSSProperties}
      aria-label={label}
      data-active={player.active || undefined}
    >
      <div className="mini" aria-hidden="true">{player.name[0]}</div>
      <span aria-hidden="true">{player.name}</span>
      <span className="score" aria-hidden="true">{player.score}</span>
      {player.turn && <span className="secs" aria-hidden="true">{player.turn.seconds}s</span>}
      {player.turn && <Meter fraction={player.turn.fraction} />}
    </Piece>
  );
}

function actionVariant(action: HudAction): PieceVariant {
  if (action.disabled) return 'disabled';
  if (action.primary) return 'solid';
  return action.tone === 'stone' ? 'neutral' : 'soft';
}

/**
 * Everything around the board, as DOM pieces: title bar, clock and players,
 * a notice, the action row and the settings drawer. Laid over the canvas;
 * only the pieces take the pointer.
 */
export function Hud({ hud, width, onAction, onConfig, sound, onSound }: HudProps) {
  const { compact } = hud;
  const bar = hud.back || hud.title || hud.settings || hud.logo || (compact && hud.clock);

  return (
    <div className="hud" style={ROOT_STYLE} data-testid="hud">
      {bar && (
        <div className={`hud-bar${compact && hud.clock ? ' compact' : ''}`}>
          {compact && hud.clock ? (
            <>
              <Clock time={hud.clock} />
              <div className="hud-bar-middle">
                {hud.players?.map((p) => <Chip key={p.id} player={p} compact />)}
              </div>
            </>
          ) : (
            <>
              <div>
                {hud.back && (
                  <PieceButton variant="neutral" className="hud-icon" aria-label="Voltar" onClick={() => onAction(hud.back!)}>
                    {'<'}
                  </PieceButton>
                )}
              </div>
              <div className="hud-bar-middle">
                {hud.title && <h1 className="hud-title">{hud.title}</h1>}
                {hud.copy && (
                  <PieceButton
                    variant="neutral"
                    className="hud-copy"
                    aria-label={hud.copy.copied ? 'Nome da sala copiado' : 'Copiar nome da sala'}
                    onClick={() => onAction('copy')}
                  >
                    {hud.copy.copied ? '✓' : COPY_ICON}
                  </PieceButton>
                )}
                {hud.logo && <Logo />}
              </div>
              <div>
                {hud.settings && (
                  <PieceButton variant="neutral" className="hud-icon" aria-label="Configurações" onClick={() => onAction('settings')}>
                    ⚙
                  </PieceButton>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {!compact && hud.clock && (
        <>
          <div className="hud-row hud-clock-row">
            <Clock time={hud.clock} />
          </div>
          <div className="hud-row hud-players">
            {hud.players?.map((p) => <Chip key={p.id} player={p} compact={false} />)}
          </div>
        </>
      )}

      <div className="hud-row hud-toast-row" role="status" aria-live="polite">
        {hud.toast && <Piece variant="solid" tone={hud.toast.tone} className="hud-toast">{hud.toast.text}</Piece>}
      </div>

      {hud.actions.length > 0 && (
        <div className="hud-row hud-actions">
          {hud.actions.map((action) => (
            <PieceButton
              key={action.id}
              variant={actionVariant(action)}
              tone={action.tone}
              className="hud-button"
              disabled={action.disabled}
              onClick={() => onAction(action.id)}
            >
              <span>{action.label}</span>
              {action.glyph && <span className="glyph" aria-hidden="true">{action.glyph}</span>}
            </PieceButton>
          ))}
        </div>
      )}

      {hud.drawer && (
        <SettingsDrawer
          config={hud.drawer.config}
          editable={hud.drawer.editable}
          side={width >= drawerTokens.sideMinWidth}
          onChange={onConfig}
          sound={sound}
          onSound={onSound}
          onClose={() => onAction('close-settings')}
        />
      )}
    </div>
  );
}
