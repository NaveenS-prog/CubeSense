/**
 * Speedcubing Timer Statistics and WCA Regulations Calculation
 */

export function formatTime(ms) {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return 'DNF';
  if (ms < 0) return '0.00';

  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hundredths = Math.floor((ms % 1000) / 10);

  const secStr = String(seconds).padStart(2, '0');
  const hundStr = String(hundredths).padStart(2, '0');

  if (minutes > 0) {
    return `${minutes}:${secStr}.${hundStr}`;
  }
  return `${seconds}.${hundStr}`;
}

export function formatSolveDisplay(record) {
  if (!record) return '--';
  if (record.penalty === 'DNF') return 'DNF';
  const base = formatTime(record.finalTime ?? record.time);
  return record.penalty === '+2' ? `${base} (+2)` : base;
}

/**
 * Calculates a trimmed WCA Average of N (e.g. Ao5 or Ao12).
 * Solves array must contain exactly `count` items.
 *
 * Official WCA rule (Article 9f):
 * - Exactly 1 DNF is allowed in an Ao5 or Ao12: it counts as the single worst time and is trimmed.
 * - 2 or more DNFs in an Ao5/Ao12 results in a DNF average.
 */
export function calculateTrimmedAverage(solvesChunk) {
  if (!solvesChunk || solvesChunk.length < 3) return null;

  const count = solvesChunk.length;
  let dnfCount = 0;
  const validTimes = [];

  for (const solve of solvesChunk) {
    if (solve.penalty === 'DNF' || !Number.isFinite(solve.finalTime)) {
      dnfCount++;
    } else {
      validTimes.push(solve.finalTime);
    }
  }

  // WCA rule: 2 or more DNFs in Ao5/Ao12 means the entire average is DNF
  if (dnfCount >= 2) {
    return 'DNF';
  }

  // Sort valid times ascending
  validTimes.sort((a, b) => a - b);

  if (dnfCount === 1) {
    // The DNF is the single worst time (trimmed off top).
    // The best time is trimmed off bottom (validTimes[0]).
    const trimmed = validTimes.slice(1);
    const sum = trimmed.reduce((acc, t) => acc + t, 0);
    return sum / trimmed.length;
  }

  // 0 DNFs: trim lowest and highest
  const trimmed = validTimes.slice(1, -1);
  const sum = trimmed.reduce((acc, t) => acc + t, 0);
  return sum / trimmed.length;
}

/**
 * Returns the current average of the last `count` solves (newest first).
 */
export function averageOf(records, count) {
  if (!records || records.length < count) return null;
  const chunk = records.slice(0, count);
  return calculateTrimmedAverage(chunk);
}

/**
 * Computes comprehensive session statistics including best Ao5 and best Ao12.
 */
export function computeStats(solves) {
  if (!solves || solves.length === 0) {
    return {
      pb: null,
      worst: null,
      avg: null,
      ao5: null,
      bestAo5: null,
      ao12: null,
      bestAo12: null,
      totalCount: 0,
      validCount: 0,
      dnfCount: 0,
      plus2Count: 0,
      stdDev: null,
    };
  }

  const valid = solves.filter((s) => s.penalty !== 'DNF' && Number.isFinite(s.finalTime));
  const validTimes = valid.map((s) => s.finalTime);

  const pb = validTimes.length ? Math.min(...validTimes) : null;
  const worst = validTimes.length ? Math.max(...validTimes) : null;
  const avg = validTimes.length
    ? validTimes.reduce((sum, t) => sum + t, 0) / validTimes.length
    : null;

  // Standard deviation
  let stdDev = null;
  if (validTimes.length > 1 && avg !== null) {
    const variance =
      validTimes.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / validTimes.length;
    stdDev = Math.sqrt(variance);
  }

  // Solves are stored newest-first. Reverse to chronological order to calculate sliding best averages.
  const chronological = [...solves].reverse();

  // Find Best Ao5
  let bestAo5 = null;
  if (chronological.length >= 5) {
    for (let i = 0; i <= chronological.length - 5; i++) {
      const windowChunk = chronological.slice(i, i + 5);
      const val = calculateTrimmedAverage(windowChunk);
      if (typeof val === 'number') {
        if (bestAo5 === null || val < bestAo5) {
          bestAo5 = val;
        }
      }
    }
  }

  // Find Best Ao12
  let bestAo12 = null;
  if (chronological.length >= 12) {
    for (let i = 0; i <= chronological.length - 12; i++) {
      const windowChunk = chronological.slice(i, i + 12);
      const val = calculateTrimmedAverage(windowChunk);
      if (typeof val === 'number') {
        if (bestAo12 === null || val < bestAo12) {
          bestAo12 = val;
        }
      }
    }
  }

  const dnfCount = solves.filter((s) => s.penalty === 'DNF').length;
  const plus2Count = solves.filter((s) => s.penalty === '+2').length;

  return {
    pb,
    worst,
    avg,
    ao5: averageOf(solves, 5),
    bestAo5,
    ao12: averageOf(solves, 12),
    bestAo12,
    totalCount: solves.length,
    validCount: valid.length,
    dnfCount,
    plus2Count,
    stdDev,
  };
}
