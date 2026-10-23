/**
 * Master Speedcubing Algorithms Database
 * Central export for F2L (41 cases), OLL (57 cases), and PLL (21 cases).
 */

import { F2L_CASES } from './f2lAlgorithms';
import { OLL_CASES } from './ollAlgorithms';
import { PLL_CASES } from './pllAlgorithms';

export { F2L_CASES, OLL_CASES, PLL_CASES };

export const ALL_ALGORITHMS = [
  ...F2L_CASES.map((c) => ({ ...c, type: 'F2L' })),
  ...OLL_CASES.map((c) => ({ ...c, type: 'OLL' })),
  ...PLL_CASES.map((c) => ({ ...c, type: 'PLL' })),
];

export function getAlgorithmById(id) {
  return ALL_ALGORITHMS.find((algo) => algo.id === id) || null;
}
