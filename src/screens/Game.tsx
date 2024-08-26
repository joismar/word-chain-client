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
import { useKeyboard } from '@src/providers/KeyboardProvider';
import useIsMobile from '@src/hooks/useIsMobile';
import { Distance } from '@src/utils/types';
import { useClientSize } from '@src/hooks/useClientSize';
import { useContentHeight } from '@src/hooks/useContentHeight';

export function Game() {
  const { gameData, sendEvent, isMyTurn, findTurnPlayer } =
    useGameBlocContext();
  const {
    setWords,
    firstWord,
    middleWords,
    inputWord,
    removeWord,
  } = useWordList();
  const { setOnSubmit, input, resetInput } = useKeyboard();

  React.useEffect(() => {
    setValue(input);
    setOnSubmit(() => () => {
      onSubmit(input);
      resetInput();
    });
  }, [input]);

  React.useEffect(() => {
    setWords([...gameData.chain, { word: '' }]);
  }, [gameData]);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const { isTopScrolled, isBottomScrolled } = useVerticalScroll(containerRef);

  const [isWordListHover, setIsWordListHover] = React.useState(false);
  const {contentHeight} = useContentHeight(containerRef, [middleWords.length]);

  const { isOverflowingH } = useIsOverflowing(
    containerRef,
    [containerRef.current, middleWords.length, contentHeight],
    contentHeight + ((middleWords.length - 1) * 4),
  );

  const [ocupiedHeight, setOcupiedHeight] = React.useState(0);
  const firstWordRef = React.useRef<HTMLDivElement>(null);
  const {clientHeight: firstWordHeight} = useClientSize(firstWordRef);
  const inputRef = React.useRef<HTMLDivElement>(null);
  const {clientHeight: inputHeight} = useClientSize(inputRef);

  React.useEffect(() => {
    // console.log(firstWordHeight, inputHeight)
    setOcupiedHeight(firstWordHeight + inputHeight + 16)
  }, [firstWordHeight, inputHeight])

  // console.log(isOverflowingH, contentHeight, containerRef.current?.clientHeight)

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
  const wordDistanceSum = useIsMobile() ? 1 : 0
  const hasScore = (i: number) => i > middleWords.length - 1 - playerCount

  return (
    <div className="pl-5 flex justify-end items-start flex-col h-full">
      <div ref={firstWordRef}>
      {firstWord && (
        <Word
          distance={(2 + wordDistanceSum) as Distance}
          chainConfig={{ first: firstWord.first, last: firstWord.last }}
          wrap
        >
          {firstWord.word}
        </Word>
      )}
      </div>
      {/* <div className="border-t border-neutral-600 mb-1 mt-3 w-[100%]"></div> */}
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
        className={`flex items-start justify-end hover:justify-start flex-col gap-1 overflow-y-hidden hover:overflow-y-auto py-2 ml-[-3.5rem] pl-[3.5rem] w-[calc(100%_+_3.5rem)]`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setIsWordListHover(false)}
        style={{
          maxHeight: `calc(100% - ${ocupiedHeight}px)`
        }}
      >
        {middleWords.map((word, i) => (
          <WordContainer
            word={word}
            onDestroy={() => removeWord(word.word)}
            key={word.word}
            hasScore={hasScore(i)}
          />
        ))}
      </div>
      <BorderShadow
        direction="t"
        className="ml-[-3.2rem] w-[calc(100%_+_3.2rem)] z-[10]"
        isVisible={isWordListHover ? isBottomScrolled : false}
      />
      <div className="border-t border-neutral-600 mb-3 w-[100%]"></div>
      {inputWord && isMyTurn() ? (
        <div className="flex w-[100%] justify-between" ref={inputRef}>
          <BorderShadow
            size="64px"
            direction="r"
            className="z-[10]"
            isVisible
          />
          <Word
            chainConfig={{ first: inputWord.first, last: inputWord.last }}
            className="max-w-[100%] justify-end overflow-hidden"
            distance={(1 + wordDistanceSum) as Distance}
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
