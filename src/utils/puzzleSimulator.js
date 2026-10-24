/**
 * Universal Speedcubing Puzzle Simulator
 * Supports all WCA events:
 * - 2x2, 3x3, 4x4, 5x5, 3x3 OH (NxNxN cubes)
 * - Pyraminx (Tetrahedron)
 * - Skewb (Cube with corner turns)
 * - Megaminx (Dodecahedron)
 */

import poly3d from './poly3d.js';

export const CUBE_COLORS = {
  U: '#f8fafc', // White
  D: '#facc15', // Yellow
  F: '#22c55e', // Green
  B: '#3b82f6', // Blue
  L: '#f97316', // Orange
  R: '#ef4444', // Red
};

// csTimer / WCA face array: [D, L, B, U, R, F]
export const FACE_ORDER = ['D', 'L', 'B', 'U', 'R', 'F'];

export const PYRA_COLORS = [
  '#22c55e', // Front (Green)
  '#ef4444', // Left (Red)
  '#3b82f6', // Right (Blue)
  '#facc15', // Down (Yellow)
];

export const SKEWB_COLORS = [
  '#f8fafc', // U: White
  '#ef4444', // R: Red
  '#22c55e', // F: Green
  '#facc15', // D: Yellow
  '#f97316', // L: Orange
  '#3b82f6', // B: Blue
];

export const MEGA_COLORS = [
  '#ffffff', // White (Top)
  '#ef4444', // Red
  '#15803d', // Dark Green
  '#9333ea', // Purple
  '#facc15', // Yellow
  '#1d4ed8', // Dark Blue
  '#94a3b8', // Light Gray
  '#f97316', // Orange
  '#84cc16', // Lime Green
  '#ec4899', // Pink
  '#fef08a', // Cream
  '#06b6d4', // Cyan
];

/**
 * Normalizes event string or detects event from scramble syntax.
 */
