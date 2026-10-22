/**
 * Rubik's Cube Simulator and Algorithm Inverter
 * Standard WCA color scheme:
 * U: White, D: Yellow, F: Green, B: Blue, L: Orange, R: Red
 */

export const FACE_COLORS = {
  U: '#f8fafc', // White
  D: '#facc15', // Yellow
  F: '#22c55e', // Green
  B: '#3b82f6', // Blue
  L: '#f97316', // Orange
  R: '#ef4444', // Red
};

export const FACE_NAMES = ['U', 'L', 'F', 'R', 'B', 'D'];

/**
 * Creates a solved 3x3 cube representation.
 * Each face is a 9-element array representing facelets 0..8 (row-major: top-left to bottom-right).
 */
export function createSolvedCube() {
  return {
    U: Array(9).fill('U'),
    L: Array(9).fill('L'),
    F: Array(9).fill('F'),
    R: Array(9).fill('R'),
    B: Array(9).fill('B'),
    D: Array(9).fill('D'),
  };
}

/**
 * Rotates a 3x3 face clockwise.
 * [0, 1, 2]       [6, 3, 0]
 * [3, 4, 5]  ==>  [7, 4, 1]
 * [6, 7, 8]       [8, 5, 2]
 */
function rotateFaceCW(face) {
  return [
    face[6], face[3], face[0],
    face[7], face[4], face[1],
    face[8], face[5], face[2],
  ];
}

function rotateFaceCCW(face) {
  return [
    face[2], face[5], face[8],
    face[1], face[4], face[7],
    face[0], face[3], face[6],
  ];
}

function rotateFace180(face) {
  return rotateFaceCW(rotateFaceCW(face));
}

/**
 * Deep clones the cube state.
 */
function cloneCube(cube) {
  return {
    U: [...cube.U],
    L: [...cube.L],
    F: [...cube.F],
    R: [...cube.R],
    B: [...cube.B],
    D: [...cube.D],
  };
}

/**
 * Applies a single basic face turn (U, D, R, L, F, B) clockwise.
 */
function applyBasicCW(cube, face) {
  const c = cloneCube(cube);
  c[face] = rotateFaceCW(c[face]);

  if (face === 'U') {
    const temp = [c.F[0], c.F[1], c.F[2]];
    c.F[0] = c.R[0]; c.F[1] = c.R[1]; c.F[2] = c.R[2];
    c.R[0] = c.B[0]; c.R[1] = c.B[1]; c.R[2] = c.B[2];
    c.B[0] = c.L[0]; c.B[1] = c.L[1]; c.B[2] = c.L[2];
    c.L[0] = temp[0]; c.L[1] = temp[1]; c.L[2] = temp[2];
  } else if (face === 'D') {
    const temp = [c.F[6], c.F[7], c.F[8]];
    c.F[6] = c.L[6]; c.F[7] = c.L[7]; c.F[8] = c.L[8];
    c.L[6] = c.B[6]; c.L[7] = c.B[7]; c.L[8] = c.B[8];
    c.B[6] = c.R[6]; c.B[7] = c.R[7]; c.B[8] = c.R[8];
    c.R[6] = temp[0]; c.R[7] = temp[1]; c.R[8] = temp[2];
  } else if (face === 'R') {
    const temp = [c.U[2], c.U[5], c.U[8]];
    c.U[2] = c.F[2]; c.U[5] = c.F[5]; c.U[8] = c.F[8];
    c.F[2] = c.D[2]; c.F[5] = c.D[5]; c.F[8] = c.D[8];
    c.D[2] = c.B[6]; c.D[5] = c.B[3]; c.D[8] = c.B[0];
    c.B[6] = temp[0]; c.B[3] = temp[1]; c.B[0] = temp[2];
  } else if (face === 'L') {
    const temp = [c.U[0], c.U[3], c.U[6]];
    c.U[0] = c.B[8]; c.U[3] = c.B[5]; c.U[6] = c.B[2];
    c.B[8] = c.D[0]; c.B[5] = c.D[3]; c.B[2] = c.D[6];
    c.D[0] = c.F[0]; c.D[3] = c.F[3]; c.D[6] = c.F[6];
    c.F[0] = temp[0]; c.F[3] = temp[1]; c.F[6] = temp[2];
  } else if (face === 'F') {
    const temp = [c.U[6], c.U[7], c.U[8]];
    c.U[6] = c.L[8]; c.U[7] = c.L[5]; c.U[8] = c.L[2];
    c.L[2] = c.D[0]; c.L[5] = c.D[1]; c.L[8] = c.D[2];
    c.D[0] = c.R[6]; c.D[1] = c.R[3]; c.D[2] = c.R[0];
    c.R[0] = temp[0]; c.R[3] = temp[1]; c.R[6] = temp[2];
  } else if (face === 'B') {
    const temp = [c.U[0], c.U[1], c.U[2]];
    c.U[0] = c.R[2]; c.U[1] = c.R[5]; c.U[2] = c.R[8];
    c.R[2] = c.D[8]; c.R[5] = c.D[7]; c.R[8] = c.D[6];
    c.D[8] = c.L[6]; c.D[7] = c.L[3]; c.D[6] = c.L[0];
    c.L[0] = temp[2]; c.L[3] = temp[1]; c.L[6] = temp[0];
  }

  return c;
}

