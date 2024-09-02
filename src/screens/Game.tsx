import '@src/App.css';
import { Word } from '@src/components/Word';
import { useWordList } from '@src/hooks/useWordList';
import React from 'react';
import { BorderShadow } from '@src/components/BorderShadow';
import { WordContainer } from '@src/components/WordContainer';
import { useIsOverflowing } from '@src/hooks/useIsOverflowing';
import { useVerticalScroll } from '@src/hooks/useVerticalScroll';
import { useGameBlocContext } from '@src/providers/GameBlocProvider';
import { Action } from '@shared/enums';
import useIsMobile from '@src/hooks/useIsMobile';
import { Distance } from '@src/utils/types';
import { useClientSize } from '@src/hooks/useClientSize';
import { useContentHeight } from '@src/hooks/useContentHeight';
import { Input } from '@src/components/Input';
import { useVisualViewportH } from '@src/hooks/useVisualViewportH';
import { Timer } from '@src/components/Timer';
// import { useSchedule } from '@src/hooks/useSchedule';

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

  const containerRef = React.useRef<HTMLDivElement>(null);
  const { isTopScrolled, isBottomScrolled } = useVerticalScroll(containerRef);

  const [isWordListHover, setIsWordListHover] = React.useState(false);
  const {contentHeight} = useContentHeight(containerRef, [middleWords.length]);

  const { isOverflowingH } = useIsOverflowing(
    containerRef,
    [containerRef.current, middleWords.length, contentHeight],
    contentHeight + ((middleWords.length - 1) * 4),
  );

  // const isActive = useSchedule(1725318240);

  const isMobile = useIsMobile();

  const [ocupiedHeight, setOcupiedHeight] = React.useState(0);
  const {ref: firstWordRef, clientHeight: firstWordHeight} = useClientSize();
  const {ref: inputRef, clientHeight: inputHeight} = useClientSize();

  React.useEffect(() => {
    const footerHeight = 24;
    const marginsAndPaddings = isMobile ? 84 : 104;
    setOcupiedHeight(firstWordHeight + inputHeight + footerHeight + marginsAndPaddings)
  }, [firstWordHeight, inputHeight])

  function scrollToBottom() {
    if (!isOverflowingH || !containerRef.current) return;
    containerRef.current.scrollTop = containerRef.current?.clientHeight;
  }

  function handleMouseEnter() {
    scrollToBottom();
    setIsWordListHover(true);
  }

  React.useEffect(() => {
    scrollToBottom();
    setWords([...gameData.chain, { word: '' }]);
  }, [gameData]);

  // const { emit } = useEventSystem();

  function onSubmit(value: string) {
    sendEvent({
      action: Action.WORD,
      data: [value],
    });
    // setTimeout(() => {
    //   emit('destroyWords', ['toto', 'alagamento', 'material', 'tomate']);
    // }, 1000);
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    setWords((prevWords) => {
      const updatedWords = [...prevWords];
      updatedWords[updatedWords.length - 1] = { word: e.target.value };
      return updatedWords;
    });
  }

  const playerCount = gameData.players.length;
  const playerTurn = findTurnPlayer();
  const wordDistanceSum = isMobile ? 1 : 0;
  const hasScore = (i: number) => i > middleWords.length - 1 - playerCount

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget)
    onSubmit(formData.get('word')?.toString() || '')
    formData.delete('word')
  }

  const visualViewportH = useVisualViewportH();
  const wordListMaxHeight = visualViewportH - ocupiedHeight;
  const paddingBottom = isMobile ? 'pb-0' : 'pb-5'

  function onEndTurn() {
    sendEvent({
      action: Action.PASS,
      data: [],
    });
  }

  return (
    <div className={`pl-5 flex justify-end items-start flex-col h-full pt-5 ${paddingBottom}`}>
      <div className='w-full flex gap-5'>
        {/* {isActive && <Timer onlyTime duration={300}/>} */}
        {isMyTurn() && <Timer duration={15} onEnd={onEndTurn} />}
      </div>
      <div className="border-t border-neutral-600 mb-3 w-[100%]"></div>
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
          maxHeight: visualViewportH ? `${wordListMaxHeight}px` : "100dvh"
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
          <form onSubmit={handleSubmit} className='w-full'>
          <Input 
            wordProps={{
              chainConfig: { first: inputWord.first, last: inputWord.last },
              className: "max-w-[100%] justify-end overflow-hidden"
            }}
            name="word" 
            value={inputWord.word} 
            onChange={onChange} 
            distance={(1 + wordDistanceSum) as Distance} 
            fixedFocus
          />
          <input type='submit' hidden />
          </form>
        </div>
      ) : (
        <div className="flex justify-center items-center h-12 w-[100%] animate-blink">
          PLAYER {playerTurn.name.toUpperCase()} TURN
        </div>
      )}
    </div>
  );
}
