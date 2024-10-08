export type Distance = 0 | 1 | 2 | 3 | 4;

export type EventMap = {
  destroyWords: string[];
  message: { message: any };
  infoToast: string;
  errorToast: string;
};

export type Screens = 'home' | 'lobby' | 'game' | 'end';

export type InGameWord = {
  word: string;
  first: number;
  last: number;
  player_id: string;
};
