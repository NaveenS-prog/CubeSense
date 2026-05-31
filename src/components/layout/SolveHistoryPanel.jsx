import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import { computeStats, formatSolveDisplay, formatTime } from '../../utils/timerStats';

function StatCell({ label, value }) {
  return (
    <div className="stat-cell">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value ?? '--'}</div>
    </div>
  );
}

function SolveHistoryPanel({ solves, onDelete, onApplyPenalty }) {
  const stats = useMemo(() => computeStats(solves), [solves]);

  const formatStat = (ms) => (ms != null ? formatTime(ms) : '--');

  return (
    <aside className="solve-panel">
      <div className="solve-panel-header">
        <span className="solve-panel-title">Solves</span>
        <span className="solve-panel-count">{solves.length}</span>
      </div>

      <div className="solve-list">
        {solves.length === 0 ? (
          <div className="solve-empty">No solves yet this session.</div>
        ) : (
          solves.map((record, index) => {
            const solveNumber = solves.length - index;
            const isDnf = record.penalty === 'DNF';
            const isPlus2 = record.penalty === '+2';

            return (
              <div key={record.id || record.localId || `${record.solvedAt}-${index}`} className="solve-row">
                <span className="solve-index">{solveNumber}</span>
                <span className={`solve-time ${isDnf ? 'dnf' : ''}`}>
                  {formatSolveDisplay(record)}
                </span>
                <div className="solve-actions">
                  <button
                    type="button"
                    className={`solve-action-btn ${isPlus2 ? 'active' : ''}`}
                    onClick={() => onApplyPenalty(record, isPlus2 ? null : '+2')}
                    title="Toggle +2"
                  >
                    +2
                  </button>
                  <button
                    type="button"
                    className={`solve-action-btn ${isDnf ? 'active' : ''}`}
                    onClick={() => onApplyPenalty(record, isDnf ? null : 'DNF')}
                    title="Toggle DNF"
                  >
                    DNF
                  </button>
                  <button
                    type="button"
                    className="solve-action-btn delete"
                    onClick={() => onDelete(record)}
                    title="Delete solve"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="stats-grid">
        <StatCell label="pb" value={formatStat(stats.pb)} />
        <StatCell label="worst" value={formatStat(stats.worst)} />
        <StatCell label="avg" value={formatStat(stats.avg)} />
        <StatCell label="ao5" value={formatStat(stats.ao5)} />
        <StatCell label="ao12" value={formatStat(stats.ao12)} />
      </div>
    </aside>
  );
}

export default SolveHistoryPanel;
