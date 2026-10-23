import React, { useState, useMemo } from 'react';
import { Search, Play, Copy, Check, Sparkles, BookOpen, ExternalLink, Zap } from 'lucide-react';
import { F2L_CASES, OLL_CASES, PLL_CASES } from '../data/algorithms';
import AlgoVisualizer from './AlgoVisualizer';
import { invertAlgorithm } from '../utils/cubeSimulator';

export default function AlgoTeacher({ onStartPractice, onOpenTrainer }) {
  const [activeTab, setActiveTab] = useState('full-pll'); // 'f2l' | 'full-oll' | 'full-pll' | '2look-oll' | '2look-pll'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCase, setSelectedCase] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Compute cases for current tab
  const cases = useMemo(() => {
    let list = [];
    if (activeTab === 'f2l') {
      list = F2L_CASES;
    } else if (activeTab === 'full-oll') {
      list = OLL_CASES;
    } else if (activeTab === 'full-pll') {
      list = PLL_CASES;
    } else if (activeTab === '2look-oll') {
      list = OLL_CASES.filter((c) => c.is2Look);
    } else if (activeTab === '2look-pll') {
      list = PLL_CASES.filter((c) => c.is2Look);
    } else {
      list = PLL_CASES;
    }

    if (!searchQuery.trim()) return list;

    const query = searchQuery.toLowerCase();
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.category.toLowerCase().includes(query) ||
        c.notation.toLowerCase().includes(query)
    );
  }, [activeTab, searchQuery]);

  const handleCopy = async (caseObj, e) => {
    e?.stopPropagation();
    try {
      await navigator.clipboard.writeText(caseObj.notation);
      setCopiedId(caseObj.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // clipboard fallback
    }
  };

  const handlePracticeClick = (caseObj, e) => {
    e?.stopPropagation();
    const setupScramble = invertAlgorithm(caseObj.notation);

    if (onStartPractice) {
      onStartPractice({
        name: caseObj.name,
        category: caseObj.category,
        notation: caseObj.notation,
        setupScramble,
      });
    } else {
      setSelectedCase(caseObj);
    }
  };

  return (
    <div className="teacher-container">
      {/* Header & Description */}
      <div className="teacher-header">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="teacher-title">CFOP Algorithm Reference</h1>
            <p className="teacher-subtitle">
              Comprehensive reference of 41 F2L, 57 OLL, and 21 PLL speedcubing algorithms with setup scrambles and visual face diagrams.
            </p>
          </div>
          {onOpenTrainer && (
            <button
              type="button"
              className="toolbar-btn flex items-center gap-2"
              onClick={onOpenTrainer}
            >
              <Zap className="w-4 h-4" /> Open Practice Studio
            </button>
          )}
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="teacher-toolbar">
        <div className="teacher-tabs">
          <button
            type="button"
            className={`teacher-tab-btn ${activeTab === 'f2l' ? 'active' : ''}`}
            onClick={() => { setActiveTab('f2l'); setSelectedCase(null); }}
          >
            F2L (41)
          </button>
          <button
            type="button"
            className={`teacher-tab-btn ${activeTab === 'full-oll' ? 'active' : ''}`}
            onClick={() => { setActiveTab('full-oll'); setSelectedCase(null); }}
          >
            Full OLL (57)
          </button>
          <button
            type="button"
            className={`teacher-tab-btn ${activeTab === 'full-pll' ? 'active' : ''}`}
            onClick={() => { setActiveTab('full-pll'); setSelectedCase(null); }}
          >
            Full PLL (21)
          </button>
          <button
            type="button"
            className={`teacher-tab-btn ${activeTab === '2look-oll' ? 'active' : ''}`}
            onClick={() => { setActiveTab('2look-oll'); setSelectedCase(null); }}
          >
            2-Look OLL (7)
          </button>
          <button
            type="button"
            className={`teacher-tab-btn ${activeTab === '2look-pll' ? 'active' : ''}`}
            onClick={() => { setActiveTab('2look-pll'); setSelectedCase(null); }}
          >
            2-Look PLL (6)
          </button>
        </div>

        <div className="teacher-search">
          <Search className="w-4 h-4 text-[var(--text-muted)] ml-2.5" />
          <input
            type="text"
            placeholder="Search algorithms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="teacher-search-input"
          />
        </div>
      </div>

      {/* Algorithm Grid */}
      <div className="algo-grid">
        {cases.map((caseObj) => {
          const isSelected = selectedCase?.id === caseObj.id;
          const isCopied = copiedId === caseObj.id;

          return (
            <div
              key={caseObj.id}
              className={`algo-card-enhanced ${isSelected ? 'selected' : ''}`}
              onClick={() => setSelectedCase(isSelected ? null : caseObj)}
            >
              <div className="algo-card-header">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="algo-badge">{caseObj.category}</span>
                  {caseObj.algorithms && caseObj.algorithms.length > 1 && (
                    <span className="text-[10px] font-mono font-medium text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 px-1.5 py-0.5 rounded border border-[var(--accent-cyan)]/30">
                      {caseObj.algorithms.length} algs
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="algo-icon-btn"
                  onClick={(e) => handleCopy(caseObj, e)}
                  title="Copy algorithm"
                >
                  {isCopied ? (
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* Visual Diagram */}
              <div className="algo-visualizer-wrap">
                <AlgoVisualizer caseObj={caseObj} size={92} />
              </div>

              <div className="algo-info">
                <h3 className="algo-name-title">{caseObj.name}</h3>
                <div className="algo-formula">{caseObj.notation}</div>
                {caseObj.algorithms && caseObj.algorithms.length > 1 ? (
                  <div className="text-[10px] text-[var(--text-dim)] font-mono mt-1 truncate">
                    {caseObj.algorithms.map((a) => a.name).join(' · ')}
                  </div>
                ) : caseObj.alternative ? (
                  <div className="text-[11px] text-[var(--text-dim)] font-mono mt-1">
                    Alt: {caseObj.alternative}
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                className="algo-practice-btn"
                onClick={(e) => handlePracticeClick(caseObj, e)}
              >
                <Play className="w-3.5 h-3.5 mr-1 fill-current" /> Practice in Timer
              </button>
            </div>
          );
        })}
      </div>

      {/* Bottom Sticky Case Detail Bar (if selected) */}
      {selectedCase && (
        <div className="selected-case-panel">
          <div className="selected-case-content flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex items-center gap-3">
              <div className="selected-case-visual flex-shrink-0">
                <AlgoVisualizer caseObj={selectedCase} size={68} />
              </div>
              <div className="selected-case-details">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-white text-base">{selectedCase.name}</span>
                  <span className="algo-badge">{selectedCase.category}</span>
                  {selectedCase.algorithms && (
                    <span className="text-[11px] font-mono text-[var(--accent-cyan)]">
                      {selectedCase.algorithms.length} variations
                    </span>
                  )}
                </div>
                <div className="font-mono text-sm text-[var(--solve-green)] mt-0.5 font-semibold">
                  {selectedCase.notation}
                </div>
                {selectedCase.description && (
                  <div className="text-xs text-[var(--text-muted)] mt-1">
                    {selectedCase.description}
                  </div>
                )}
              </div>
            </div>

            {/* If variations exist, show quick variation buttons */}
            {selectedCase.algorithms && selectedCase.algorithms.length > 1 && (
              <div className="flex-1 max-w-xl w-full">
                <div className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                  Speed Variations
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                  {selectedCase.algorithms.map((algVar, vIdx) => (
                    <div
                      key={vIdx}
                      className="p-1.5 rounded bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="truncate">
                        <div className="font-semibold text-[11px] text-white flex items-center gap-1">
                          <span>{algVar.name}</span>
                          {algVar.note && (
                            <span className="text-[9px] text-[var(--accent-cyan)] font-normal italic">
                              ({algVar.note})
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-[10px] text-[var(--text-dim)] truncate">
                          {algVar.notation}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          className="p-1 hover:text-white text-[var(--text-dim)]"
                          onClick={() => {
                            navigator.clipboard.writeText(algVar.notation);
                            setCopiedId(`${selectedCase.id}-${vIdx}`);
                            setTimeout(() => setCopiedId(null), 1500);
                          }}
                          title="Copy notation"
                        >
                          {copiedId === `${selectedCase.id}-${vIdx}` ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                        <button
                          type="button"
                          className="px-2 py-0.5 rounded text-[10px] bg-[var(--accent-cyan)]/20 hover:bg-[var(--accent-cyan)]/30 text-[var(--accent-cyan)] font-medium"
                          onClick={() => handlePracticeClick({
                            ...selectedCase,
                            name: `${selectedCase.name} (${algVar.name})`,
                            notation: algVar.notation,
                          })}
                          title="Drill this variation"
                        >
                          Drill
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 self-end md:self-center ml-auto">
              <button
                type="button"
                className="toolbar-btn"
                onClick={() => handlePracticeClick(selectedCase)}
              >
                Practice in Timer
              </button>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setSelectedCase(null)}
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
