import React from 'react';
import { X, Copy, Check, RotateCcw, Trash2 } from 'lucide-react';
import { formatTime } from '../../utils/timerStats';
import CubeNetVisualizer from '../CubeNetVisualizer';

export default function SolveDetailModal({
  solve,
  solveIndex,
  totalSolves,
  onClose,
  onApplyPenalty,
  onDelete,
  onLoadScramble,
}) {
  const [copied, setCopied] = React.useState(false);

  if (!solve) return null;

  const handleCopyScramble = async () => {
    if (!solve.scramble) return;
    try {
      await navigator.clipboard.writeText(solve.scramble);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // fallback
    }
  };

  const isDnf = solve.penalty === 'DNF';
  const isPlus2 = solve.penalty === '+2';

  const solveNumber = totalSolves - solveIndex;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[var(--accent-blue)]">Solve #{solveNumber}</span>
            {solve.date && <span className="text-xs text-[var(--text-muted)]">· {solve.date}</span>}
          </div>
          <button type="button" className="icon-btn" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="modal-body">
          {/* Main Time Display */}
          <div className="text-center my-3">
            <div className={`text-4xl font-mono font-bold ${isDnf ? 'text-red-500' : 'text-[var(--solve-green)]'}`}>
              {isDnf ? 'DNF' : formatTime(solve.finalTime ?? solve.time)}
            </div>
            {isPlus2 && (
              <div className="text-xs text-amber-400 mt-1">
                Raw time: {formatTime(solve.time)} (+2 penalty applied)
              </div>
            )}
          </div>

          {/* Scramble & Visualizer */}
          {solve.scramble && (
            <div className="scramble-modal-section">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Scramble
                </span>
                <button
                  type="button"
                  className="text-xs flex items-center gap-1 text-[var(--accent-blue)] hover:underline"
                  onClick={handleCopyScramble}
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>

              <div className="font-mono text-xs bg-[var(--bg-app)] p-2.5 rounded border border-[var(--border-subtle)] text-[var(--text-light)] select-all leading-relaxed">
                {solve.scramble}
              </div>

              {/* 2D Scramble Net Preview */}
              <div className="flex justify-center mt-3 pt-3 border-t border-[var(--border-subtle)]">
                <CubeNetVisualizer scramble={solve.scramble} size={150} />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="modal-actions-grid mt-4">
            <button
              type="button"
              className={`secondary-button flex-1 justify-center ${isPlus2 ? 'border-amber-400 text-amber-400' : ''}`}
              onClick={() => onApplyPenalty(solve, isPlus2 ? null : '+2')}
            >
              +2 sec
            </button>
            <button
              type="button"
              className={`secondary-button flex-1 justify-center ${isDnf ? 'border-red-500 text-red-500' : ''}`}
              onClick={() => onApplyPenalty(solve, isDnf ? null : 'DNF')}
            >
              DNF
            </button>
            {onLoadScramble && solve.scramble && (
              <button
                type="button"
                className="secondary-button flex-1 justify-center gap-1.5"
                onClick={() => {
                  onLoadScramble(solve.scramble);
                  onClose();
                }}
                title="Use this scramble for next solve"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Re-scramble
              </button>
            )}
            <button
              type="button"
              className="secondary-button text-red-400 border-red-500/30 hover:bg-red-500/10 justify-center"
              onClick={() => {
                onDelete(solve);
                onClose();
              }}
              title="Delete solve"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