export function normalizeEvent(event, scramble = '') {
  if (event) {
    const ev = String(event).toLowerCase().trim();
    if (ev === '2x2' || ev === '222') return '2x2';
    if (ev === '3x3' || ev === '333' || ev === '3x3_oh' || ev === '3oh') return '3x3';
    if (ev === '4x4' || ev === '444') return '4x4';
    if (ev === '5x5' || ev === '555') return '5x5';
    if (ev === 'pyra' || ev === 'pyram' || ev === 'pyraminx') return 'pyra';
    if (ev === 'skewb' || ev === 'skb') return 'skewb';
    if (ev === 'mega' || ev === 'megaminx' || ev === 'mgm') return 'mega';
  }

  if (!scramble || typeof scramble !== 'string') return '3x3';
  const clean = scramble.trim();
  if (clean.includes('++') || clean.includes('--')) return 'mega';
  if (/\b[urlb](')?\b/.test(clean)) return 'pyra';
  if (/\b(Lw|Dw|Bw)\b/.test(clean)) return '5x5';
  if (/\b(Rw|Uw|Fw)\b/.test(clean)) return '4x4';

  const tokens = clean.split(/\s+/);
  const is2x2 = tokens.every((t) => /^[RUF](')?2?$/.test(t));
  if (is2x2 && tokens.length <= 13) return '2x2';

  const isSkewb = tokens.every((t) => /^[RULB](')?$/.test(t));
  if (isSkewb && tokens.length <= 13) return 'skewb';

  return '3x3';
}

// Scramble regex for NxNxN cubes
const scrambleReg = /^([\d]+(?:-\d+)?)?([FRUBLDfrubldzxySME])(?:([w])|&sup([\d]);)?([2'])?$/;

function parseCubeScramble(scramble, moveMap = 'DLBURF') {
  if (!scramble || typeof scramble !== 'string') return [];
  const moveseq = [];
  const moves = scramble.trim().split(/\s+/);

  for (let s = 0; s < moves.length; s++) {
    const m = scrambleReg.exec(moves[s]);
    if (m == null) continue;

    let f = 'FRUBLDfrubldzxySME'.indexOf(m[2]);
    if (f > 14) {
      const p = "2'".indexOf(m[5] || 'X') + 2;
      f = [0, 4, 5][f % 3];
      moveseq.push([moveMap.indexOf('FRUBLD'.charAt(f)), 2, p]);
      moveseq.push([moveMap.indexOf('FRUBLD'.charAt(f)), 1, 4 - p]);
      continue;
    }

    const wStr = (m[1] || '').split('-');
    const w2 = ~~wStr[1] || -1;
    const w = f < 12 ? (~~wStr[0] || ~~m[4] || ((m[3] === 'w' || f > 5) && 2) || 1) : -1;
    const p = (f < 12 ? 1 : -1) * ("2'".indexOf(m[5] || 'X') + 2);
    moveseq.push([moveMap.indexOf('FRUBLD'.charAt(f % 6)), w, p, w2]);
  }

  return moveseq;
}

function doslice(posit, f, d, q, size) {
  let f1, f2, f3, f4;
  const s2 = size * size;
  let c, i, j, k;
  if (f > 5) f -= 6;

  for (k = 0; k < q; k++) {
    for (i = 0; i < size; i++) {
      if (f === 0) {
        f1 = 6 * s2 - size * d - size + i;
        f2 = 2 * s2 - size * d - 1 - i;
        f3 = 3 * s2 - size * d - 1 - i;
        f4 = 5 * s2 - size * d - size + i;
      } else if (f === 1) {
        f1 = 3 * s2 + d + size * i;
        f2 = 3 * s2 + d - size * (i + 1);
        f3 = s2 + d - size * (i + 1);
        f4 = 5 * s2 + d + size * i;
      } else if (f === 2) {
        f1 = 3 * s2 + d * size + i;
        f2 = 4 * s2 + size - 1 - d + size * i;
        f3 = d * size + size - 1 - i;
        f4 = 2 * s2 - 1 - d - size * i;
      } else if (f === 3) {
        f1 = 4 * s2 + d * size + size - 1 - i;
        f2 = 2 * s2 + d * size + i;
        f3 = s2 + d * size + i;
        f4 = 5 * s2 + d * size + size - 1 - i;
      } else if (f === 4) {
        f1 = 6 * s2 - 1 - d - size * i;
        f2 = size - 1 - d + size * i;
        f3 = 2 * s2 + size - 1 - d + size * i;
        f4 = 4 * s2 - 1 - d - size * i;
      } else if (f === 5) {
        f1 = 4 * s2 - size - d * size + i;
        f2 = 2 * s2 - size + d - size * i;
        f3 = s2 - 1 - d * size - i;
        f4 = 4 * s2 + d + size * i;
      }
      c = posit[f1];
      posit[f1] = posit[f2];
      posit[f2] = posit[f3];
      posit[f3] = posit[f4];
      posit[f4] = c;
    }

    if (d === 0) {
      for (i = 0; i + i < size; i++) {
        for (j = 0; j + j < size - 1; j++) {
          f1 = f * s2 + i + j * size;
          f3 = f * s2 + (size - 1 - i) + (size - 1 - j) * size;
          if (f < 3) {
            f2 = f * s2 + (size - 1 - j) + i * size;
            f4 = f * s2 + j + (size - 1 - i) * size;
          } else {
            f4 = f * s2 + (size - 1 - j) + i * size;
            f2 = f * s2 + j + (size - 1 - i) * size;
          }
          c = posit[f1];
          posit[f1] = posit[f2];
          posit[f2] = posit[f3];
          posit[f3] = posit[f4];
          posit[f4] = c;
        }
      }
    }
  }
}

/**
 * Simulates any NxNxN cube (2x2, 3x3, 4x4, 5x5) and returns a 6-face object
 * with arrays of facelet colors in row-major order.
 */
export function getScrambledCubeGrid(scramble, size = 3) {
  const s2 = size * size;
  const posit = [];
  let cnt = 0;

  for (let i = 0; i < 6; i++) {
    for (let f = 0; f < s2; f++) {
      posit[cnt++] = i;
    }
  }

  const moves = parseCubeScramble(scramble, 'DLBURF');
  for (let s = 0; s < moves.length; s++) {
    for (let d = 0; d < moves[s][1]; d++) {
      doslice(posit, moves[s][0], d, moves[s][2], size);
    }
    if (moves[s][1] === -1) {
      for (let d = 0; d < size - 1; d++) {
        doslice(posit, moves[s][0], d, -moves[s][2], size);
      }
      doslice(posit, (moves[s][0] + 3) % 6, 0, moves[s][2] + 4, size);
    }
  }

  // Convert posit array into facelet grids
  // FACE_ORDER: ['D', 'L', 'B', 'U', 'R', 'F']
  const result = {
    size,
    faces: {},
  };

  for (let f = 0; f < 6; f++) {
    const fKey = FACE_ORDER[f];
    const grid = [];
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const x = f === 1 || f === 2 ? size - 1 - col : col;
        const y = f === 0 ? size - 1 - row : row;
        const colorIdx = posit[(f * size + y) * size + x];
        grid.push(FACE_ORDER[colorIdx]);
      }
    }
    result.faces[fKey] = grid;
  }

  return result;
}

// Caching puzzle geometry for fast, instant rendering
const polyPuzzleCache = {};

function getCachedPoly(type) {
  if (!polyPuzzleCache[type]) {
    const params = poly3d.getFamousPuzzle(type);
    const puzzle = poly3d.makePuzzle.apply(poly3d, params.polyParam);
    const net = poly3d.renderNet(puzzle, params.pieceGap, 0);
    polyPuzzleCache[type] = { params, puzzle, net };
  }
  return polyPuzzleCache[type];
}

/**
 * Simulates a polyhedral puzzle (Pyraminx, Skewb, Megaminx) using poly3d.
 */
export function getScrambledPolyNet(type, scramble = '') {
  const { params, puzzle, net } = getCachedPoly(type);
  const moves = params.parser.parseScramble(scramble || '');
  const sizes = net[0];
  const polys = net[1];

  let posit = [];
  for (let i = 0; i < polys.length; i++) {
    posit[i] = polys[i] ? polys[i][2] : 0;
  }

  for (let m = 0; m < moves.length; m++) {
    const move = moves[m];
    const moveIdx = puzzle.getTwistyIdx(move[0]);
    if (moveIdx === -1) continue;
    const perm = puzzle.moveTable[moveIdx];
    const maxPow = puzzle.twistyDetails[moveIdx][1];
    const pow = ((move[1] % maxPow) + maxPow) % maxPow;
    const posit2 = [];
    for (let i = 0; i < posit.length; i++) {
      let val = i;
      for (let j = 0; j < pow; j++) {
        val = perm[val] < 0 ? val : perm[val];
      }
      posit2[i] = posit[val];
    }
    posit = posit2;
  }

  let colorMap = PYRA_COLORS;
  if (type === 'skb') colorMap = SKEWB_COLORS;
  if (type === 'mgm') colorMap = MEGA_COLORS;

  const renderedPolys = [];
  for (let i = 0; i < polys.length; i++) {
    const p = polys[i];
    if (!p) continue;
    const xs = p[0];
    const ys = p[1];
    const points = xs.map((x, idx) => `${x.toFixed(3)},${ys[idx].toFixed(3)}`).join(' ');
    const color = colorMap[posit[i]] || '#64748b';
    renderedPolys.push({
      id: i,
      points,
      fill: color,
      faceIdx: p[2],
    });
  }

  return {
    width: sizes[0],
    height: sizes[1],
    polygons: renderedPolys,
  };
}

/**
 * Master puzzle resolver: accepts an event and scramble, returns standardized rendering payload.
 */
export function getScrambleVisualData(event, scramble) {
  const normalized = normalizeEvent(event, scramble);

  if (normalized === '2x2') {
    return {
      type: 'cube',
      event: '2x2',
      name: '2x2x2',
      data: getScrambledCubeGrid(scramble, 2),
    };
  }

  if (normalized === '4x4') {
    return {
      type: 'cube',
      event: '4x4',
      name: '4x4x4',
      data: getScrambledCubeGrid(scramble, 4),
    };
  }

  if (normalized === '5x5') {
    return {
      type: 'cube',
      event: '5x5',
      name: '5x5x5',
      data: getScrambledCubeGrid(scramble, 5),
    };
  }

  if (normalized === 'pyra') {
    return {
      type: 'poly',
      event: 'pyra',
      name: 'Pyraminx',
      data: getScrambledPolyNet('pyr', scramble),
    };
  }

  if (normalized === 'skewb') {
    return {
      type: 'poly',
      event: 'skewb',
      name: 'Skewb',
      data: getScrambledPolyNet('skb', scramble),
    };
  }

  if (normalized === 'mega') {
    return {
      type: 'poly',
      event: 'mega',
      name: 'Megaminx',
      data: getScrambledPolyNet('mgm', scramble),
    };
  }

  // Default: 3x3 / 3x3 OH
  return {
    type: 'cube',
    event: '3x3',
    name: '3x3x3',
    data: getScrambledCubeGrid(scramble, 3),
  };
}

export default {
  CUBE_COLORS,
  PYRA_COLORS,
  SKEWB_COLORS,
  MEGA_COLORS,
  FACE_ORDER,
  normalizeEvent,
  getScrambledCubeGrid,
  getScrambledPolyNet,
  getScrambleVisualData,
};
