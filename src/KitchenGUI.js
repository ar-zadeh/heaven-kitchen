import React from 'react';

// Import your SVG images
import ChefSVG from './chef.svg';
import TableSVG from './table.svg';
import BackgroundSVG from './background.svg';
import StorageSVG from './storage.svg';

const KitchenGUI = ({ cooks, inventory }) => {
  const aspectRatio = 4 / 3; // Maintain a 4:3 aspect ratio
  const kitchenWidth = 400; // This is now just a reference size
  const kitchenHeight = kitchenWidth / aspectRatio;
  const cookSize = kitchenWidth * 0.05; // 5% of kitchen width
  const tableSize = kitchenWidth * 0.1; // 10% of kitchen width
  const inventorySize = kitchenWidth * 0.15; // 15% of kitchen width

  const inventoryPosition = { x: kitchenWidth * 0.05, y: kitchenHeight / 2 - inventorySize / 2 };

  const tablePositions = cooks.map((_, index) => ({
    x: kitchenWidth * 0.8,
    y: kitchenHeight * (0.2 + index * 0.2)
  }));

  const getCookPosition = (index, busy, currentOrder) => {
    if (!busy) {
      return { x: kitchenWidth * (0.25 + index * 0.125), y: kitchenHeight * 0.9 };
    } else if (currentOrder) {
      const targetTable = tablePositions[index];
      return {
        x: targetTable.x - cookSize / 2,
        y: targetTable.y - cookSize / 2,
      };
    }
    return { x: inventoryPosition.x + inventorySize + kitchenWidth * 0.05, y: inventoryPosition.y + index * (kitchenHeight * 0.1) };
  };

  return (
    <svg
      viewBox={`0 0 ${kitchenWidth} ${kitchenHeight}`}
      style={{ width: '100%', height: '100%' }}
    >
      {/* Kitchen background */}
      <image href={BackgroundSVG} width={kitchenWidth} height={kitchenHeight} />

      {/* Storage */}
      <image
        href={StorageSVG}
        x={inventoryPosition.x}
        y={inventoryPosition.y}
        width={inventorySize}
        height={inventorySize}
      />
      <text
        x={inventoryPosition.x + inventorySize / 2}
        y={inventoryPosition.y + inventorySize / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={kitchenWidth * 0.03}
      >
        Storage
      </text>

      {/* Tables */}
      {tablePositions.map((pos, index) => (
        <g key={index}>
          <image
            href={TableSVG}
            x={pos.x - tableSize / 2}
            y={pos.y - tableSize / 2}
            width={tableSize}
            height={tableSize}
          />
          <text
            x={pos.x}
            y={pos.y + tableSize * 0.75}
            textAnchor="middle"
            fontSize={kitchenWidth * 0.025}
            fill="#333"
          >
            Table {index + 1}
          </text>
        </g>
      ))}

      {/* Cooks */}
      {cooks.map((cook, index) => {
        const position = getCookPosition(index, cook.busy, cook.currentOrder);
        return (
          <g key={index}>
            <image
              href={ChefSVG}
              x={position.x - cookSize / 2}
              y={position.y - cookSize / 2}
              width={cookSize}
              height={cookSize}
              style={{ filter: cook.busy ? 'hue-rotate(90deg)' : 'none' }}
            />
            <text
              x={position.x}
              y={position.y + cookSize * 0.75}
              textAnchor="middle"
              fontSize={kitchenWidth * 0.025}
            >
              {cook.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export default KitchenGUI;
