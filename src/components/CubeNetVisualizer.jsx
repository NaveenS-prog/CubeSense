import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  CUBE_COLORS,
  getScrambleVisualData,
  normalizeEvent,
} from '../utils/puzzleSimulator';
import { Rotate3d, Compass, RotateCcw } from 'lucide-react';

/**
 * Normal vectors for each cube face
 */
const FACE_NORMALS = {
  U: [0, 1, 0],
  D: [0, -1, 0],
  F: [0, 0, 1],
  B: [0, 0, -1],
  R: [1, 0, 0],
  L: [-1, 0, 0],
};

/**
 * 3D coordinates for a sticker on a given face
 */
function getSticker3D(face, row, col, N) {
  const step = 2 / N;
  const gap = 0.09 / N;

  const u0 = -1 + col * step + gap;
  const u1 = -1 + (col + 1) * step - gap;
  const v0 = 1 - row * step - gap;
  const v1 = 1 - (row + 1) * step + gap;

  switch (face) {
    case 'U':
      return [
        [u0, 1, -v0],
        [u1, 1, -v0],
        [u1, 1, -v1],
        [u0, 1, -v1],
      ];
    case 'D':
      return [
        [u0, -1, v0],
        [u1, -1, v0],
        [u1, -1, v1],
        [u0, -1, v1],
      ];
    case 'F':
      return [
        [u0, v0, 1],
        [u1, v0, 1],
        [u1, v1, 1],
        [u0, v1, 1],
      ];
    case 'B':
      return [
        [-u0, v0, -1],
        [-u1, v0, -1],
        [-u1, v1, -1],
        [-u0, v1, -1],
      ];
    case 'R':
      return [
        [1, v0, -u0],
        [1, v0, -u1],
        [1, v1, -u1],
        [1, v1, -u0],
      ];
    case 'L':
      return [
        [-1, v0, u0],
        [-1, v0, u1],
        [-1, v1, u1],
        [-1, v1, u0],
      ];
    default:
      return [];
  }
}

/**
 * Rotate 3D point by yaw (around Y) and pitch (around X)
 */
function rotatePoint(p, ry, rx) {
  // Rotate around Y
  const cosY = Math.cos(ry);
  const sinY = Math.sin(ry);
  const x1 = p[0] * cosY + p[2] * sinY;
  const y1 = p[1];
  const z1 = -p[0] * sinY + p[2] * cosY;

  // Rotate around X
  const cosX = Math.cos(rx);
  const sinX = Math.sin(rx);
  const x2 = x1;
  const y2 = y1 * cosX - z1 * sinX;
  const z2 = y1 * sinX + z1 * cosX;

  return [x2, y2, z2];
}

const DEFAULT_ROT_Y = -Math.PI / 4; // -45 deg
const DEFAULT_ROT_X = Math.asin(Math.tan(Math.PI / 6)); // ~35.26 deg (isometric)

