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
  PASS = 'pass',
  END = 'end',
}

export enum SocketState {
  CONNECTED,
  DISCONNECTED,
  CONNECTING,
}

export enum PlayerColor {
  RED,
  BLUE,
  GREEN,
  YELLOW,
  PURPLE,
  ORANGE,
  PINK,
  BROWN,
}