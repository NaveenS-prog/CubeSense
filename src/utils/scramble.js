// Multi-event WCA-compliant scramble generator

const MOVES_3X3 = ['R', 'L', 'U', 'D', 'F', 'B'];
const MODIFIERS = ['', "'", '2'];

const OPPOSITE = {
  R: 'L', L: 'R',
  U: 'D', D: 'U',
  F: 'B', B: 'F',
};

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
 * Generates a 4x4 scramble (includes wide turns Rw, Fw, Uw)
 */
export function generate4x4Scramble(length = 42) {
  const outerMoves = ['R', 'L', 'U', 'D', 'F', 'B'];
  const wideMoves = ['Rw', 'Lw', 'Uw', 'Dw', 'Fw', 'Bw'];
  const allMoves = [...outerMoves, ...wideMoves];
  const scramble = [];
  let lastFace = null;

  for (let i = 0; i < length; i++) {
    let moveBase;
    do {
      moveBase = allMoves[Math.floor(Math.random() * allMoves.length)];
    } while (moveBase === lastFace);

    const move = moveBase + MODIFIERS[Math.floor(Math.random() * MODIFIERS.length)];
    scramble.push(move);
    lastFace = moveBase;
  }

  return scramble.join(' ');
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
  { id: '3x3_oh', name: '3x3 OH' },
];

export default {
  generateScramble,
  generate3x3Scramble,
  generate2x2Scramble,
  generate4x4Scramble,
  CUBE_EVENTS,
};
