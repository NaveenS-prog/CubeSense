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

  // --- PLL Rendering ---
  if (isPLL) {
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
            <polygon points="0 0, 7 3.5, 0 7" fill="#f43f5e" />
          </marker>
        </defs>

        <rect x="18" y="18" width="64" height="64" rx="5" fill="#0c1017" stroke="#334155" strokeWidth="1.5" />
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
                rx="2.5"
                fill="#facc15"
                stroke="#ca8a04"
                strokeWidth="0.8"
                opacity="0.9"
              />
            );
          })
        )}

        {arrows.map((arr, i) => {
          const from = centerCoords[arr.from] || { x: 50, y: 50 };
          const to = centerCoords[arr.to] || { x: 50, y: 50 };
          const isDouble = Boolean(arr.double);

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
                stroke={isDouble ? '#f43f5e' : '#38bdf8'}
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
                  stroke="#f43f5e"
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

  // --- F2L Isometric 3D Rendering (Focusing on Front-Right Slot) ---
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`algo-diagram select-none ${className}`}
    >
      <defs>
        <filter id="f2l-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#10b981" floodOpacity="0.6"/>
        </filter>
      </defs>

      {/* Isometric Cube Representation */}
      {/* Top Face (tilted parallelogram) */}
      <polygon
        points="50,14 80,30 50,46 20,30"
        fill="#1e293b"
        stroke="#475569"
        strokeWidth="1.2"
      />
      {/* Top grid lines */}
      <line x1="40" y1="19.3" x2="30" y2="35.3" stroke="#334155" strokeWidth="1" />
      <line x1="60" y1="19.3" x2="70" y2="35.3" stroke="#334155" strokeWidth="1" />
      <line x1="30" y1="24.7" x2="60" y2="40.7" stroke="#334155" strokeWidth="1" />
      <line x1="40" y1="30" x2="70" y2="24.7" stroke="#334155" strokeWidth="1" />

      {/* Front Face (left-angled vertical surface) */}
      <polygon
        points="20,30 50,46 50,84 20,68"
        fill="#0f172a"
        stroke="#475569"
        strokeWidth="1.2"
      />
      {/* Front layer lines */}
      <line x1="30" y1="35.3" x2="30" y2="73.3" stroke="#1e293b" strokeWidth="1" />
      <line x1="40" y1="40.7" x2="40" y2="78.7" stroke="#1e293b" strokeWidth="1" />
      <line x1="20" y1="42.7" x2="50" y2="58.7" stroke="#1e293b" strokeWidth="1" />
      <line x1="20" y1="55.3" x2="50" y2="71.3" stroke="#1e293b" strokeWidth="1" />

      {/* Right Face (right-angled vertical surface) */}
      <polygon
        points="50,46 80,30 80,68 50,84"
        fill="#0b1120"
        stroke="#475569"
        strokeWidth="1.2"
      />
      {/* Right layer lines */}
      <line x1="60" y1="40.7" x2="60" y2="78.7" stroke="#1e293b" strokeWidth="1" />
      <line x1="70" y1="35.3" x2="70" y2="73.3" stroke="#1e293b" strokeWidth="1" />
      <line x1="50" y1="58.7" x2="80" y2="42.7" stroke="#1e293b" strokeWidth="1" />
      <line x1="50" y1="71.3" x2="80" y2="55.3" stroke="#1e293b" strokeWidth="1" />

      {/* Highlight Target FR Slot (Front-Right corner + middle edge) */}
      <polygon
        points="40,53.3 50,58.7 50,84 40,78.7"
        fill="rgba(16, 185, 129, 0.35)"
        stroke="#10b981"
        strokeWidth="1.8"
        filter="url(#f2l-glow)"
      />
      <polygon
        points="50,58.7 60,53.3 60,78.7 50,84"
        fill="rgba(6, 182, 212, 0.35)"
        stroke="#06b6d4"
        strokeWidth="1.8"
      />

      {/* FR Slot Target indicator text badge */}
      <rect x="36" y="86" width="28" height="11" rx="3" fill="#10b981" />
      <text
        x="50"
        y="94.5"
        textAnchor="middle"
        fontSize="7.5"
        fontWeight="800"
        fill="#041f14"
        fontFamily="sans-serif"
      >
        FR
      </text>

      {/* Active U-layer piece indicator dot */}
      <circle cx="50" cy="30" r="4.5" fill="#facc15" stroke="#ca8a04" strokeWidth="1" />
    </svg>
  );
}
