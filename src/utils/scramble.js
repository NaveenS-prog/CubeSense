// Simple scramble generator for 3x3 cube
// Generates a random sequence of moves (R, L, U, D, F, B) with possible modifiers (', 2)
// Avoids repeating the same face consecutively and more than two same moves in a row.

const moves = ['R', 'L', 'U', 'D', 'F', 'B'];
const modifiers = ['', "'", '2'];

/**
 * Generates a random scramble of specified length
 * @param {number} length - Number of moves in the scramble (default 20)
 * @returns {string} - The scramble string
 */
export function generateScramble(length = 20) {
  let scramble = [];
  let lastMove = null;
  let lastMoveFace = null;

  for (let i = 0; i < length; i++) {
    let move;
    let face;

    do {
      face = moves[Math.floor(Math.random() * moves.length)];
      move = face + modifiers[Math.floor(Math.random() * modifiers.length)];
    } while (face === lastMoveFace ||
             (i >= 2 &&
              scramble[i-1].startsWith(face) &&
              scramble[i-2].startsWith(face)));

    scramble.push(move);
    lastMove = move;
    lastMoveFace = face;
  }

  return scramble.join(' ');
}

export default { generateScramble };