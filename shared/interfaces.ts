import { Action, GameStatus, PlayerStatus } from './enums';

export interface Player {
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
  action: Action | null;
  data: string[];
}

export interface Message {
  to_id: string;
  from_id: string;
  message: string;
}
