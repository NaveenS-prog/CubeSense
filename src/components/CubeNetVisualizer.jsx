import React, { useMemo } from 'react';
import { FACE_COLORS, getScrambledCube } from '../utils/cubeSimulator';

/**
 * 2D Unfolded Cube Net Visualizer (Standard WCA Net Layout)
 * Layout:
 *        [ U ]
 *  [ L ] [ F ] [ R ] [ B ]
 *        [ D ]
 */
export default function CubeNetVisualizer({ scramble, cube: passedCube, size = 180, className = '' }) {
  const cube = useMemo(() => {
    if (passedCube) return passedCube;
    return getScrambledCube(scramble);
  }, [scramble, passedCube]);

  // Dimensions
  // The net is 4 face-blocks wide (L, F, R, B) and 3 face-blocks high (U, F, D)
  // Each face is 3x3 stickers.
  // Let sticker size = s, gap = g, face gap = fg
  const s = 10; // sticker size
  const g = 1.5; // sticker gap
  const faceSize = 3 * s + 2 * g;
  const fg = 4; // gap between faces

  const totalWidth = 4 * faceSize + 3 * fg;
  const totalHeight = 3 * faceSize + 2 * fg;

  const renderFace = (faceKey, startX, startY) => {
    const stickers = cube[faceKey] || Array(9).fill(faceKey);
    const elements = [];

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const idx = row * 3 + col;
        const colorKey = stickers[idx];
        const fillColor = FACE_COLORS[colorKey] || '#6b7280';
        const x = startX + col * (s + g);
        const y = startY + row * (s + g);

        elements.push(
          <rect
            key={`${faceKey}-${idx}`}
            x={x}
            y={y}
            width={s}
            height={s}
            rx={1.5}
            fill={fillColor}
            stroke="#1e293b"
            strokeWidth={0.7}
          />
        );
      }
    }

    return (
      <g key={faceKey}>
        {elements}
      </g>
    );
  };

  const xU = faceSize + fg;
  const yU = 0;

  const xL = 0;
  const yL = faceSize + fg;

  const xF = faceSize + fg;
  const yF = faceSize + fg;

  const xR = 2 * (faceSize + fg);
  const yR = faceSize + fg;

  const xB = 3 * (faceSize + fg);
  const yB = faceSize + fg;

  const xD = faceSize + fg;
  const yD = 2 * (faceSize + fg);

  return (
    <div className={`cube-net-container inline-flex flex-col items-center ${className}`}>
      <svg
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        width={size}
        height={(size * totalHeight) / totalWidth}
        className="drop-shadow-sm select-none"
      >
        {renderFace('U', xU, yU)}
        {renderFace('L', xL, yL)}
        {renderFace('F', xF, yF)}
        {renderFace('R', xR, yR)}
        {renderFace('B', xB, yB)}
        {renderFace('D', xD, yD)}
      </svg>
    </div>
  );
}
