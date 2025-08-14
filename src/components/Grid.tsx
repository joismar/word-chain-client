import React from 'react';

type GridProps = {
  gridData: GridItem[][];
  itemWidth: number;
  itemHeight: number;
  renderItem: (item: GridItem, rowIndex: number, colIndex: number) => React.ReactNode;
  gap?: number;
};

export interface GridItem {
  value: string;
}

export function Grid({ gridData, itemWidth, itemHeight, renderItem, gap = 0.1 }: GridProps) {
  const numCols = gridData.length > 0 ? gridData[0].length : 0;
  const numRows = gridData.length;
  const centerCell = [Math.floor(numRows / 2), Math.floor(numCols / 2)];

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${numCols}, ${itemWidth}rem)`,
    gridTemplateRows: `repeat(${numRows}, ${itemHeight}rem)`,
    gap: `${gap}rem`,
  };

  return (
    <div style={gridStyle} className="bg-stone-800">
      {gridData.map((row: GridItem[], rowIndex: number) => (
        row.map((item: GridItem, colIndex: number) => (
          <div
            key={`${rowIndex}-${colIndex}`}
            className="bg-stone-900 rounded-sm relative"
            style={{ width: `${itemWidth}rem`, height: `${itemHeight}rem` }}
          >
            {renderItem(item, rowIndex - centerCell[0], colIndex - centerCell[1])}
          </div>
        ))
      ))}
    </div>
  );
};
