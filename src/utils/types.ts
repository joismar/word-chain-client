export type Distance = 0 | 1 | 2 | 3;

export type EventMap = {
  destroyWords: string[];
  message: { message: any };
};

export type Screens = 'home' | 'lobby' | 'game';

export type InGameWord = {
  word: string;
  first: number;
  last: number;
  player_id: string;
};
