import { useSprings } from "@react-spring/web";
import { WordProps } from "@src/components/GridLayout";
import React from "react";

type UseWordAnimationsParams = WordProps;

export function useWordAnimations({ children, itemGap, itemSize, index, ...cell }: UseWordAnimationsParams) {
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null);
  const [word, setWord] = React.useState<string>(children);

  const propagateProps = (i: number) => {
    if (hoverIndex === null || !cell.hover) return;
    return { y: - 6 + (Math.abs(i - hoverIndex) * 1.2) }
  };

  const [y, x] = index.split(",").map(Number);
  const [newY, newX] = cell.newIndex?.split(",").map(Number) || [y, x];
  const newDistanceY = (newY - y) * ((itemSize + itemGap) * 16);
  const newDistanceX = (newX - x) * ((itemSize + itemGap) * 16);

  const newIndexTo = (i: number) => ({
    to: { y: newDistanceY, x: newDistanceX },
    delay: 100 * i
  })

  const [newIndexProps] = useSprings(
    children.length,
    (i) => ({
      from: { y: 0, x: 0 },
      ...newIndexTo(i),
      pause: !cell.newIndex,
      onRest: cell.onFinishAnimation,
    }),
    [cell.newIndex]
  )

  const hiddenTo = (i: number) => ({
    to: { scale: 1 },
    delay: 50 * i
  })

  const [hiddenProps, set] = useSprings(
    word.length,
    (i) => ({
      from: { scale: 0 },
      ...hiddenTo(i),
      reverse: cell.hidden,
    }),
    [cell.hidden]
  )

  React.useEffect(() => {
    if (cell.hidden) return;
    if (word != children) {
      const res = set((i) => ({ scale: 0, delay: 50 * i }));
      Promise.all(res).then(() => setWord(children));
    } else {
      set({ scale: 1 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children])

  return {
    word,
    setHoverIndex,
    hiddenProps,
    newIndexProps,
    propagateProps,
  }
}