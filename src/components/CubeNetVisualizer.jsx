import React, { useMemo, useState } from 'react';
import {
  CUBE_COLORS,
  getScrambleVisualData,
  normalizeEvent,
} from '../utils/puzzleSimulator';
import { Rotate3d, Compass } from 'lucide-react';

/**
 * Universal Scramble Verification Visualizer
 * Dynamically renders the correct puzzle:
 * - 2x2, 3x3, 4x4, 5x5 Cubes (with 2D Net and 3D Isometric view toggle)
 * - Pyraminx (Tetrahedron unfolded net)
 * - Skewb (6-face diamond/corner net)
 * - Megaminx (12-face dodecahedral net)
 */
export default function CubeNetVisualizer({
  scramble,
  event = '3x3',
  cube: passedCube,
  size = 180,
  className = '',
  allow3DToggle = true,
}) {
  const [viewMode, setViewMode] = useState('2d'); // '2d' or '3d'
  const [flip3D, setFlip3D] = useState(false); // Front (U/F/R) vs Back (D/B/L)

  const visualData = useMemo(() => {
    if (passedCube) {
      return {
        type: 'cube',
        event: '3x3',
        name: '3x3x3',
        data: { size: 3, faces: passedCube },
      };
    }
    return getScrambleVisualData(event, scramble);
  }, [scramble, event, passedCube]);

  const isCube = visualData.type === 'cube';

  // ----------------------------------------------------
  // 1. RENDER 2D UNFOLDED CUBE NET (2x2, 3x3, 4x4, 5x5)
  // ----------------------------------------------------
  const renderCubeNet = (cubeData) => {
    const N = cubeData.size;
    const faces = cubeData.faces;

    // Dimensions: 4 faces wide (L, F, R, B), 3 faces high (U, F, D)
    const stickerSize = 48 / N;
    const stickerGap = Math.max(1, 3.5 / N);
    const faceGap = 5;
    const faceSize = N * stickerSize + (N - 1) * stickerGap;

    const totalWidth = 4 * faceSize + 3 * faceGap;
    const totalHeight = 3 * faceSize + 2 * faceGap;

    const renderFace = (faceKey, startX, startY) => {
      const stickers = faces[faceKey] || Array(N * N).fill(faceKey);
      const elements = [];

      for (let row = 0; row < N; row++) {
        for (let col = 0; col < N; col++) {
          const idx = row * N + col;
          const colorKey = stickers[idx];
          const fill = CUBE_COLORS[colorKey] || '#64748b';
          const x = startX + col * (stickerSize + stickerGap);
          const y = startY + row * (stickerSize + stickerGap);

          elements.push(
            <rect
              key={`${faceKey}-${idx}`}
              x={x}
              y={y}
              width={stickerSize}
              height={stickerSize}
              rx={Math.max(1.2, 3 / N)}
              fill={fill}
              stroke="#0f172a"
              strokeWidth={Math.max(0.6, 2 / N)}
            />
          );
        }
      }

      return <g key={faceKey}>{elements}</g>;
    };

    const xU = faceSize + faceGap;
    const yU = 0;

    const xL = 0;
    const yL = faceSize + faceGap;

    const xF = faceSize + faceGap;
    const yF = faceSize + faceGap;

    const xR = 2 * (faceSize + faceGap);
    const yR = faceSize + faceGap;

    const xB = 3 * (faceSize + faceGap);
    const yB = faceSize + faceGap;

    const xD = faceSize + faceGap;
    const yD = 2 * (faceSize + faceGap);

    return (
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
    );
  };

  // ----------------------------------------------------
  // 2. RENDER 3D ISOMETRIC DIGITAL CUBE (2x2, 3x3, 4x4, 5x5)
  // ----------------------------------------------------
  const renderCube3D = (cubeData) => {
    const N = cubeData.size;
    const faces = cubeData.faces;

    // Viewbox is centered around (0, 0)
    // Isometric basis vectors:
    // Right axis: (cos 30°, sin 30°)
    // Left axis: (-cos 30°, sin 30°)
    // Up axis: (0, -1)
    const cos30 = Math.cos(Math.PI / 6);
    const sin30 = Math.sin(Math.PI / 6);

    const s = 34 / N; // sticker unit length
    const g = 1.2 / N; // gap
    const effectiveS = s - g;

    // When flip3D is false: shows Top (U), Front (F), Right (R)
    // When flip3D is true: shows Bottom (D), Back (B), Left (L)
    const topFace = flip3D ? 'D' : 'U';
    const leftFace = flip3D ? 'B' : 'F';
    const rightFace = flip3D ? 'L' : 'R';

    const topStickers = faces[topFace] || Array(N * N).fill(topFace);
    const leftStickers = faces[leftFace] || Array(N * N).fill(leftFace);
    const rightStickers = faces[rightFace] || Array(N * N).fill(rightFace);

    const polygons = [];

    // Helper to project 3D point (u, v) on Top face
    // u goes along Right (0..N), v goes along Left (0..N)
    const projectTop = (u, v) => {
      const x = (u - v) * cos30 * s;
      const y = -N * s + (u + v) * sin30 * s;
      return [x, y];
    };

    // Helper to project point on Left (Front) face
    // u goes along Left (0..N), h goes Down (0..N)
    const projectLeft = (u, h) => {
      const x = -u * cos30 * s;
      const y = u * sin30 * s + h * s;
      return [x, y];
    };

    // Helper to project point on Right face
    // u goes along Right (0..N), h goes Down (0..N)
    const projectRight = (u, h) => {
      const x = u * cos30 * s;
      const y = u * sin30 * s + h * s;
      return [x, y];
    };

    // 1. TOP FACE (U or D)
    for (let row = 0; row < N; row++) {
      for (let col = 0; col < N; col++) {
        const idx = row * N + col;
        const colorKey = topStickers[idx];
        const fill = CUBE_COLORS[colorKey] || '#64748b';

        // Coordinates on top face
        const u0 = col + g / (2 * s);
        const u1 = col + 1 - g / (2 * s);
        const v0 = row + g / (2 * s);
        const v1 = row + 1 - g / (2 * s);

        const p1 = projectTop(u0, v0);
        const p2 = projectTop(u1, v0);
        const p3 = projectTop(u1, v1);
        const p4 = projectTop(u0, v1);

        polygons.push(
          <polygon
            key={`top-${idx}`}
            points={`${p1[0]},${p1[1]} ${p2[0]},${p2[1]} ${p3[0]},${p3[1]} ${p4[0]},${p4[1]}`}
            fill={fill}
            stroke="#0f172a"
            strokeWidth="0.8"
          />
        );
      }
    }

    // 2. LEFT (FRONT) FACE
    for (let row = 0; row < N; row++) {
      for (let col = 0; col < N; col++) {
        const idx = row * N + col;
        const colorKey = leftStickers[idx];
        const fill = CUBE_COLORS[colorKey] || '#64748b';

        // col 0 is near the center corner, col N-1 is far left
        const u0 = (N - col - 1) + g / (2 * s);
        const u1 = (N - col) - g / (2 * s);
        const h0 = row + g / (2 * s);
        const h1 = row + 1 - g / (2 * s);

        const p1 = projectLeft(u0, h0);
        const p2 = projectLeft(u1, h0);
        const p3 = projectLeft(u1, h1);
        const p4 = projectLeft(u0, h1);

        polygons.push(
          <polygon
            key={`left-${idx}`}
            points={`${p1[0]},${p1[1]} ${p2[0]},${p2[1]} ${p3[0]},${p3[1]} ${p4[0]},${p4[1]}`}
            fill={fill}
            stroke="#0f172a"
            strokeWidth="0.8"
          />
        );
      }
    }

    // 3. RIGHT FACE
    for (let row = 0; row < N; row++) {
      for (let col = 0; col < N; col++) {
        const idx = row * N + col;
        const colorKey = rightStickers[idx];
        const fill = CUBE_COLORS[colorKey] || '#64748b';

        const u0 = col + g / (2 * s);
        const u1 = col + 1 - g / (2 * s);
        const h0 = row + g / (2 * s);
        const h1 = row + 1 - g / (2 * s);

        const p1 = projectRight(u0, h0);
        const p2 = projectRight(u1, h0);
        const p3 = projectRight(u1, h1);
        const p4 = projectRight(u0, h1);

        polygons.push(
          <polygon
            key={`right-${idx}`}
            points={`${p1[0]},${p1[1]} ${p2[0]},${p2[1]} ${p3[0]},${p3[1]} ${p4[0]},${p4[1]}`}
            fill={fill}
            stroke="#0f172a"
            strokeWidth="0.8"
          />
        );
      }
    }

    const bound = N * s * 1.8;

    return (
      <div className="relative flex flex-col items-center">
        <svg
          viewBox={`-${bound} -${bound} ${bound * 2} ${bound * 2.1}`}
          width={size}
          height={size}
          className="drop-shadow-md select-none"
        >
          {polygons}
        </svg>

        <button
          type="button"
          onClick={() => setFlip3D((f) => !f)}
          className="mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white transition-all flex items-center gap-1 shadow-sm"
          title="Flip viewing angle 180°"
        >
          <Rotate3d className="w-3 h-3 text-[var(--accent-cyan)]" />
          {flip3D ? 'Viewing Back (D/B/L)' : 'Viewing Front (U/F/R)'}
        </button>
      </div>
    );
  };

  // ----------------------------------------------------
  // 3. RENDER POLYHEDRAL PUZZLES (Pyraminx, Skewb, Megaminx)
  // ----------------------------------------------------
  const renderPolyNet = (polyData) => {
    const { width, height, polygons } = polyData;

    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={size}
        height={(size * height) / width}
        className="drop-shadow-sm select-none"
      >
        {polygons.map((p) => (
          <polygon
            key={p.id}
            points={p.points}
            fill={p.fill}
            stroke="#0f172a"
            strokeWidth={width > 10 ? '0.08' : '0.04'}
            strokeLinejoin="round"
          />
        ))}
      </svg>
    );
  };

  return (
    <div className={`cube-net-container inline-flex flex-col items-center ${className}`}>
      {/* Header bar with puzzle type and 2D/3D toggle */}
      <div className="w-full flex items-center justify-between gap-2 mb-2 px-1">
        <span className="text-[11px] font-bold text-[var(--accent-cyan)] uppercase tracking-wider flex items-center gap-1">
          <Compass className="w-3.5 h-3.5" />
          {visualData.name} Scramble Net
        </span>

        {isCube && allow3DToggle && (
          <div className="inline-flex rounded-lg bg-[var(--bg-input)] p-0.5 border border-[var(--border-subtle)]">
            <button
              type="button"
              className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition-all ${
                viewMode === '2d'
                  ? 'bg-[var(--accent-cyan)] text-slate-900 shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-white'
              }`}
              onClick={() => setViewMode('2d')}
              title="2D Unfolded Net View"
            >
              2D Net
            </button>
            <button
              type="button"
              className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition-all ${
                viewMode === '3d'
                  ? 'bg-[var(--accent-cyan)] text-slate-900 shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-white'
              }`}
              onClick={() => setViewMode('3d')}
              title="3D Digital Isometric View"
            >
              3D Cube
            </button>
          </div>
        )}
      </div>

      {/* Main Diagram Area */}
      <div className="flex items-center justify-center p-2 rounded-xl bg-[var(--bg-primary)]/80 border border-[var(--border-subtle)] shadow-inner">
        {isCube ? (
          viewMode === '3d' ? (
            renderCube3D(visualData.data)
          ) : (
            renderCubeNet(visualData.data)
          )
        ) : (
          renderPolyNet(visualData.data)
        )}
      </div>
    </div>
  );
}
