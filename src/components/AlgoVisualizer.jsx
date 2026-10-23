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

  // --- F2L High-Fidelity 3D Isometric Case Visualizer ---
  const visual = caseObj.visual;
  const corner = visual?.corner;
  const edge = visual?.edge;

  const COLOR_MAP = {
    white: '#f8fafc',
    green: '#22c55e',
    red: '#ef4444',
    yellow: '#facc15',
    blue: '#3b82f6',
    orange: '#f97316',
    neutral: '#1e293b',
    neutralEdge: '#141c2b',
  };

  const getColor = (name, fallback = '#1e293b') => {
    if (!name) return fallback;
    return COLOR_MAP[name] || name;
  };

  // 1. Top Face (U) Facelet Colors [row 0..2, col 0..2]
  // (0,0): UBL, (0,1): UB, (0,2): UBR
  // (1,0): UL,  (1,1): U,  (1,2): UR
  // (2,0): UFL, (2,1): UF, (2,2): UFR
  const uColors = [
    ['#1e293b', '#1e293b', '#1e293b'],
    ['#1e293b', '#1e293b', '#1e293b'],
    ['#1e293b', '#1e293b', '#1e293b'],
  ];

  // 2. Front Face (F) Facelet Colors [row 0..2, col 0..2]
  // Row 0: UFL(0,0), UF(0,1), UFR(0,2)
  // Row 1: FL(1,0),  F(1,1),  FR(1,2) [Slot Edge]
  // Row 2: DFL(2,0), DF(2,1), DFR(2,2) [Slot Corner]
  const fColors = [
    ['#1e293b', '#1e293b', '#1e293b'],
    ['#1e293b', '#1e293b', '#1e293b'],
    ['#1e293b', '#1e293b', '#1e293b'],
  ];

  // 3. Right Face (R) Facelet Colors [row 0..2, col 0..2]
  // Row 0: UFR(0,0), UR(0,1), UBR(0,2)
  // Row 1: FR(1,0) [Slot Edge], R(1,1), BR(1,2)
  // Row 2: DFR(2,0) [Slot Corner], DR(2,1), DBR(2,2)
  const rColors = [
    ['#1e293b', '#1e293b', '#1e293b'],
    ['#1e293b', '#1e293b', '#1e293b'],
    ['#1e293b', '#1e293b', '#1e293b'],
  ];

  // Side indicator bars (for stickers on Back B or Left L)
  const sideBars = [];

  // Map Corner Stickers
  if (corner) {
    if (corner.pos === 'UFR') {
      if (corner.U) uColors[2][2] = getColor(corner.U);
      if (corner.F) fColors[0][2] = getColor(corner.F);
      if (corner.R) rColors[0][0] = getColor(corner.R);
    } else if (corner.pos === 'UFL') {
      if (corner.U) uColors[2][0] = getColor(corner.U);
      if (corner.F) fColors[0][0] = getColor(corner.F);
      if (corner.L || corner.side) {
        sideBars.push({ side: 'L-front', color: getColor(corner.L || corner.side) });
      }
    } else if (corner.pos === 'UBR') {
      if (corner.U) uColors[0][2] = getColor(corner.U);
      if (corner.R) rColors[0][2] = getColor(corner.R);
      if (corner.B || corner.side) {
        sideBars.push({ side: 'B-right', color: getColor(corner.B || corner.side) });
      }
    } else if (corner.pos === 'UBL') {
      if (corner.U) uColors[0][0] = getColor(corner.U);
      if (corner.B || corner.side) {
        sideBars.push({ side: 'B-left', color: getColor(corner.B || corner.side) });
      }
      if (corner.L) {
        sideBars.push({ side: 'L-back', color: getColor(corner.L) });
      }
    } else if (corner.pos === 'DFR') {
      // In the FR slot
      if (corner.F) fColors[2][2] = getColor(corner.F);
      if (corner.R) rColors[2][0] = getColor(corner.R);
    }
  }

  // Map Edge Stickers
  if (edge) {
    if (edge.pos === 'UF') {
      if (edge.U) uColors[2][1] = getColor(edge.U);
      if (edge.F) fColors[0][1] = getColor(edge.F);
    } else if (edge.pos === 'UR') {
      if (edge.U) uColors[1][2] = getColor(edge.U);
      if (edge.R) rColors[0][1] = getColor(edge.R);
    } else if (edge.pos === 'UL') {
      if (edge.U) uColors[1][0] = getColor(edge.U);
      if (edge.L || edge.side) {
        sideBars.push({ side: 'L-mid', color: getColor(edge.L || edge.side) });
      }
    } else if (edge.pos === 'UB') {
      if (edge.U) uColors[0][1] = getColor(edge.U);
      if (edge.B || edge.side) {
        sideBars.push({ side: 'B-mid', color: getColor(edge.B || edge.side) });
      }
    } else if (edge.pos === 'FR') {
      // In the FR slot
      if (edge.F) fColors[1][2] = getColor(edge.F);
      if (edge.R) rColors[1][0] = getColor(edge.R);
    }
  }

  // Vertex math for Top Face (U):
  const ptU = (r, c) => ({
    x: +(50 - r * 9.6 + c * 9.6).toFixed(1),
    y: +(13 + r * 5.5 + c * 5.5).toFixed(1),
  });

  // Vertex math for Front Face (F):
  const ptF = (r, c) => ({
    x: +(21.2 + c * 9.6).toFixed(1),
    y: +(29.5 + c * 5.5 + r * 12.5).toFixed(1),
  });

  // Vertex math for Right Face (R):
  const ptR = (r, c) => ({
    x: +(50 + c * 9.6).toFixed(1),
    y: +(46 - c * 5.5 + r * 12.5).toFixed(1),
  });

  const quad = (p0, p1, p2, p3) => `${p0.x},${p0.y} ${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`;

  const isCornerInSlot = corner?.pos === 'DFR';
  const isEdgeInSlot = edge?.pos === 'FR';

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`algo-diagram select-none ${className}`}
    >
      <defs>
        <filter id="f2l-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#10b981" floodOpacity="0.6" />
        </filter>
      </defs>

      {/* Side Orientation Indicator Bars (Back & Left) */}
      {sideBars.map((bar, idx) => {
        let x1, y1, x2, y2;
        if (bar.side === 'B-mid') {
          x1 = 46.5; y1 = 15; x2 = 56; y2 = 20.5;
        } else if (bar.side === 'B-left') {
          x1 = 37; y1 = 9.5; x2 = 46.5; y2 = 15;
        } else if (bar.side === 'B-right') {
          x1 = 56; y1 = 20.5; x2 = 65.5; y2 = 26;
        } else if (bar.side === 'L-mid') {
          x1 = 37; y1 = 32.5; x2 = 27.5; y2 = 27;
        } else if (bar.side === 'L-front') {
          x1 = 27.5; y1 = 27; x2 = 18; y2 = 21.5;
        } else if (bar.side === 'L-back') {
          x1 = 46.5; y1 = 38; x2 = 37; y2 = 32.5;
        } else {
          return null;
        }

        return (
          <line
            key={`bar-${idx}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={bar.color}
            strokeWidth="3.2"
            strokeLinecap="round"
          />
        );
      })}

      {/* 1. TOP FACE (U) */}
      <g className="f2l-face-u">
        {[0, 1, 2].map((r) =>
          [0, 1, 2].map((c) => {
            const p0 = ptU(r, c);
            const p1 = ptU(r, c + 1);
            const p2 = ptU(r + 1, c + 1);
            const p3 = ptU(r + 1, c);
            const fill = uColors[r][c];

            return (
              <polygon
                key={`u-${r}-${c}`}
                points={quad(p0, p1, p2, p3)}
                fill={fill}
                stroke="#090d16"
                strokeWidth="1.1"
              />
            );
          })
        )}
      </g>

      {/* 2. FRONT FACE (F) */}
      <g className="f2l-face-f">
        {[0, 1, 2].map((r) =>
          [0, 1, 2].map((c) => {
            const p0 = ptF(r, c);
            const p1 = ptF(r, c + 1);
            const p2 = ptF(r + 1, c + 1);
            const p3 = ptF(r + 1, c);
            const isSlotCell = (r === 1 && c === 2) || (r === 2 && c === 2);
            let fill = fColors[r][c];

            if (isSlotCell && fill === '#1e293b') {
              fill = 'rgba(16, 185, 129, 0.16)';
            }

            return (
              <polygon
                key={`f-${r}-${c}`}
                points={quad(p0, p1, p2, p3)}
                fill={fill}
                stroke="#090d16"
                strokeWidth="1.1"
              />
            );
          })
        )}
      </g>

      {/* 3. RIGHT FACE (R) */}
      <g className="f2l-face-r">
        {[0, 1, 2].map((r) =>
          [0, 1, 2].map((c) => {
            const p0 = ptR(r, c);
            const p1 = ptR(r, c + 1);
            const p2 = ptR(r + 1, c + 1);
            const p3 = ptR(r + 1, c);
            const isSlotCell = (r === 1 && c === 0) || (r === 2 && c === 0);
            let fill = rColors[r][c];

            if (isSlotCell && fill === '#1e293b') {
              fill = 'rgba(16, 185, 129, 0.14)';
            }

            return (
              <polygon
                key={`r-${r}-${c}`}
                points={quad(p0, p1, p2, p3)}
                fill={fill}
                stroke="#090d16"
                strokeWidth="1.1"
              />
            );
          })
        )}
      </g>

      {/* Front-Right (FR) Slot Highlight Bracket */}
      <polygon
        points={`${ptF(1, 2).x},${ptF(1, 2).y} ${ptF(1, 3).x},${ptF(1, 3).y} ${ptF(3, 3).x},${ptF(3, 3).y} ${ptF(3, 2).x},${ptF(3, 2).y}`}
        fill="none"
        stroke="#10b981"
        strokeWidth="1.8"
        strokeLinejoin="round"
        filter="url(#f2l-glow)"
      />
      <polygon
        points={`${ptR(1, 0).x},${ptR(1, 0).y} ${ptR(1, 1).x},${ptR(1, 1).y} ${ptR(3, 1).x},${ptR(3, 1).y} ${ptR(3, 0).x},${ptR(3, 0).y}`}
        fill="none"
        stroke="#10b981"
        strokeWidth="1.8"
        strokeLinejoin="round"
        filter="url(#f2l-glow)"
      />

      {/* Bottom FR Slot Indicator Badge */}
      <g transform="translate(0, 1)">
        <rect x="34" y="88.5" width="32" height="9" rx="2.5" fill="#0d1117" stroke="#10b981" strokeWidth="0.8" />
        <text
          x="50"
          y="95"
          textAnchor="middle"
          fontSize="5.8"
          fontWeight="700"
          fill="#10b981"
          fontFamily="ui-monospace, monospace"
          letterSpacing="0.5px"
        >
          FR SLOT
        </text>
      </g>
    </svg>
  );
}
