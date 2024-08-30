export enum PlayerStatus {
  WAITING = 0,
  READY = 1,
}

export enum GameStatus {
  CREATED = 0,
  STARTED = 1,
}

export enum Action {
  HOST = 'host',
  STATUS = 'status',
  START = 'start',
  WORD = 'word',
  JOIN = 'join',
}

export enum SocketState {
  CONNECTED,
  DISCONNECTED,
  CONNECTING,
}