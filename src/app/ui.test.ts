import { describe, expect, it } from 'vitest';
import { initialUi, uiReducer, type UiState } from './ui';

const run = (...actions: Parameters<typeof uiReducer>[1][]) => actions.reduce(uiReducer, initialUi);

describe('uiReducer', () => {
  it('opens a mode with the nickname field focused and clears the fields on the way back', () => {
    const host = run({ type: 'mode', mode: 'host' }, { type: 'field', id: 'player', value: 'ANA' });
    expect(host).toMatchObject({ mode: 'host', player: 'ANA', focusTarget: 'player' });
    expect(uiReducer(host, { type: 'mode', mode: 'menu' })).toMatchObject({ mode: 'menu', player: '', focusTarget: null });
  });

  it('routes each field to its own text', () => {
    const state = run(
      { type: 'field', id: 'player', value: 'ANA' },
      { type: 'field', id: 'room', value: 'CASAS' },
      { type: 'field', id: 'word', value: 'SAPO' },
    );
    expect(state).toMatchObject({ player: 'ANA', room: 'CASAS', typed: 'SAPO' });
  });

  it('consumes a focus request once a field reports focus', () => {
    let state: UiState = run({ type: 'request-focus', id: 'room' });
    state = uiReducer(state, { type: 'focus', id: 'room', focused: true });
    expect(state).toMatchObject({ focused: 'room', focusTarget: null });
    // A late blur from the field we left does not clear the new focus.
    state = uiReducer(state, { type: 'focus', id: 'player', focused: false });
    expect(state.focused).toBe('room');
    state = uiReducer(state, { type: 'focus', id: 'room', focused: false });
    expect(state.focused).toBeNull();
  });

  it('changes the settings and keeps them, and a notice, across screens', () => {
    const state = run({ type: 'config', config: { time: 5 } }, { type: 'config', config: { repetition: false } });
    expect(state.config).toEqual({ time: 5, repetition: false });
    const next = uiReducer({ ...state, typed: 'X', settings: true, notice: 'Sala cheia.' }, { type: 'screen', screen: 'game' });
    expect(next).toEqual({ ...initialUi, config: state.config, notice: 'Sala cheia.' });
  });

  it('marks a refused word until it is edited or cleared', () => {
    const refused = run({ type: 'field', id: 'word', value: 'XYZ' }, { type: 'word-error' });
    expect(refused.wordError).toBe(true);
    expect(uiReducer(refused, { type: 'field', id: 'word', value: 'XY' }).wordError).toBe(false);
    expect(uiReducer(refused, { type: 'clear-typed' })).toMatchObject({ typed: '', wordError: false });
  });

  it('keeps the same object when there is nothing to clear', () => {
    expect(uiReducer(initialUi, { type: 'clear-typed' })).toBe(initialUi);
  });
});
