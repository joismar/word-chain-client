import { Action, GameStatus, PlayerColor, PlayerStatus } from './enums';

export interface Player {
  color: PlayerColor;
  id: string;
  session_id: string | null;
  name: string;
  score: number;
  status: PlayerStatus;
  last_word_time: number;
}

export interface Word {
  word: string;
  player_id?: string;
}

export interface GameData {
  name: string;
  status: GameStatus;
  chain: Word[];
  players: Player[];
  turn: number;
}

export interface Error {
  message: string;
  error: string;
}

export interface EventAction {
  action: Action;
  data: string[];
}

export interface Message {
  to_id: string;
  from_id: string;
  message: string;
}
