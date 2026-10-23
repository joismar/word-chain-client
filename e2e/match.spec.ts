import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { boardReady, clickWord, findWord, hudButton, turnChip } from './board';

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
  await boardReady(page);
  return player;
}

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
  await clickWord(ana.page, 'CRIAR');
  await ana.page.getByLabel('Apelido').fill('Ana');
  await ana.page.keyboard.press('Enter');
  await expect(hudButton(ana.page, 'PRONTO')).toBeVisible({ timeout: 10_000 });
  await expect(ana.page.getByRole('heading', { name: /^SALA: / })).toBeVisible();
  const room = latestGame(ana).name;

  // Bia joins with the room code in upper case.
  await clickWord(bia.page, 'ENTRAR');
  await bia.page.getByLabel('Apelido').fill('Bia');
  await bia.page.getByLabel('Sala').fill(room.toUpperCase());
  await bia.page.keyboard.press('Enter');
  await expect(hudButton(bia.page, 'PRONTO')).toBeVisible({ timeout: 10_000 });
  await expect(hudButton(bia.page, 'INICIAR')).toHaveCount(0);
  await findWord(ana.page, 'BIA');

  // Both ready, Ana starts; the start countdown shows before play.
  await hudButton(ana.page, 'PRONTO').click();
  await hudButton(bia.page, 'PRONTO').click();
  await expect(hudButton(ana.page, 'ESPERAR')).toBeVisible();
  await expect(hudButton(bia.page, 'ESPERAR')).toBeVisible();
  await hudButton(ana.page, 'INICIAR').click();
  await findWord(bia.page, 'INICIA EM');

  // Ana (host, first in turn order) plays a valid word; Bia sees the turn on Ana's chip.
  await expect(hudButton(ana.page, 'PASSAR')).toBeEnabled({ timeout: 10_000 });
  await expect(turnChip(bia.page, 'ANA')).toBeVisible();
  await expect(hudButton(bia.page, 'PASSAR')).toBeDisabled();
  const first = latestGame(ana).chain.at(-1)!.word;
  const word = nextWord(first, [first]);
  await ana.page.getByLabel('Palavra').fill(word.toUpperCase());
  await ana.page.keyboard.press('Enter');
  await findWord(bia.page, word.toUpperCase());
  await expect(turnChip(ana.page, 'BIA')).toBeVisible();
  // The reply follows the broadcast, so it may land after the screen updates.
  await expect.poll(() => ana.received.find((m) => m.type === 'ack' && m.payload.points !== null)
    ?.payload.points).toBeGreaterThan(0);

  // Bia tries a word that does not exist: an error by code, turn unchanged,
  // and the word stays in the field to be fixed.
  await bia.page.getByLabel('Palavra').fill('XYZWQ');
  await bia.page.keyboard.press('Enter');
  await expect.poll(() => bia.received.some((m) => m.type === 'error'
    && (m.payload as { code: string }).code === 'INEXISTENT_WORD')).toBe(true);
  await expect(bia.page.getByRole('status')).toHaveText('PALAVRA NÃO EXISTE');
  await expect(bia.page.getByLabel('Palavra')).toHaveValue('XYZWQ');
  expect(latestGame(bia).turnPlayerId).toBe(myId(bia));

  // Bia reloads mid-turn: the saved session comes back on a new connection.
  await bia.page.reload();
  await boardReady(bia.page);
  await expect(hudButton(bia.page, 'PASSAR')).toBeEnabled({ timeout: 10_000 });
  expect(bia.sent.some((m) => m.type === 'reconnect')).toBe(true);

  // Bia lets her turn run out: the server deadline passes it back to Ana,
  // claimed by a client `timeout` (no client-side PASS).
  await expect(hudButton(ana.page, 'PASSAR')).toBeEnabled({ timeout: 25_000 });
  const timeouts = [...ana.sent, ...bia.sent].filter((m) => m.type === 'timeout');
  expect(timeouts.length).toBeGreaterThan(0);
  expect(bia.sent.filter((m) => m.type === 'pass')).toEqual([]);

  // Ana passes by tapping the button; the turn goes to Bia.
  await hudButton(ana.page, 'PASSAR').click();
  await expect(turnChip(ana.page, 'BIA')).toBeVisible();

  // Ana leaves; Bia sees her go offline and keeps the turn.
  await ana.page.close();
  await expect.poll(() => {
    const players = (latestGame(bia) as unknown as { players: { name: string; status: string }[] }).players;
    return players.find((p) => p.name.toLowerCase() === 'ana')?.status;
  }, { timeout: 25_000 }).toBe('offline');
  await expect(hudButton(bia.page, 'PASSAR')).toBeEnabled({ timeout: 25_000 });
});
