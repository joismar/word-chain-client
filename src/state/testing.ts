/** Test doubles for the socket layer. Imported only by *.test.ts files. */
import { fromCallback, type AnyEventObject } from 'xstate';
import type { ClientMessage, GameState, Player, ServerMessage } from '@src/protocol/schema';
import type { ParentToSocket, SocketLike } from './socketActor';

export class FakeSocket implements SocketLike {
  static instances: FakeSocket[] = [];
  readyState = 0;
  onopen: SocketLike['onopen'] = null;
  onclose: SocketLike['onclose'] = null;
  onerror: SocketLike['onerror'] = null;
  onmessage: SocketLike['onmessage'] = null;
  sent: ClientMessage[] = [];
  closed = false;

  constructor(readonly url: string) {
    FakeSocket.instances.push(this);
  }

  static latest(): FakeSocket {
    return FakeSocket.instances[FakeSocket.instances.length - 1];
  }

  send(data: string) {
    if (this.readyState !== 1) throw new Error('send on a socket that is not open');
    this.sent.push(JSON.parse(data));
  }

  close() {
    this.closed = true;
    this.readyState = 3;
  }

  open() {
    this.readyState = 1;
    this.onopen?.({});
  }

  /** The server or network drops the connection. */
  drop() {
    this.readyState = 3;
    this.onclose?.({});
  }

  receive(data: unknown) {
    this.onmessage?.({ data: typeof data === 'string' ? data : JSON.stringify(data) });
  }
}

/**
 * Socket logic for machine tests: no network, just the two directions.
 * `server.push` delivers events to the machine; `commands` records what the
 * machine told the socket.
 */
export function fakeSocketLogic() {
  const harness = {
    commands: [] as ParentToSocket[],
    running: false,
    sendBack: null as ((event: AnyEventObject) => void) | null,
    /** Every message the machine sent, in order, whether queued or not. */
    get sent(): ClientMessage[] {
      return harness.commands.flatMap((c) => (c.type === 'socket.send' ? [c.message] : []));
    },
    lastSent(type?: ClientMessage['type']): ClientMessage {
      const matching = harness.sent.filter((m) => type === undefined || m.type === type);
      if (matching.length === 0) throw new Error(`nothing sent${type ? ` of type ${type}` : ''}`);
      return matching[matching.length - 1];
    },
    open() {
      harness.sendBack!({ type: 'socket.open' });
    },
    closed() {
      harness.sendBack!({ type: 'socket.closed', attempt: 0, retryInMs: 500 });
    },
    push(message: ServerMessage) {
      harness.sendBack!({ type: 'socket.message', message });
    },
  };

  const logic = fromCallback<ParentToSocket>(({ sendBack, receive }) => {
    harness.running = true;
    harness.sendBack = sendBack;
    receive((event) => harness.commands.push(event));
    return () => {
      harness.running = false;
    };
  });

  return { logic, harness };
}

export function player(overrides: Partial<Player> = {}): Player {
  return { id: 'p1', name: 'Ana', score: 0, status: 'waiting', color: 'red', ...overrides };
}

export function gameState(overrides: Partial<GameState> = {}): GameState {
  return {
    name: 'casas',
    status: 'lobby',
    players: [player()],
    chain: [],
    hostId: 'p1',
    turnPlayerId: null,
    config: { time: 3, repetition: true },
    startedAt: null,
    endsAt: null,
    turnDeadline: null,
    serverTime: 0,
    version: 1,
    ...overrides,
  };
}
