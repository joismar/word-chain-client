import { describe, expect, it } from 'vitest';
import { resolveWsUrl } from './env';

describe('resolveWsUrl', () => {
  it('returns VITE_WS_URL when it is a ws(s) URL', () => {
    expect(resolveWsUrl({ VITE_WS_URL: 'wss://example.com/dev' })).toBe('wss://example.com/dev');
    expect(resolveWsUrl({ VITE_WS_URL: 'ws://localhost:3001' })).toBe('ws://localhost:3001');
  });

  it('trims surrounding whitespace', () => {
    expect(resolveWsUrl({ VITE_WS_URL: '  wss://example.com  ' })).toBe('wss://example.com');
  });

  it('throws when VITE_WS_URL is missing or empty', () => {
    expect(() => resolveWsUrl({})).toThrow(/VITE_WS_URL/);
    expect(() => resolveWsUrl({ VITE_WS_URL: '   ' })).toThrow(/VITE_WS_URL/);
  });

  it('throws when VITE_WS_URL is not a ws(s) URL', () => {
    expect(() => resolveWsUrl({ VITE_WS_URL: 'https://example.com' })).toThrow(/ws:\/\/ or wss:\/\//);
    expect(() => resolveWsUrl({ VITE_WS_URL: 'not a url' })).toThrow(/VITE_WS_URL/);
  });
});
