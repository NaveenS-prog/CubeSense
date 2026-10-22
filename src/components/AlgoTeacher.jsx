import React, { useState, useMemo } from 'react';
import { Search, Play, Copy, Check, Sparkles, BookOpen } from 'lucide-react';
import { OLL_CASES, PLL_CASES } from '../data/algorithms';
import AlgoVisualizer from './AlgoVisualizer';
import { invertAlgorithm } from '../utils/cubeSimulator';

export default function AlgoTeacher({ onStartPractice }) {
  const [activeTab, setActiveTab] = useState('2look-oll'); // '2look-oll' | '2look-pll' | 'full-pll'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCase, setSelectedCase] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Compute cases for current tab
  const cases = useMemo(() => {
    let list = [];
    if (activeTab === '2look-oll') {
      list = OLL_CASES;
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
        <div>
          <h1 className="teacher-title">Algorithm Trainer</h1>
          <p className="teacher-subtitle">
            Master CFOP Last Layer with visual diagrams, algorithms, and real inverted setup scrambles.
          </p>
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="teacher-toolbar">
        <div className="teacher-tabs">
          <button
            type="button"
            className={`teacher-tab-btn ${activeTab === '2look-oll' ? 'active' : ''}`}
            onClick={() => { setActiveTab('2look-oll'); setSelectedCase(null); }}
          >
            2-Look OLL ({OLL_CASES.length})
          </button>
          <button
            type="button"
            className={`teacher-tab-btn ${activeTab === '2look-pll' ? 'active' : ''}`}
            onClick={() => { setActiveTab('2look-pll'); setSelectedCase(null); }}
          >
            2-Look PLL (6)
          </button>
          <button
            type="button"
            className={`teacher-tab-btn ${activeTab === 'full-pll' ? 'active' : ''}`}
            onClick={() => { setActiveTab('full-pll'); setSelectedCase(null); }}
          >
            Full PLL (21)
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
              onClick={() => setSelectedCase(caseObj)}
            >
              <div className="algo-card-header">
                <span className="algo-badge">{caseObj.category}</span>
                <button
                  type="button"
                  className="algo-icon-btn"
                  onClick={(e) => handleCopy(caseObj, e)}
                  title="Copy algorithm"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="algo-visualizer-wrap">
                <AlgoVisualizer caseObj={caseObj} size={84} />
              </div>

              <div className="algo-info">
                <div className="algo-name-title">{caseObj.name}</div>
                <div className="algo-formula" title={caseObj.notation}>
                  {caseObj.notation}
                </div>
              </div>

              <button
                type="button"
                className="algo-practice-btn"
                onClick={(e) => handlePracticeClick(caseObj, e)}
              >
                <Play className="w-3.5 h-3.5 fill-current mr-1.5" /> Practice on Timer
              </button>
            </div>
          );
        })}
      </div>

      {/* Selected Case Detail Modal / Panel */}
      {selectedCase && (
        <div className="selected-case-panel">
          <div className="selected-case-content">
            <div className="selected-case-visual">
              <AlgoVisualizer caseObj={selectedCase} size={110} />
            </div>

            <div className="selected-case-details">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">{selectedCase.name}</h2>
                <span className="algo-badge">{selectedCase.category}</span>
              </div>

              <div className="mt-3">
                <div className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-1">
                  Algorithm
                </div>
                <div className="selected-case-notation font-mono text-base text-[var(--solve-green)] bg-[var(--bg-app)] p-2.5 rounded border border-[var(--border-subtle)]">
                  {selectedCase.notation}
                </div>
              </div>

              <div className="mt-3">
                <div className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-1">
                  Setup Scramble (from solved cube)
                </div>
                <div className="font-mono text-xs text-[var(--text-light)] bg-[var(--bg-app)] p-2 rounded border border-[var(--border-subtle)]">
                  {invertAlgorithm(selectedCase.notation)}
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  className="toolbar-btn flex items-center justify-center gap-2 flex-1"
                  onClick={() => handlePracticeClick(selectedCase)}
                >
                  <Play className="w-4 h-4 fill-current" /> Practice This Case on Timer
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setSelectedCase(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
