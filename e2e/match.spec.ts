import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Browser, type Page } from '@playwright/test';

/**
 * A full match between two players against a real backend. Needs E2E_WS_URL,
 * e.g. the local server from the backend repo:
 *
 *   (word-chain-backend/lambda) python -m local.server --port 3001
 *   E2E_WS_URL=ws://localhost:3001 npm run e2e -- match
 */
test.skip(!process.env.E2E_WS_URL, 'set E2E_WS_URL to run against a backend');
test.describe.configure({ mode: 'serial' });

const WORDLIST = process.env.E2E_WORDLIST
  ?? resolve(import.meta.dirname, '../../word-chain-backend/lambda/wordlist.txt');

type Message = { type: string; requestId?: string | null; payload: Record<string, unknown> };
type Game = { name: string; turnPlayerId: string | null; chain: { word: string }[]; version: number };

interface Player {
  page: Page;
  received: Message[];
  sent: Message[];
}

async function open(browser: Browser): Promise<Player> {
  const page = await (await browser.newContext()).newPage();
  const player: Player = { page, received: [], sent: [] };
  page.on('websocket', (ws) => {
    const parse = (payload: string | Buffer) => JSON.parse(String(payload)) as Message;
    ws.on('framereceived', (frame) => player.received.push(parse(frame.payload)));
    ws.on('framesent', (frame) => player.sent.push(parse(frame.payload)));
  });
  await page.goto('/');
  return player;
}

/** A word on the grid: one absolutely positioned row of letter cells. */
const cell = (page: Page, text: string) =>
  page.locator('div.absolute.flex').filter({ hasText: new RegExp(`^${text}$`) });

const inputs = (page: Page) => page.locator('input[aria-hidden="true"]');

function latestGame(player: Player): Game {
  const games = player.received.flatMap((m) => {
    if (m.type === 'game_state') return [m.payload as unknown as Game];
    if (m.type === 'session') return [(m.payload as { game: Game }).game];
    return [];
  });
  return games.reduce((a, b) => (b.version >= a.version ? b : a));
}

function myId(player: Player): string {
  const sessions = player.received.filter((m) => m.type === 'session');
  return (sessions.at(-1)!.payload as { player: { id: string } }).player.id;
}

/** A word the server accepts after `last`: in the list and starting with its last letter. */
function nextWord(last: string, used: string[]): string {
  const tail = last.at(-1)!;
  const words = readFileSync(WORDLIST, 'utf8').split(/\r?\n/);
  const found = words.find((w) => w.length >= 3 && w.length <= 10 && /^[a-z]+$/.test(w)
    && w.startsWith(tail) && !used.includes(w));
  if (!found) throw new Error(`no word starting with "${tail}"`);
  return found;
}

test('two players play a match end to end', async ({ browser }) => {
  test.setTimeout(120_000);
  const ana = await open(browser);
  const bia = await open(browser);

  // Ana hosts.
  await cell(ana.page, 'CRIAR').click();
  await inputs(ana.page).first().fill('Ana', { force: true });
  await ana.page.keyboard.press('Enter');
  await expect(cell(ana.page, 'PRONTO')).toBeVisible();
  const room = latestGame(ana).name;

  // Bia joins with the room code in upper case.
  await cell(bia.page, 'ENTRAR').click();
  await inputs(bia.page).nth(0).fill('Bia', { force: true });
  await inputs(bia.page).nth(1).fill(room.toUpperCase(), { force: true });
  await bia.page.keyboard.press('Enter');
  await expect(cell(bia.page, 'PRONTO')).toBeVisible();
  await expect(cell(ana.page, 'BIA')).toBeVisible();

  // Both ready, Ana starts; the start countdown shows before play.
  await cell(ana.page, 'PRONTO').click();
  await cell(bia.page, 'PRONTO').click();
  await expect(cell(ana.page, 'ESPERAR')).toBeVisible();
  await expect(cell(bia.page, 'ESPERAR')).toBeVisible();
  await cell(ana.page, 'INICIAR').click();
  await expect(cell(bia.page, 'COMECA EM \\d')).toBeVisible();

  // Ana (host, first in turn order) plays a valid word.
  await expect(cell(ana.page, 'PASSAR')).toBeVisible({ timeout: 10_000 });
  await expect(cell(bia.page, 'VEZ DE ANA')).toBeVisible();
  const first = latestGame(ana).chain.at(-1)!.word;
  const word = nextWord(first, [first]);
  await inputs(ana.page).first().fill(word.toUpperCase(), { force: true });
  await ana.page.keyboard.press('Enter');
  await expect(cell(bia.page, word.toUpperCase())).toBeVisible();
  await expect(cell(ana.page, 'VEZ DE BIA')).toBeVisible();
  // The reply follows the broadcast, so it may land after the screen updates.
  await expect.poll(() => ana.received.find((m) => m.type === 'ack' && m.payload.points !== null)
    ?.payload.points).toBeGreaterThan(0);

  // Bia tries a word that does not exist: an error by code, turn unchanged.
  await inputs(bia.page).first().fill('XYZWQ', { force: true });
  await bia.page.keyboard.press('Enter');
  await expect.poll(() => bia.received.some((m) => m.type === 'error'
    && (m.payload as { code: string }).code === 'INEXISTENT_WORD')).toBe(true);
  await expect(bia.page.getByText('Palavra não existe.')).toBeVisible();
  expect(latestGame(bia).turnPlayerId).toBe(myId(bia));

  // Bia reloads mid-turn: the saved session comes back on a new connection.
  await bia.page.reload();
  await expect(cell(bia.page, 'PASSAR')).toBeVisible();
  expect(bia.sent.some((m) => m.type === 'reconnect')).toBe(true);

  // Bia lets her turn run out: the server deadline passes it back to Ana,
  // claimed by a client `timeout` (no client-side PASS).
  await expect(cell(ana.page, 'PASSAR')).toBeVisible({ timeout: 25_000 });
  const timeouts = [...ana.sent, ...bia.sent].filter((m) => m.type === 'timeout');
  expect(timeouts.length).toBeGreaterThan(0);
  expect(bia.sent.filter((m) => m.type === 'pass')).toEqual([]);

  // Ana leaves; Bia sees her go offline and keeps the turn.
  await ana.page.close();
  await expect.poll(() => {
    const players = (latestGame(bia) as unknown as { players: { name: string; status: string }[] }).players;
    return players.find((p) => p.name.toLowerCase() === 'ana')?.status;
  }, { timeout: 25_000 }).toBe('offline');
  await expect(cell(bia.page, 'PASSAR')).toBeVisible({ timeout: 25_000 });
});
