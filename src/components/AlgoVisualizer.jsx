import React from 'react';

/**
 * Universal Visualizer for F2L, OLL, and PLL Cases.
 * Renders high-fidelity top-down cube diagrams with orientation bars (OLL),
 * permutation cycle arrows (PLL), and an isometric slot view (F2L).
 */
export default function AlgoVisualizer({ caseObj, size = 96, className = '' }) {
  if (!caseObj) return null;

  const isOLL = Boolean(caseObj.grid);
  const isPLL = Boolean(caseObj.arrows);
  const isF2L = Boolean(caseObj.slot || caseObj.id?.startsWith('f2l'));

  // SVG viewBox is 100 x 100
  const cubeStart = 21;
  const stickerSize = 18;
  const gap = 2;

  const getStickerPos = (row, col) => ({
    x: cubeStart + col * (stickerSize + gap),
    y: cubeStart + row * (stickerSize + gap),
  });

  // --- OLL Rendering ---
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
        <rect x="18" y="18" width="64" height="64" rx="5" fill="#0c1017" stroke="#334155" strokeWidth="1.5" />

        {/* 3x3 Facelets */}
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
              rx="2.5"
              fill={fill}
              stroke="#0c1017"
              strokeWidth="1.2"
            />
          );
        })}

        {/* Outer orientation bars */}
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

  // --- PLL Rendering with Authentic CubeSkills Full Last-Layer Rim & Cycle Arrows ---
  if (isPLL) {
    const centerCoords = {
      'corner-top-left': { x: 32.5, y: 32.5 },
      'back': { x: 50, y: 32.5 },
      'corner-top-right': { x: 67.5, y: 32.5 },
      'left': { x: 32.5, y: 50 },
      'center': { x: 50, y: 50 },
      'right': { x: 67.5, y: 50 },
      'corner-bottom-left': { x: 32.5, y: 67.5 },
      'front': { x: 50, y: 67.5 },
      'corner-bottom-right': { x: 67.5, y: 67.5 },
    };

    const FACE_COLORS = {
      F: '#22c55e', // Green (Front)
      B: '#3b82f6', // Blue (Back)
      R: '#ef4444', // Red (Right)
      L: '#f97316', // Orange (Left)
      U: '#facc15', // Yellow (Up)
      D: '#f8fafc', // White (Down)
    };

    const arrows = caseObj.arrows || [];
    const rim = caseObj.rim || null;

    // Center 3x3 layout
    const cSize = 16;
    const cGap = 1.5;
    const cStart = 24.5;

    // Rim layout
    const rimThickness = 8;
    const rimGap = 2.5;

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
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto"
          >
            <path d="M 1 2 L 8 5 L 1 8 z" fill="#090d16" />
          </marker>
          <marker
            id="pll-arrowhead-start"
            viewBox="0 0 10 10"
            refX="3"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto"
          >
            <path d="M 8 2 L 1 5 L 8 8 z" fill="#090d16" />
          </marker>
        </defs>

        {/* Center 3x3 Yellow Facelets Base Frame */}
        <rect
          x={cStart - 1}
          y={cStart - 1}
          width={cSize * 3 + cGap * 2 + 2}
          height={cSize * 3 + cGap * 2 + 2}
          rx="2.5"
          fill="#0c1017"
          stroke="#000000"
          strokeWidth="1.2"
        />

        {/* 3x3 Yellow Facelets */}
        {[0, 1, 2].map((r) =>
          [0, 1, 2].map((c) => {
            const x = cStart + c * (cSize + cGap);
            const y = cStart + r * (cSize + cGap);
            return (
              <rect
                key={`pll-c-${r}-${c}`}
                x={x}
                y={y}
                width={cSize}
                height={cSize}
                rx="1.5"
                fill="#facc15"
                stroke="#0f172a"
                strokeWidth="1"
              />
            );
          })
        )}

        {/* Outer Rim Side Facelets (Top, Bottom, Left, Right) */}
        {rim && (
          <g className="pll-rim-stickers">
            {/* Top Rim (Back face: left-to-right) */}
            {rim.top?.map((colorKey, col) => {
              const x = cStart + col * (cSize + cGap);
              const y = cStart - rimGap - rimThickness;
              const fill = FACE_COLORS[colorKey] || '#334155';
              return (
                <rect
                  key={`rim-top-${col}`}
                  x={x}
                  y={y}
                  width={cSize}
                  height={rimThickness}
                  rx="1.5"
                  fill={fill}
                  stroke="#000000"
                  strokeWidth="1.1"
                />
              );
            })}

            {/* Bottom Rim (Front face: left-to-right) */}
            {rim.bottom?.map((colorKey, col) => {
              const x = cStart + col * (cSize + cGap);
              const y = cStart + 3 * cSize + 2 * cGap + rimGap;
              const fill = FACE_COLORS[colorKey] || '#334155';
              return (
                <rect
                  key={`rim-bottom-${col}`}
                  x={x}
                  y={y}
                  width={cSize}
                  height={rimThickness}
                  rx="1.5"
                  fill={fill}
                  stroke="#000000"
                  strokeWidth="1.1"
                />
              );
            })}

            {/* Left Rim (Left face: top-to-bottom) */}
            {rim.left?.map((colorKey, row) => {
              const x = cStart - rimGap - rimThickness;
              const y = cStart + row * (cSize + cGap);
              const fill = FACE_COLORS[colorKey] || '#334155';
              return (
                <rect
                  key={`rim-left-${row}`}
                  x={x}
                  y={y}
                  width={rimThickness}
                  height={cSize}
                  rx="1.5"
                  fill={fill}
                  stroke="#000000"
                  strokeWidth="1.1"
                />
              );
            })}

            {/* Right Rim (Right face: top-to-bottom) */}
            {rim.right?.map((colorKey, row) => {
              const x = cStart + 3 * cSize + 2 * cGap + rimGap;
              const y = cStart + row * (cSize + cGap);
              const fill = FACE_COLORS[colorKey] || '#334155';
              return (
                <rect
                  key={`rim-right-${row}`}
                  x={x}
                  y={y}
                  width={rimThickness}
                  height={cSize}
                  rx="1.5"
                  fill={fill}
                  stroke="#000000"
                  strokeWidth="1.1"
                />
              );
            })}
          </g>
        )}

        {/* Permutation Cycle & Swap Arrows (Bold high-contrast black) */}
        {arrows.map((arr, i) => {
          const from = centerCoords[arr.from] || { x: 50, y: 50 };
          const to = centerCoords[arr.to] || { x: 50, y: 50 };
          const isDouble = Boolean(arr.double);

          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const dist = Math.hypot(dx, dy) || 1;
          const nx = dx / dist;
          const ny = dy / dist;

          const startX = from.x + nx * (isDouble ? 4 : 2);
          const startY = from.y + ny * (isDouble ? 4 : 2);
          const endX = to.x - nx * 4.5;
          const endY = to.y - ny * 4.5;

          return (
            <g key={`pll-arr-${i}`}>
              <line
                x1={startX}
                y1={startY}
                x2={endX}
                y2={endY}
                stroke="#090d16"
                strokeWidth="2.8"
                strokeLinecap="round"
                markerStart={isDouble ? 'url(#pll-arrowhead-start)' : undefined}
                markerEnd="url(#pll-arrowhead)"
              />
            </g>
          );
        })}
      </svg>
    );
  }

  // --- F2L Isometric 3D Rendering (Focusing on Front-Right Slot) ---
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`algo-diagram select-none ${className}`}
    >
      {/* Isometric Cube Representation */}
      {/* Top Face (tilted parallelogram) */}
      <polygon
        points="50,14 80,30 50,46 20,30"
        fill="#1e222b"
        stroke="#333947"
        strokeWidth="1"
      />
      {/* Top grid lines */}
      <line x1="40" y1="19.3" x2="30" y2="35.3" stroke="#252a36" strokeWidth="1" />
      <line x1="60" y1="19.3" x2="70" y2="35.3" stroke="#252a36" strokeWidth="1" />
      <line x1="30" y1="24.7" x2="60" y2="40.7" stroke="#252a36" strokeWidth="1" />
      <line x1="40" y1="30" x2="70" y2="24.7" stroke="#252a36" strokeWidth="1" />

      {/* Front Face (left-angled vertical surface) */}
      <polygon
        points="20,30 50,46 50,84 20,68"
        fill="#14171d"
        stroke="#333947"
        strokeWidth="1"
      />
      {/* Front layer lines */}
      <line x1="30" y1="35.3" x2="30" y2="73.3" stroke="#202530" strokeWidth="1" />
      <line x1="40" y1="40.7" x2="40" y2="78.7" stroke="#202530" strokeWidth="1" />
      <line x1="20" y1="42.7" x2="50" y2="58.7" stroke="#202530" strokeWidth="1" />
      <line x1="20" y1="55.3" x2="50" y2="71.3" stroke="#202530" strokeWidth="1" />

      {/* Right Face (right-angled vertical surface) */}
      <polygon
        points="50,46 80,30 80,68 50,84"
        fill="#101217"
        stroke="#333947"
        strokeWidth="1"
      />
      {/* Right layer lines */}
      <line x1="60" y1="40.7" x2="60" y2="78.7" stroke="#202530" strokeWidth="1" />
      <line x1="70" y1="35.3" x2="70" y2="73.3" stroke="#202530" strokeWidth="1" />
      <line x1="50" y1="58.7" x2="80" y2="42.7" stroke="#202530" strokeWidth="1" />
      <line x1="50" y1="71.3" x2="80" y2="55.3" stroke="#202530" strokeWidth="1" />

      {/* Highlight Target FR Slot (Front-Right corner + middle edge) */}
      <polygon
        points="40,53.3 50,58.7 50,84 40,78.7"
        fill="rgba(16, 185, 129, 0.25)"
        stroke="#10b981"
        strokeWidth="1.5"
      />
      <polygon
        points="50,58.7 60,53.3 60,78.7 50,84"
        fill="rgba(16, 185, 129, 0.15)"
        stroke="#10b981"
        strokeWidth="1.5"
      />

      {/* FR Slot Target indicator text badge */}
      <rect x="37" y="87" width="26" height="10" rx="3" fill="#181b22" stroke="#333947" strokeWidth="1" />
      <text
        x="50"
        y="94.5"
        textAnchor="middle"
        fontSize="7"
        fontWeight="700"
        fill="#ededee"
        fontFamily="sans-serif"
      >
        FR SLOT
      </text>

      {/* Active U-layer piece indicator dot */}
      <circle cx="50" cy="30" r="4.5" fill="#facc15" stroke="#ca8a04" strokeWidth="1" />
    </svg>
  );
}