/**
 * Applies a move token like "R", "U'", "F2", "r", "M", etc.
 */
export function applyMove(cube, move) {
  if (!move || typeof move !== 'string') return cube;
  const clean = move.trim();
  if (!clean) return cube;

  // Extract base face / notation and modifier
  const modifier = clean.slice(-1);
  let base = clean;
  let times = 1;

  if (modifier === "'") {
    times = 3;
    base = clean.slice(0, -1);
  } else if (modifier === '2') {
    times = 2;
    base = clean.slice(0, -1);
  }

  // Handle wide moves and rotations
  // r = R + M' (or L + x)
  if (base === 'r' || base === 'Rw') {
    // wide R moves: R and M'
    for (let i = 0; i < times; i++) {
      cube = applyBasicCW(cube, 'R');
      cube = applySliceM(cube, 3); // M'
    }
    return cube;
  }
  if (base === 'l' || base === 'Lw') {
    for (let i = 0; i < times; i++) {
      cube = applyBasicCW(cube, 'L');
      cube = applySliceM(cube, 1); // M
    }
    return cube;
  }
  if (base === 'f' || base === 'Fw') {
    for (let i = 0; i < times; i++) {
      cube = applyBasicCW(cube, 'F');
      cube = applySliceS(cube, 1); // S
    }
    return cube;
  }
  if (base === 'u' || base === 'Uw') {
    for (let i = 0; i < times; i++) {
      cube = applyBasicCW(cube, 'U');
      cube = applySliceE(cube, 3); // E'
    }
    return cube;
  }
  if (base === 'd' || base === 'Dw') {
    for (let i = 0; i < times; i++) {
      cube = applyBasicCW(cube, 'D');
      cube = applySliceE(cube, 1); // E
    }
    return cube;
  }
  if (base === 'b' || base === 'Bw') {
    for (let i = 0; i < times; i++) {
      cube = applyBasicCW(cube, 'B');
      cube = applySliceS(cube, 3); // S'
    }
    return cube;
  }
  if (base === 'M') {
    return applySliceM(cube, times);
  }
  if (base === 'E') {
    return applySliceE(cube, times);
  }
  if (base === 'S') {
    return applySliceS(cube, times);
  }
  if (base === 'x') {
    return applyRotationX(cube, times);
  }
  if (base === 'y') {
    return applyRotationY(cube, times);
  }
  if (base === 'z') {
    return applyRotationZ(cube, times);
  }

  // Standard face turns: U, D, R, L, F, B
  if (['U', 'D', 'R', 'L', 'F', 'B'].includes(base)) {
    for (let i = 0; i < times; i++) {
      cube = applyBasicCW(cube, base);
    }
    return cube;
  }

  return cube;
}

// Slice move M: follows L direction (top towards front)
function applySliceM(cube, times = 1) {
  let c = cube;
  for (let i = 0; i < times; i++) {
    c = cloneCube(c);
    const temp = [c.U[1], c.U[4], c.U[7]];
    c.U[1] = c.B[7]; c.U[4] = c.B[4]; c.U[7] = c.B[1];
    c.B[7] = c.D[1]; c.B[4] = c.D[4]; c.B[1] = c.D[7];
    c.D[1] = c.F[1]; c.D[4] = c.F[4]; c.D[7] = c.F[7];
    c.F[1] = temp[0]; c.F[4] = temp[1]; c.F[7] = temp[2];
  }
  return c;
}

