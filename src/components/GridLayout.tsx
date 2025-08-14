import { useVisualViewport } from "@src/hooks/useVisualViewport";
import { Grid } from "./Grid";
import { animated, useSpring } from "@react-spring/web";
import { useWordAnimations } from "@src/hooks/useWordAnimations";
import { CustomInput } from "./CustomInput";

export type GridItemKey = `${number},${number}`;

export type GridItem = {
  value: string;
  onClick?: () => void;
  hover?: boolean;
  hidden?: boolean;
  newIndex?: GridItemKey;
  onFinishAnimation?: () => void;
  variant?: "default" | "input";
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  color?: "stone" | "amber" | "emerald" | "sky" | "purple" | "rose";
}

export type GridItems = {[key: GridItemKey]: GridItem}

type GridLayoutProps = {
  gridItems?: GridItems;
}

export function GridLayout({ gridItems }: GridLayoutProps) {
  const { height, width } = useVisualViewport();
  const itemGap = 0.2;
  const itemSize = 1.6;
  const roundedGridRows = Math.round((height / 16) / (itemSize + itemGap));
  const gridRows = roundedGridRows % 2 === 0 ? roundedGridRows + 1 : roundedGridRows;
  const roundedGridCols = Math.round((width / 16) / (itemSize + itemGap));
  const gridCols = roundedGridCols % 2 === 0 ? roundedGridCols + 1 : roundedGridCols;

  // function check(input: [number, number], grid: [number, number]) {
  //   if (input[0] == grid[0] && input[1] == grid[1]) return true;
  //   return false;
  // }

  const gridData = Array.from({ length: gridRows }, (_, row) =>
    Array.from({ length: gridCols }, () => ({
      value: '',
    }))
  )

  return (
    <div className="w-full h-full overflow-hidden">
      <div className="flex justify-center items-end w-full h-full">
        <Grid 
          gridData={gridData}
          itemWidth={itemSize}
          itemHeight={itemSize} 
          gap={itemGap} 
          renderItem={function (item, rowIndex, colIndex) {
            if (gridItems && `${rowIndex},${colIndex}` in gridItems) {
              const { value, ...cell } = gridItems[`${rowIndex},${colIndex}`];
              if (cell.variant === "input")
                return <CustomInput {...cell} itemGap={itemGap} itemSize={itemSize} index={`${rowIndex},${colIndex}`} value={value} onChange={cell.onChange} />
              return <Word {...cell} itemGap={itemGap} itemSize={itemSize} index={`${rowIndex},${colIndex}`}>{value}</Word>
            }
            return item.value
          }}
        />
      </div>
    </div>
  )
}

export type WordProps = {
  children: string;
  itemGap: number;
  itemSize: number;
  index: GridItemKey;
} & Omit<GridItem, "value">;

function Word({ children, itemGap, itemSize, index, variant = "default", ...cell }: WordProps) {
  const {
    word,
    setHoverIndex,
    hiddenProps,
    newIndexProps,
    propagateProps,
  } = useWordAnimations({ children, itemGap, itemSize, index, ...cell });

  const wordStyle = (hover: boolean) => ({
    gap: `${itemGap}rem`,
    zIndex: 10,
    cursor: hover ? 'pointer' : 'default',
  })

  const letterStyle = () => ({
    width: `${itemSize}rem`,
    height: `${itemSize}rem`,
  })

  return (
    <div 
      className="absolute flex" 
      style={wordStyle(!!cell.hover)} 
      onClick={cell.onClick}
      onMouseLeave={() => {setHoverIndex(null)}}
    >
      {Array.from(word).map((char, i) => (
        <animated.div 
          className="transition-y duration-100"
          key={i}
          style={{
            ...letterStyle(), 
            ...hiddenProps[i],
            ...newIndexProps[i], 
            ...propagateProps(i),
          }}
          onMouseEnter={() => {
            setHoverIndex(i)}
          }
        >
          <Letter variant={variant} color={cell.color}>{char}</Letter>
        </animated.div>
      ))}
    </div>
  )
}



type LetterProps = {
  children: string;
  variant: NonNullable<GridItem["variant"]>;
  blink?: boolean;
  animate?: boolean;
  color?: GridItem["color"];
};

export function Letter({ children: char, variant, blink, animate, color = "stone" }: LetterProps) {
  const colors = {
    stone: {
      shadow: "bg-stone-700",
      bg: "bg-stone-600 text-stone-200",
    },
    amber: {
      shadow: "bg-amber-700",
      bg: "bg-amber-600 text-amber-200",
    },
    emerald: {
      shadow: "bg-emerald-700",
      bg: "bg-emerald-600 text-emerald-200",
    },
    sky: {
      shadow: "bg-sky-700",
      bg: "bg-sky-600 text-sky-200",
    },
    purple: {
      shadow: "bg-purple-700",
      bg: "bg-purple-600 text-purple-200",
    },
    rose: {
      shadow: "bg-rose-700",
      bg: "bg-rose-600 text-rose-200",
    },
  }
  
  const colorStyle = {
    default: {
      shadow: char != " " ? colors[color].shadow : "bg-transparent",
      bg: char != " " ? colors[color].bg : "bg-transparent",
    },
    input: {
      shadow: colors[color].shadow,
      bg: "bg-transparent",
    },
  }

  const hiddenProps = useSpring({
    from: { scale: 0 },
    to: { scale: 1 },
    delay: 50,
  })
  
  return (
    <animated.div
      className={`${colorStyle[variant].shadow} w-full h-full rounded-sm` }
      style={animate ? hiddenProps : {}}
    >
      <div className={`${colorStyle[variant].bg} flex justify-center items-center rounded-sm h-[90%] font-semibold`}>
        {char}
      </div>
      {blink && <div className="p-1 -mt-2"><div className="w-full h-1 bg-stone-400 animate-blink rounded-sm"></div></div>}
    </animated.div>
  )
}