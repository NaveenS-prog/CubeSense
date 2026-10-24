import React from 'react';
import { formatTime } from '../../utils/timerStats';

export default function SessionTrendChart({ solves, height = 50 }) {
  if (!Array.isArray(solves) || solves.length < 2) return null;

  // Chronological order (oldest to newest)
  const chronological = [...solves].filter(Boolean).reverse();
  const valid = chronological.filter((s) => s && s.penalty !== 'DNF' && Number.isFinite(s.finalTime));

  if (valid.length < 2) return null;

  const times = valid.map((s) => s.finalTime);
  const min = Math.min(...times);
  const max = Math.max(...times);
  const range = max - min || 1;

  const width = 280;
  const paddingX = 8;
  const paddingY = 6;
  const chartW = width - paddingX * 2;
  const chartH = height - paddingY * 2;

  const points = times.map((t, idx) => {
    const x = paddingX + (idx / (times.length - 1)) * chartW;
    const y = paddingY + chartH - ((t - min) / range) * chartH;
    return `${x},${y}`;
  });

  const pathData = `M ${points.join(' L ')}`;

  // Area under line
  const areaData = `${pathData} L ${paddingX + chartW},${height} L ${paddingX},${height} Z`;

  return (
    <div className="session-trend-container">
      <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] mb-1 px-1">
        <span>Session Trend</span>
        <span>Min: {formatTime(min)} · Max: {formatTime(max)}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} className="overflow-visible">
        <defs>
          <linearGradient id="trend-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={areaData} fill="url(#trend-gradient)" />
        <path d={pathData} fill="none" stroke="rgba(255, 255, 255, 0.5)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Latest point dot */}
        {points.length > 0 && (
          <circle
            cx={points[points.length - 1].split(',')[0]}
            cy={points[points.length - 1].split(',')[1]}
            r="2.5"
            fill="#ededee"
            stroke="#13151b"
            strokeWidth="1.2"
          />
        )}
      </svg>
    </div>
  );
}
