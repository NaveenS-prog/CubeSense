import React from 'react';

/**
 * Visualizer for OLL and PLL Cases.
 * Renders high-fidelity top-down cube diagrams with orientation bars (OLL)
 * and permutation cycle arrows (PLL).
 */
export default function AlgoVisualizer({ caseObj, size = 96, className = '' }) {
  if (!caseObj) return null;

  const isOLL = Boolean(caseObj.grid);

  // SVG viewBox is 100 x 100
  // Center 3x3 cube is from x: 20 to 80, y: 20 to 80 (size 60x60)
  // Each sticker is 18x18 with 2px gap (18*3 + 4 = 58, centered)
  const cubeStart = 21;
  const stickerSize = 18;
  const gap = 2;

  const getStickerPos = (row, col) => ({
    x: cubeStart + col * (stickerSize + gap),
    y: cubeStart + row * (stickerSize + gap),
  });

  if (isOLL) {
    const grid = caseObj.grid || Array(9).fill(0);
    const bars = caseObj.bars || { top: [0,0,0], right: [0,0,0], bottom: [0,0,0], left: [0,0,0] };

    return (
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className={`algo-diagram select-none ${className}`}
      >
        {/* Background rounded base */}
        <rect x="18" y="18" width="64" height="64" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />

        {/* 3x3 Yellow Facelets */}
        {grid.map((oriented, idx) => {
          const row = Math.floor(idx / 3);
          const col = idx % 3;
          const pos = getStickerPos(row, col);
          const fill = oriented ? '#facc15' : '#1e293b';

          return (
            <rect
              key={idx}
              x={pos.x}
              y={pos.y}
              width={stickerSize}
              height={stickerSize}
              rx="2"
              fill={fill}
              stroke="#0f172a"
              strokeWidth="1.2"
            />
          );
        })}

        {/* Outer orientation bars */}
        {/* Top bar (facing up) */}
        {bars.top?.map((active, col) => {
          if (!active) return null;
          const pos = getStickerPos(0, col);
          return (
            <rect
              key={`top-${col}`}
              x={pos.x}
              y="11"
              width={stickerSize}
              height="5"
              rx="1.5"
              fill="#facc15"
              stroke="#ca8a04"
              strokeWidth="0.8"
            />
          );
        })}

        {/* Bottom bar (facing down) */}
        {bars.bottom?.map((active, col) => {
          if (!active) return null;
          const pos = getStickerPos(2, col);
          return (
            <rect
              key={`bottom-${col}`}
              x={pos.x}
              y="84"
              width={stickerSize}
              height="5"
              rx="1.5"
              fill="#facc15"
              stroke="#ca8a04"
              strokeWidth="0.8"
            />
          );
        })}

        {/* Left bar (facing left) */}
        {bars.left?.map((active, row) => {
          if (!active) return null;
          const pos = getStickerPos(row, 0);
          return (
            <rect
              key={`left-${row}`}
              x="11"
              y={pos.y}
              width="5"
              height={stickerSize}
              rx="1.5"
              fill="#facc15"
              stroke="#ca8a04"
              strokeWidth="0.8"
            />
          );
        })}

        {/* Right bar (facing right) */}
        {bars.right?.map((active, row) => {
          if (!active) return null;
          const pos = getStickerPos(row, 2);
          return (
            <rect
              key={`right-${row}`}
              x="84"
              y={pos.y}
              width="5"
              height={stickerSize}
              rx="1.5"
              fill="#facc15"
              stroke="#ca8a04"
              strokeWidth="0.8"
            />
          );
        })}
      </svg>
    );
  }

  // PLL Case Visualization: 3x3 yellow face with permutation arrows
  const centerCoords = {
    'corner-top-left': { x: 30, y: 30 },
    'back': { x: 50, y: 30 },
    'corner-top-right': { x: 70, y: 30 },
    'left': { x: 30, y: 50 },
    'center': { x: 50, y: 50 },
    'right': { x: 70, y: 50 },
    'corner-bottom-left': { x: 30, y: 70 },
    'front': { x: 50, y: 70 },
    'corner-bottom-right': { x: 70, y: 70 },
  };

  const arrows = caseObj.arrows || [];

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`algo-diagram select-none ${className}`}
    >
      <defs>
        <marker
          id="pll-arrowhead"
          markerWidth="7"
          markerHeight="7"
          refX="5"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 7 3.5, 0 7" fill="#38bdf8" />
        </marker>
        <marker
          id="pll-arrowhead-double"
          markerWidth="7"
          markerHeight="7"
          refX="5"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 7 3.5, 0 7" fill="#ef4444" />
        </marker>
      </defs>

      {/* 3x3 Yellow Face Background */}
      <rect x="18" y="18" width="64" height="64" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
      {[0, 1, 2].map((r) =>
        [0, 1, 2].map((c) => {
          const pos = getStickerPos(r, c);
          return (
            <rect
              key={`${r}-${c}`}
              x={pos.x}
              y={pos.y}
              width={stickerSize}
              height={stickerSize}
              rx="2"
              fill="#facc15"
              stroke="#ca8a04"
              strokeWidth="0.8"
              opacity="0.85"
            />
          );
        })
      )}

      {/* Permutation Cycle Arrows */}
      {arrows.map((arr, i) => {
        const from = centerCoords[arr.from] || { x: 50, y: 50 };
        const to = centerCoords[arr.to] || { x: 50, y: 50 };
        const isDouble = Boolean(arr.double);

        // Adjust endpoints slightly so arrowhead touches clean
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dist = Math.hypot(dx, dy) || 1;
        const endX = to.x - (dx / dist) * 4;
        const endY = to.y - (dy / dist) * 4;

        return (
          <g key={i}>
            <line
              x1={from.x}
              y1={from.y}
              x2={endX}
              y2={endY}
              stroke={isDouble ? '#ef4444' : '#38bdf8'}
              strokeWidth="2.5"
              strokeLinecap="round"
              markerEnd={`url(#${isDouble ? 'pll-arrowhead-double' : 'pll-arrowhead'})`}
            />
            {isDouble && (
              <line
                x1={to.x}
                y1={to.y}
                x2={from.x + (dx / dist) * 4}
                y2={from.y + (dy / dist) * 4}
                stroke="#ef4444"
                strokeWidth="2.5"
                strokeLinecap="round"
                markerEnd="url(#pll-arrowhead-double)"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
