type WsEnv = { VITE_WS_URL?: string };

export function resolveWsUrl(env: WsEnv): string {
  const value = env.VITE_WS_URL?.trim();
  if (!value) {
    throw new Error('VITE_WS_URL is not set. Copy .env.example to .env.local and set it.');
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`VITE_WS_URL is not a valid URL: "${value}"`);
  }

  if (url.protocol !== 'ws:' && url.protocol !== 'wss:') {
    throw new Error(`VITE_WS_URL must start with ws:// or wss:// (got "${value}")`);
  }

  return value;
}
