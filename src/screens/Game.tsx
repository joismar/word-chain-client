import '@src/App.css';
import { Word } from '@src/components/Word';
import { useWordList } from '@src/hooks/useWordList';
import { useInputManager } from '@src/hooks/useInputManager';
import React from 'react';
import { BorderShadow } from '@src/components/BorderShadow';
import { WordContainer } from '@src/components/WordContainer';
import { useIsOverflowing } from '@src/hooks/useIsOverflowing';
import { useVerticalScroll } from '@src/hooks/useVerticalScroll';
import { useGameBlocContext } from '@src/providers/GameBlocProvider';
import { Action } from '@shared/enums';

export function Game() {
  const { gameData, sendEvent, isMyTurn, findTurnPlayer } =
    useGameBlocContext();
  const {
    setWords,
    firstWord,
    middleWords,
    inputWord,
    isLastIndex,
    removeWord,
  } = useWordList();

  React.useEffect(() => {
    setWords([...gameData.chain, { word: '' }]);
  }, [gameData]);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const { isTopScrolled, isBottomScrolled } = useVerticalScroll(containerRef);

  const [isWordListHover, setIsWordListHover] = React.useState(false);

  const { isOverflowingH, clientWidth } = useIsOverflowing(
    containerRef,
    [containerRef.current, middleWords.length],
    (middleWords.length - 1) * 32 + 52
  );

  function handleMouseEnter() {
    if (!isOverflowingH || !containerRef.current) return;
    containerRef.current.scrollTop = containerRef.current?.clientHeight;
    setIsWordListHover(true);
  }

  // const { emit } = useEventSystem();

  function onSubmit(value: string) {
    sendEvent({
      action: Action.WORD,
      data: [value],
    });
    setValue('');
    setTimeout(() => {
      // emit('destroyWords', ['toto', 'alagamento', 'material', 'tomate']);
    }, 1000);
  }

  function onChange(value: string) {
    setWords((prevWords) => {
      const updatedWords = [...prevWords];
      updatedWords[updatedWords.length - 1] = { word: value };
      return updatedWords;
    });
  }

  const [_, setValue] = useInputManager({ onSubmit, onChange });
  const playerCount = gameData.players.length;
  const playerTurn = findTurnPlayer();

  return (
    <div className="flex justify-end items-start flex-col flex-1 px-20 pb-20 pt-10 max-h-[calc(100vh_-_5rem)] w-[100%] max-w-[50rem]">
      {firstWord && (
        <Word
          distance={2}
          chainConfig={{ first: firstWord.first, last: firstWord.last }}
          wrap
        >
          {firstWord.word}
        </Word>
      )}
      <div className="border-t border-neutral-600 mb-1 mt-3 w-[100%]"></div>
      <BorderShadow
        direction="b"
        className="ml-[-3.2rem] w-[calc(100%_+_3.2rem)] z-[10]"
        isVisible={
          isOverflowingH &&
          (isWordListHover ? isTopScrolled : true) &&
          gameData.chain.length > 1
        }
      />
      <div
        ref={containerRef}
        className={`flex items-start justify-end hover:justify-start flex-col gap-2 overflow-y-hidden hover:overflow-y-auto py-2 ml-[-3.5rem] pl-[3.5rem] w-[calc(100%_+_3.5rem)] h-max-[calc(100vh_-_22.475rem)]`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setIsWordListHover(false)}
      >
        {middleWords.map((word, i) => (
          <WordContainer
            isLastIndex={isLastIndex(i)}
            word={word}
            containerWidth={clientWidth}
            onDestroy={() => removeWord(word.word)}
            key={word.word}
            showAvatar={i > middleWords.length - 1 - playerCount}
          />
        ))}
      </div>
      <BorderShadow
        direction="t"
        className="ml-[-3.2rem] w-[calc(100%_+_3.2rem)] z-[10]"
        isVisible={isWordListHover ? isBottomScrolled : false}
      />
      <div className="border-t border-neutral-600 mb-3 mt-1 w-[100%]"></div>
      {inputWord && isMyTurn() ? (
        <div className="flex w-[100%] justify-between">
          <BorderShadow
            size="64px"
            direction="r"
            className="z-[10]"
            isVisible
          />
          <Word
            chainConfig={{ first: inputWord.first, last: inputWord.last }}
            className="max-w-[100%] justify-end overflow-hidden"
            blink
          >
            {inputWord.word}
          </Word>
        </div>
      ) : (
        <div className="flex justify-center items-center h-12 w-[100%] animate-blink">
          PLAYER {playerTurn.name.toUpperCase()} TURN
        </div>
      )}
    </div>
  );
}