// Slice move E: follows D direction
function applySliceE(cube, times = 1) {
  let c = cube;
  for (let i = 0; i < times; i++) {
    c = cloneCube(c);
    const temp = [c.F[3], c.F[4], c.F[5]];
    c.F[3] = c.L[3]; c.F[4] = c.L[4]; c.F[5] = c.L[5];
    c.L[3] = c.B[3]; c.L[4] = c.B[4]; c.L[5] = c.B[5];
    c.B[3] = c.R[3]; c.B[4] = c.R[4]; c.B[5] = c.R[5];
    c.R[3] = temp[0]; c.R[4] = temp[1]; c.R[5] = temp[2];
  }
  return c;
}

// Slice move S: follows F direction
function applySliceS(cube, times = 1) {
  let c = cube;
  for (let i = 0; i < times; i++) {
    c = cloneCube(c);
    const temp = [c.U[3], c.U[4], c.U[5]];
    c.U[3] = c.L[7]; c.U[4] = c.L[4]; c.U[5] = c.L[1];
    c.L[1] = c.D[3]; c.L[4] = c.D[4]; c.L[7] = c.D[5];
    c.D[3] = c.R[7]; c.D[4] = c.R[4]; c.D[5] = c.R[1];
    c.R[1] = temp[0]; c.R[4] = temp[1]; c.R[7] = temp[2];
  }
  return c;
}

// Rotation x: follows R
function applyRotationX(cube, times = 1) {
  let c = cube;
  for (let i = 0; i < times; i++) {
    c = applyBasicCW(c, 'R');
    c = applyBasicCW(c, 'L');
    c = applyBasicCW(c, 'L');
    c = applyBasicCW(c, 'L');
    c = applySliceM(c, 3);
  }
  return c;
}

// Rotation y: follows U
function applyRotationY(cube, times = 1) {
  let c = cube;
  for (let i = 0; i < times; i++) {
    c = applyBasicCW(c, 'U');
    c = applyBasicCW(c, 'D');
    c = applyBasicCW(c, 'D');
    c = applyBasicCW(c, 'D');
    c = applySliceE(c, 3);
  }
  return c;
}

// Rotation z: follows F
function applyRotationZ(cube, times = 1) {
  let c = cube;
  for (let i = 0; i < times; i++) {
    c = applyBasicCW(c, 'F');
    c = applyBasicCW(c, 'B');
    c = applyBasicCW(c, 'B');
    c = applyBasicCW(c, 'B');
    c = applySliceS(c, 1);
  }
  return c;
}

/**
 * Simulates a full scramble string on a solved cube.
 */
export function getScrambledCube(scrambleString) {
  let cube = createSolvedCube();
  if (!scrambleString || typeof scrambleString !== 'string') return cube;

  const moves = scrambleString.trim().split(/\s+/);
  for (const move of moves) {
    if (move) {
      cube = applyMove(cube, move);
    }
  }
  return cube;
}

/**
 * Computes the exact inverse of an algorithm string.
 * Example: "R U R' U R U2 R'" => "R U2 R' U' R U' R'"
 */
export function invertAlgorithm(algoString) {
  if (!algoString || typeof algoString !== 'string') return '';

  // Clean brackets and parentheses if present
  const cleaned = algoString.replace(/[()[\]]/g, '').trim();
  if (!cleaned) return '';

  const tokens = cleaned.split(/\s+/);
  const inverted = [];

  for (let i = tokens.length - 1; i >= 0; i--) {
    const token = tokens[i];
    if (!token) continue;

    if (token.endsWith("2'") || token.endsWith("2")) {
      const base = token.replace(/2'?$/, '');
      inverted.push(`${base}2`);
    } else if (token.endsWith("'")) {
      inverted.push(token.slice(0, -1));
    } else {
      inverted.push(`${token}'`);
    }
  }

  return inverted.join(' ');
}
