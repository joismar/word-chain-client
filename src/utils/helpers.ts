import { Action } from '@shared/enums';
import { EventAction } from '@shared/interfaces';

export function stringToEvent(input: string): EventAction {
  const regex = /\/(\w+)\s*([\w\W\s-]*)/;
  const matches = input.match(regex);

  if (matches) {
    const [, action, args] = matches;
    const data = args.split(' ').filter((arg) => arg !== '');

    return {
      action: action as Action,
      data,
    };
  }

  return {
    action: null,
    data: [],
  };
}

export function removeArgs(input: string): string {
  const regex = /(\\\w+)\s*/;
  const matches = input.match(regex);

  if (matches) {
    const [, action, _] = matches;
    return action + ' ';
  }

  return '';
}

export function countOverlapStartEnd(word1: string, word2: string) {
  let maxOverlap = 0;
  const minLength = Math.min(word1.length, word2.length);

  for (let i = 1; i <= minLength; i++) {
    if (word1.slice(-i) === word2.slice(0, i)) {
      maxOverlap = i;
    }
  }

  return maxOverlap;
}