export default function CubeNetVisualizer({
  scramble,
  event = '3x3',
  cube: passedCube,
  size = 200,
  className = '',
  allow3DToggle = true,
}) {
  const [viewMode, setViewMode] = useState('2d'); // '2d' or '3d'

  // 3D rotation state (in radians)
  const [rotY, setRotY] = useState(DEFAULT_ROT_Y);
  const [rotX, setRotX] = useState(DEFAULT_ROT_X);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, rotY: 0, rotX: 0 });

  const visualData = useMemo(() => {
    try {
      if (passedCube) {
        return {
          type: 'cube',
          event: '3x3',
          name: '3x3x3',
          data: { size: 3, faces: passedCube },
        };
      }
      return getScrambleVisualData(event, scramble || '');
    } catch (err) {
      console.warn('Scramble visualizer calculation failed:', err);
      return {
        type: 'cube',
        event: '3x3',
        name: '3x3x3',
        data: {
          size: 3,
          faces: {
            U: Array(9).fill('U'),
            D: Array(9).fill('D'),
            F: Array(9).fill('F'),
            B: Array(9).fill('B'),
            L: Array(9).fill('L'),
            R: Array(9).fill('R'),
          },
        },
      };
    }
  }, [scramble, event, passedCube]);

  const isCube = visualData?.type === 'cube';

  // Pointer drag handlers for 3D orbit
  const handlePointerDown = (e) => {
    if (viewMode !== '3d') return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      rotY,
      rotX,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const sensitivity = 0.008;

    let newY = dragStartRef.current.rotY + dx * sensitivity;
    let newX = dragStartRef.current.rotX + dy * sensitivity;

    // Clamp pitch to avoid inversion flipping
    newX = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, newX));

    setRotY(newY);
    setRotX(newX);
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  // ----------------------------------------------------
  // 1. RENDER 2D UNFOLDED CUBE NET (2x2, 3x3, 4x4, 5x5)
  // ----------------------------------------------------
  const renderCubeNet = (cubeData) => {
    if (!cubeData || !cubeData.faces) return null;
    const N = cubeData.size || 3;
    const faces = cubeData.faces || {};

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
              rx={Math.max(1, 2.5 / N)}
              fill={fill}
              stroke="#090d16"
              strokeWidth={Math.max(0.6, 1.8 / N)}
            />
          );
        }
      }

      return (
        <g key={faceKey} className="transition-opacity duration-150">
          {elements}
        </g>
      );
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

    const svgWidth = Math.max(size, 200);
    const svgHeight = (svgWidth * totalHeight) / totalWidth;

    return (
      <div className="relative flex flex-col items-center">
        <svg
          viewBox={`0 0 ${totalWidth} ${totalHeight}`}
          width={svgWidth}
          height={svgHeight}
          className="drop-shadow-sm select-none"
        >
          {renderFace('U', xU, yU)}
          {renderFace('L', xL, yL)}
          {renderFace('F', xF, yF)}
          {renderFace('R', xR, yR)}
          {renderFace('B', xB, yB)}
          {renderFace('D', xD, yD)}
        </svg>

        {/* Subtle face markers */}
        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-[var(--text-muted)] font-mono select-none">
          <span>Top: <b>White (U)</b></span>
          <span>•</span>
          <span>Front: <b>Green (F)</b></span>
        </div>
      </div>
    );
  };

  // ----------------------------------------------------
  // 2. RENDER 3D INTERACTIVE DIGITAL CUBE
  // ----------------------------------------------------
  const renderCube3D = (cubeData) => {
    if (!cubeData || !cubeData.faces) return null;
    const N = cubeData.size || 3;
    const faces = cubeData.faces || {};

    const scale = 58; // projection scale
    const allStickers = [];

    // Collect all quads across all 6 faces
    for (const face of ['U', 'D', 'F', 'B', 'R', 'L']) {
      const stickers = faces[face] || Array(N * N).fill(face);
      const normal = FACE_NORMALS[face];
      const rotNorm = rotatePoint(normal, rotY, rotX);

      // Backface culling: only project if facing camera (Z > 0.02)
      if (rotNorm[2] <= 0.02) continue;

      // Lighting calculation based on normal angle
      const lightFactor = Math.max(0.65, Math.min(1.05, 0.75 + rotNorm[2] * 0.25 - rotNorm[1] * 0.1));

      for (let row = 0; row < N; row++) {
        for (let col = 0; col < N; col++) {
          const idx = row * N + col;
          const colorKey = stickers[idx];
          const baseFill = CUBE_COLORS[colorKey] || '#64748b';

          const quad3D = getSticker3D(face, row, col, N);
          const quadRot = quad3D.map((pt) => rotatePoint(pt, rotY, rotX));

          // Average Z for depth sorting (Painter's algorithm)
          const avgZ = (quadRot[0][2] + quadRot[1][2] + quadRot[2][2] + quadRot[3][2]) / 4;

          // 2D projection (orthographic isometric projection)
          // SVG Y axis goes down, so negate Y
          const points2D = quadRot.map((pt) => `${(pt[0] * scale).toFixed(2)},${(-pt[1] * scale).toFixed(2)}`).join(' ');

          allStickers.push({
            id: `${face}-${idx}`,
            avgZ,
            points2D,
            fill: baseFill,
            lightFactor,
          });
        }
      }
    }

    // Sort by depth (farthest first)
    allStickers.sort((a, b) => a.avgZ - b.avgZ);

    const bound = 110;
    const svgSize = Math.max(size, 200);

    return (
      <div className="relative flex flex-col items-center">
        {/* Interactive 3D Canvas */}
        <div
          className={`cursor-${isDragging ? 'grabbing' : 'grab'} touch-none select-none`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          title="Drag to rotate cube in 3D"
        >
          <svg
            viewBox={`-${bound} -${bound} ${bound * 2} ${bound * 2}`}
            width={svgSize}
            height={svgSize}
            className="drop-shadow-md"
          >
            {allStickers.map((s) => (
              <polygon
                key={s.id}
                points={s.points2D}
                fill={s.fill}
                stroke="#090d16"
                strokeWidth="0.9"
                strokeLinejoin="round"
                style={{
                  filter: s.lightFactor !== 1 ? `brightness(${s.lightFactor})` : undefined,
                }}
              />
            ))}
          </svg>
        </div>

        {/* View Angle Presets & Reset */}
        <div className="mt-2 flex items-center gap-1.5 flex-wrap justify-center">
          <button
            type="button"
            onClick={() => {
              setRotY(-Math.PI / 4);
              setRotX(DEFAULT_ROT_X);
            }}
            className="px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white transition-all shadow-sm"
          >
            Front (UFR)
          </button>
          <button
            type="button"
            onClick={() => {
              setRotY((3 * Math.PI) / 4);
              setRotX(DEFAULT_ROT_X);
            }}
            className="px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white transition-all shadow-sm"
          >
            Back (UBL)
          </button>
          <button
            type="button"
            onClick={() => {
              setRotY(-Math.PI / 4);
              setRotX(-DEFAULT_ROT_X);
            }}
            className="px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white transition-all shadow-sm"
          >
            Bottom (DFR)
          </button>
          <button
            type="button"
            onClick={() => {
              setRotY(DEFAULT_ROT_Y);
              setRotX(DEFAULT_ROT_X);
            }}
            className="p-1 rounded bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white transition-all"
            title="Reset to default angle"
          >
            <RotateCcw className="w-2.5 h-2.5" />
          </button>
        </div>

        <span className="text-[9px] text-[var(--text-muted)] mt-1">
          Drag to freely orbit in 3D
        </span>
      </div>
    );
  };

  // ----------------------------------------------------
  // 3. RENDER POLYHEDRAL PUZZLES (Pyraminx, Skewb, Megaminx)
  // ----------------------------------------------------
  const renderPolyNet = (polyData) => {
    if (!polyData || !Array.isArray(polyData.polygons)) return null;
    const { width, height, polygons } = polyData;

    // Responsive scaling
    const isMega = visualData?.event === 'mega';
    const svgWidth = isMega ? Math.max(size, 260) : Math.max(size, 200);
    const svgHeight = (svgWidth * height) / width;

    return (
      <div className="flex flex-col items-center">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width={svgWidth}
          height={svgHeight}
          className="drop-shadow-sm select-none"
        >
          {polygons.map((p) => (
            <polygon
              key={p.id}
              points={p.points}
              fill={p.fill}
              stroke="#090d16"
              strokeWidth={width > 10 ? '0.07' : isMega ? '0.035' : '0.045'}
              strokeLinejoin="round"
            />
          ))}
        </svg>

        <span className="text-[10px] text-[var(--text-muted)] mt-2 font-mono">
          WCA Standard Unfolded Net
        </span>
      </div>
    );
  };

  return (
    <div className={`cube-net-container inline-flex flex-col items-center max-w-full ${className}`}>
      {/* Header bar with puzzle type and 2D/3D toggle */}
      <div className="w-full flex items-center justify-between gap-3 mb-2 px-1">
        <span className="text-[11px] font-bold text-[var(--accent-cyan)] uppercase tracking-wider flex items-center gap-1.5 shrink-0">
          <Compass className="w-3.5 h-3.5" />
          {visualData?.name || 'Cube'} Scramble
        </span>

        {isCube && allow3DToggle && (
          <div className="inline-flex rounded-lg bg-[var(--bg-input)] p-0.5 border border-[var(--border-subtle)] shrink-0">
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
              className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition-all flex items-center gap-1 ${
                viewMode === '3d'
                  ? 'bg-[var(--accent-cyan)] text-slate-900 shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-white'
              }`}
              onClick={() => setViewMode('3d')}
              title="Interactive 3D Orbit View"
            >
              <Rotate3d className="w-3 h-3" />
              3D Orbit
            </button>
          </div>
        )}
      </div>

      {/* Main Diagram Area */}
      <div className="flex items-center justify-center p-3 rounded-xl bg-[var(--bg-primary)]/90 border border-[var(--border-subtle)] shadow-inner w-full min-w-[220px]">
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
