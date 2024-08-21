import React from 'react';
import { countOverlapStartEnd } from '../utils/helpers';
import { Word } from '@shared/interfaces';
import { InGameWord } from '@src/utils/types';

export function useWordList() {
  const [words, setWords] = React.useState<Word[]>([]);

  const wordList = words.map(({ word, player_id }, index, array) => {
    const previousWord = array[index - 1]?.word || '';
    const nextWord = array[index + 1]?.word || '';

    const last = nextWord ? countOverlapStartEnd(word, nextWord) : 0;
    const first = previousWord ? countOverlapStartEnd(previousWord, word) : 0;

    return {
      word,
      player_id,
      first: first,
      last: last,
    } as InGameWord;
  });

  const firstWord = wordList[0];
  const middleWords = wordList.slice(1, wordList.length - 1);
  const lastWord = wordList[wordList.length - 2];
  const inputWord = wordList[wordList.length - 1];

  function isLastIndex(i: number) {
    return i == middleWords.length - 1;
  }

  function removeWord(word: string) {
    setWords((lastWords) => {
      const newWords = lastWords.filter((val) => val.word !== word);
      return newWords;
    });
  }

  return {
    words,
    setWords,
    firstWord,
    lastWord,
    middleWords,
    inputWord,
    isLastIndex,
    removeWord,
  };
}
