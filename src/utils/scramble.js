// Multi-event WCA-compliant scramble generator

const MOVES_3X3 = ['R', 'L', 'U', 'D', 'F', 'B'];
const MODIFIERS = ['', "'", '2'];

const OPPOSITE = {
  R: 'L', L: 'R',
  U: 'D', D: 'U',
  F: 'B', B: 'F',
};

// Axis definitions for Big Cubes (4x4, 5x5)
const AXES_4X4 = {
  X: ['R', 'L', 'Rw'],
  Y: ['U', 'D', 'Uw'],
  Z: ['F', 'B', 'Fw'],
};

const MOVE_TO_AXIS_4X4 = {
  R: 'X', L: 'X', Rw: 'X',
  U: 'Y', D: 'Y', Uw: 'Y',
  F: 'Z', B: 'Z', Fw: 'Z',
};

const ALL_MOVES_4X4 = ['R', 'L', 'U', 'D', 'F', 'B', 'Rw', 'Uw', 'Fw'];

const AXES_5X5 = {
  X: ['R', 'L', 'Rw', 'Lw'],
  Y: ['U', 'D', 'Uw', 'Dw'],
  Z: ['F', 'B', 'Fw', 'Bw'],
};

const MOVE_TO_AXIS_5X5 = {
  R: 'X', L: 'X', Rw: 'X', Lw: 'X',
  U: 'Y', D: 'Y', Uw: 'Y', Dw: 'Y',
  F: 'Z', B: 'Z', Fw: 'Z', Bw: 'Z',
};

const ALL_MOVES_5X5 = [
  'R', 'L', 'U', 'D', 'F', 'B',
  'Rw', 'Lw', 'Uw', 'Dw', 'Fw', 'Bw',
];

/**
 * Generates a standard 3x3 scramble adhering to WCA rules:
 * 1. Same face cannot repeat consecutively (R R blocked)
 * 2. Same face cannot appear after its opposite face pair (R L R blocked)
 */
export function generate3x3Scramble(length = 20) {
  const scramble = [];
  let lastFace = null;
  let secondLastFace = null;

  for (let i = 0; i < length; i++) {
    let face;

    do {
      face = MOVES_3X3[Math.floor(Math.random() * MOVES_3X3.length)];

      // Rule 1: No same face twice in a row
      if (face === lastFace) continue;

      // Rule 2: No same face after opposite pair (R L R blocked)
      if (face === secondLastFace && OPPOSITE[lastFace] === secondLastFace) continue;

      break;
    } while (true);

    const move = face + MODIFIERS[Math.floor(Math.random() * MODIFIERS.length)];
    scramble.push(move);

    secondLastFace = lastFace;
    lastFace = face;
  }

  return scramble.join(' ');
}

/**
 * Generates a 2x2 scramble (WCA style: R, U, F moves only)
 * Since R, U, F are all perpendicular axes, no opposite pair can exist.
 */
export function generate2x2Scramble(length = 10) {
  const moves = ['R', 'U', 'F'];
  const scramble = [];
  let lastFace = null;

  for (let i = 0; i < length; i++) {
    let face;
    do {
      face = moves[Math.floor(Math.random() * moves.length)];
    } while (face === lastFace);

    const move = face + MODIFIERS[Math.floor(Math.random() * MODIFIERS.length)];
    scramble.push(move);
    lastFace = face;
  }

  return scramble.join(' ');
}

/**
 * Generates a WCA-compliant 4x4 scramble:
 * - Uses outer moves (R, L, U, D, F, B) + standard WCA wide turns (Rw, Uw, Fw)
 * - Rule 1: No same face/layer consecutively (R R' blocked, Rw Rw2 blocked)
 * - Rule 2: No same face after an opposite/parallel layer on the same axis (R L R blocked, R Rw R blocked, Rw L Rw blocked)
 * - Rule 3: Max 2 consecutive turns along the same parallel axis before switching axes
 */
export function generate4x4Scramble(length = 42) {
  const scramble = [];
  let lastMove = null;
  let secondLastMove = null;
  let currentAxis = null;
  let movesOnCurrentAxis = 0;

  for (let i = 0; i < length; i++) {
    let moveBase;
    let axis;

    do {
      moveBase = ALL_MOVES_4X4[Math.floor(Math.random() * ALL_MOVES_4X4.length)];
      axis = MOVE_TO_AXIS_4X4[moveBase];

      // Rule 1: No same base move twice consecutively
      if (moveBase === lastMove) continue;

      // Rule 2: Same-axis cancellation prevention
      // If moving along the same axis as the last move:
      if (axis === currentAxis) {
        // Can't exceed 2 consecutive moves on the same axis
        if (movesOnCurrentAxis >= 2) continue;

        // Block R L R, R Rw R, Rw L Rw, etc.
        if (moveBase === secondLastMove) continue;
      }

      break;
    } while (true);

    const move = moveBase + MODIFIERS[Math.floor(Math.random() * MODIFIERS.length)];
    scramble.push(move);

    if (axis === currentAxis) {
      movesOnCurrentAxis += 1;
    } else {
      currentAxis = axis;
      movesOnCurrentAxis = 1;
    }

    secondLastMove = lastMove;
    lastMove = moveBase;
  }

  return scramble.join(' ');
}

/**
 * Generates a WCA-compliant 5x5 scramble:
 * - Outer moves (R, L, U, D, F, B) + wide turns (Rw, Lw, Uw, Dw, Fw, Bw)
 * - Axis grouping with strict anti-cancellation rules
 * - Length: 60 moves
 */
