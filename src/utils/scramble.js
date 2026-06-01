// Scramble generator for 3x3 cube
// Rules:
// 1. Same face cannot repeat consecutively (R R blocked)
// 2. Same face cannot appear after its opposite face pair (R L R blocked)

const moves = ['R', 'L', 'U', 'D', 'F', 'B'];
const modifiers = ['', "'", '2'];

const OPPOSITE = {
  R: 'L', L: 'R',
  U: 'D', D: 'U',
  F: 'B', B: 'F',
};

/**
 * Generates a random scramble of specified length
 * @param {number} length - Number of moves in the scramble (default 20)
 * @returns {string} - The scramble string
 */
export function generateScramble(length = 20) {
  let scramble = [];
  let lastFace = null;
  let secondLastFace = null;

  for (let i = 0; i < length; i++) {
    let face;
    let move;

    do {
      face = moves[Math.floor(Math.random() * moves.length)];

      // Rule 1: No same face twice in a row (R R blocked)
      if (face === lastFace) continue;

      // Rule 2: No same face after opposite pair (R L R blocked)
      // only block if last two were opposite faces and current == secondLast
      if (face === secondLastFace && OPPOSITE[lastFace] === secondLastFace) continue;

      break;
    } while (true);

    move = face + modifiers[Math.floor(Math.random() * modifiers.length)];
    scramble.push(move);

    secondLastFace = lastFace;
    lastFace = face;
  }

  return scramble.join(' ');
}

export default { generateScramble };
