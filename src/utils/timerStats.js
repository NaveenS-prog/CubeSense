export function formatTime(ms) {
  if (!Number.isFinite(ms)) return 'DNF';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  const hundredths = String(Math.floor((ms % 1000) / 10)).padStart(2, '0');
  return `${minutes}:${seconds}.${hundredths}`;
}

export function formatSolveDisplay(record) {
  if (record.penalty === 'DNF') return 'DNF';
  const base = formatTime(record.finalTime);
  return record.penalty === '+2' ? `${base} +2` : base;
}

export function averageOf(records, count) {
  const solves = records
    .filter((record) => record.type === 'solve')
    .slice(0, count);

  if (solves.length < count || solves.some((record) => record.penalty === 'DNF')) {
    return null;
  }

  const times = solves.map((record) => record.finalTime).sort((a, b) => a - b);
  const trimmed = times.slice(1, -1);
  const total = trimmed.reduce((sum, time) => sum + time, 0);
  return total / trimmed.length;
}

export function computeStats(solves) {
  const valid = solves.filter((s) => s.penalty !== 'DNF' && Number.isFinite(s.finalTime));

  const pb = valid.length ? Math.min(...valid.map((s) => s.finalTime)) : null;
  const worst = valid.length ? Math.max(...valid.map((s) => s.finalTime)) : null;
  const avg = valid.length
    ? valid.reduce((sum, s) => sum + s.finalTime, 0) / valid.length
    : null;

  return {
    pb,
    worst,
    avg,
    ao5: averageOf(solves, 5),
    ao12: averageOf(solves, 12),
  };
}
