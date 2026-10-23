import React, { useMemo, useState } from 'react';
import { Download, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { computeStats, formatSolveDisplay, formatTime } from '../../utils/timerStats';
import SolveDetailModal from './SolveDetailModal';
import SessionTrendChart from './SessionTrendChart';

function StatCell({ label, value, subValue, highlight }) {
  return (
    <div className={`stat-cell ${highlight ? 'highlight' : ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value ?? '--'}</div>
      {subValue && <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{subValue}</div>}
    </div>
  );
}

function SolveHistoryPanel({ solves, onDelete, onApplyPenalty, onLoadScramble, onClearSession }) {
  const [selectedSolveIndex, setSelectedSolveIndex] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showChart, setShowChart] = useState(true);

  const stats = useMemo(() => computeStats(solves), [solves]);

  const formatStat = (ms) => (ms != null ? (ms === 'DNF' ? 'DNF' : formatTime(ms)) : '--');

  const selectedSolve = selectedSolveIndex !== null ? solves[selectedSolveIndex] : null;

  const exportAsJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(solves, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `cubesense-session-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setShowExportMenu(false);
  };

  const exportAsCSV = () => {
    const headers = 'Solve,Time(ms),Formatted,Penalty,Scramble,Date\n';
    const rows = solves.map((s, idx) => {
      const num = solves.length - idx;
      const formatted = formatSolveDisplay(s);
      const cleanScramble = (s.scramble || '').replace(/"/g, '""');
      return `${num},${s.finalTime || ''},"${formatted}","${s.penalty || ''}","${cleanScramble}","${s.date || s.solvedAt || ''}"`;
    }).join('\n');

    const dataStr = 'data:text/csv;charset=utf-8,' + encodeURIComponent(headers + rows);
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `cubesense-session-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setShowExportMenu(false);
  };

  return (
    <aside className="solve-panel">
      <div className="solve-panel-header">
        <div className="flex items-center gap-2">
          <span className="solve-panel-title">Session Solves</span>
          <span className="solve-panel-count">{solves.length}</span>
        </div>

        <div className="flex items-center gap-1">
          {solves.length > 0 && (
            <div className="relative">
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowExportMenu((v) => !v)}
                title="Export session"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              {showExportMenu && (
                <div className="export-menu">
                  <button type="button" onClick={exportAsJSON} className="export-menu-item">
                    Export JSON
                  </button>
                  <button type="button" onClick={exportAsCSV} className="export-menu-item">
                    Export CSV
                  </button>
                </div>
              )}
            </div>
          )}

          {onClearSession && solves.length > 0 && (
            <button
              type="button"
              className="icon-btn"
              onClick={() => {
                if (window.confirm('Clear all solves in this session?')) {
                  onClearSession();
                }
              }}
              title="Clear session"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Mini Trend Chart */}
      {solves.length >= 3 && (
        <div className="px-3 pt-2 pb-1 border-b border-[var(--border-subtle)]">
          <SessionTrendChart solves={solves} height={46} />
        </div>
      )}

      {/* Solve List */}
      <div className="solve-list">
        {solves.length === 0 ? (
          <div className="solve-empty">
            <p>No solves yet this session.</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Press Spacebar to begin.</p>
          </div>
        ) : (
          solves.map((record, index) => {
            const solveNumber = solves.length - index;
            const isDnf = record.penalty === 'DNF';
            const isPlus2 = record.penalty === '+2';

            return (
              <div
                key={record.id || record.localId || `${record.solvedAt}-${index}`}
                className="solve-row cursor-pointer select-none"
                onClick={() => setSelectedSolveIndex(index)}
              >
                <span className="solve-index">{solveNumber}</span>
                <span className={`solve-time ${isDnf ? 'dnf' : ''}`}>
                  {formatSolveDisplay(record)}
                </span>
                <div className="solve-actions" onClick={(e) => e.stopPropagation()}>
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
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCell label="Best (PB)" value={formatStat(stats.pb)} highlight />
        <StatCell label="Session Mean" value={formatStat(stats.avg)} />
        <StatCell label="Current Ao5" value={formatStat(stats.ao5)} subValue={stats.bestAo5 ? `Best: ${formatStat(stats.bestAo5)}` : null} />
        <StatCell label="Current Ao12" value={formatStat(stats.ao12)} subValue={stats.bestAo12 ? `Best: ${formatStat(stats.bestAo12)}` : null} />
      </div>

      {/* Solve Details Modal */}
      {selectedSolve && (
        <SolveDetailModal
          solve={selectedSolve}
          solveIndex={selectedSolveIndex}
          totalSolves={solves.length}
          onClose={() => setSelectedSolveIndex(null)}
          onApplyPenalty={onApplyPenalty}
          onDelete={onDelete}
          onLoadScramble={onLoadScramble}
        />
      )}
    </aside>
  );
}

export default SolveHistoryPanel;