export function generate5x5Scramble(length = 60) {
  const scramble = [];
  let lastMove = null;
  let secondLastMove = null;
  let currentAxis = null;
  let movesOnCurrentAxis = 0;

  for (let i = 0; i < length; i++) {
    let moveBase;
    let axis;

    do {
      moveBase = ALL_MOVES_5X5[Math.floor(Math.random() * ALL_MOVES_5X5.length)];
      axis = MOVE_TO_AXIS_5X5[moveBase];

      // Rule 1: No same base move twice consecutively
      if (moveBase === lastMove) continue;

      // Rule 2: Same axis constraint
      if (axis === currentAxis) {
        if (movesOnCurrentAxis >= 2) continue;
        if (moveBase === secondLastMove) continue;
      }

      break;
    } while (true);

    const move = moveBase + MODIFIERS[Math.floor(Math.random() * MODIFIERS.length)];
    scramble.push(move);

    if (axis === currentAxis) {
      movesOnCurrentAxis += 1;
    } else {
      currentAxis = axis;
      movesOnCurrentAxis = 1;
    }

    secondLastMove = lastMove;
    lastMove = moveBase;
  }

  return scramble.join(' ');
}

/**
 * Generates a WCA Pyraminx scramble:
 * - Body moves: U, L, R, B (modifiers: '', "'")
 * - Tip moves: u, l, r, b (randomly applied)
 */
export function generatePyraminxScramble(length = 11) {
  const bodyFaces = ['U', 'L', 'R', 'B'];
  const pyraModifiers = ['', "'"];
  const scramble = [];
  let lastFace = null;

  for (let i = 0; i < length; i++) {
    let face;
    do {
      face = bodyFaces[Math.floor(Math.random() * bodyFaces.length)];
    } while (face === lastFace);

    const move = face + pyraModifiers[Math.floor(Math.random() * pyraModifiers.length)];
    scramble.push(move);
    lastFace = face;
  }

  // WCA Tips: u, l, r, b (each randomly 0, clockwise, or counter-clockwise)
  const tipFaces = ['u', 'l', 'r', 'b'];
  tipFaces.forEach((tip) => {
    const r = Math.random();
    if (r < 0.33) {
      scramble.push(tip);
    } else if (r < 0.66) {
      scramble.push(tip + "'");
    }
  });

  return scramble.join(' ');
}

/**
 * Generates a WCA Skewb scramble:
 * - Moves: R, U, L, B (modifiers: '', "'")
 */
export function generateSkewbScramble(length = 11) {
  const moves = ['R', 'U', 'L', 'B'];
  const skewbModifiers = ['', "'"];
  const scramble = [];
  let lastFace = null;

  for (let i = 0; i < length; i++) {
    let face;
    do {
      face = moves[Math.floor(Math.random() * moves.length)];
    } while (face === lastFace);

    const move = face + skewbModifiers[Math.floor(Math.random() * skewbModifiers.length)];
    scramble.push(move);
    lastFace = face;
  }

  return scramble.join(' ');
}

/**
 * Generates a WCA Megaminx scramble (Pochmann style):
 * - 7 lines of alternating R++/R-- and D++/D-- (10 moves per line)
 * - Followed by U or U' at the end of each line
 */
export function generateMegaminxScramble(lines = 7) {
  const lineScrambles = [];

  for (let l = 0; l < lines; l++) {
    const lineMoves = [];
    for (let p = 0; p < 5; p++) {
      const rMove = Math.random() < 0.5 ? 'R++' : 'R--';
      const dMove = Math.random() < 0.5 ? 'D++' : 'D--';
      lineMoves.push(rMove, dMove);
    }
    const uMove = Math.random() < 0.5 ? 'U' : "U'";
    lineMoves.push(uMove);
    lineScrambles.push(lineMoves.join(' '));
  }

  return lineScrambles.join('\n');
}

/**
 * Main scramble generator supporting multiple cube events.
 */
export function generateScramble(eventOrLength = '3x3', customLength) {
  if (typeof eventOrLength === 'number') {
    return generate3x3Scramble(eventOrLength);
  }

  switch (eventOrLength) {
    case '2x2':
      return generate2x2Scramble(customLength || 10);
    case '4x4':
      return generate4x4Scramble(customLength || 42);
    case '5x5':
      return generate5x5Scramble(customLength || 60);
    case 'pyra':
    case 'pyraminx':
      return generatePyraminxScramble(customLength || 11);
    case 'skewb':
      return generateSkewbScramble(customLength || 11);
    case 'mega':
    case 'megaminx':
      return generateMegaminxScramble();
    case '3x3_oh':
    case '3x3':
    default:
      return generate3x3Scramble(customLength || 20);
  }
}

export const CUBE_EVENTS = [
  { id: '3x3', name: '3x3x3' },
  { id: '2x2', name: '2x2x2' },
  { id: '4x4', name: '4x4x4' },
  { id: '5x5', name: '5x5x5' },
  { id: '3x3_oh', name: '3x3 OH' },
  { id: 'pyra', name: 'Pyraminx' },
  { id: 'skewb', name: 'Skewb' },
  { id: 'mega', name: 'Megaminx' },
];

export default {
  generateScramble,
  generate3x3Scramble,
  generate2x2Scramble,
  generate4x4Scramble,
  generate5x5Scramble,
  generatePyraminxScramble,
  generateSkewbScramble,
  generateMegaminxScramble,
  CUBE_EVENTS,
};
