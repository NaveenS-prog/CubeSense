import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Play,
  RotateCcw,
  Eye,
  EyeOff,
  Copy,
  Check,
  Zap,
  BookOpen,
  HelpCircle,
  Shuffle,
  ChevronRight,
  ChevronLeft,
  Trophy,
  Star,
  ExternalLink,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { F2L_CASES } from '../data/f2lAlgorithms';
import { OLL_CASES } from '../data/ollAlgorithms';
import { PLL_CASES } from '../data/pllAlgorithms';
import AlgoVisualizer from './AlgoVisualizer';
import { invertAlgorithm } from '../utils/cubeSimulator';
import { formatTime } from '../utils/timerStats';
import {
  playStartSound,
  playStopSound,
  playPbSound,
  playReadySound,
  isSoundEnabled,
  setSoundEnabled,
} from '../utils/soundEffects';

const STORAGE_KEY_PBS = 'cubesense_algo_pbs';
const STORAGE_KEY_FAVS = 'cubesense_algo_favs';

export default function AlgoTrainer({ onSendToMainTimer }) {
  // Navigation / Modes: 'drill' | 'flashcards' | 'library'
  const [trainerMode, setTrainerMode] = useState('drill');

  // Subsets: 'f2l' | 'oll' | 'pll' | '2look-oll' | '2look-pll' | 'favorites'
  const [selectedSubset, setSelectedSubset] = useState('pll');
  const [searchQuery, setSearchQuery] = useState('');

  // Personal Bests & Favorites loaded from localStorage
  const [pbs, setPbs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY_PBS) || '{}');
    } catch {
      return {};
    }
  });

  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY_FAVS) || '[]');
    } catch {
      return [];
    }
  });

  // Active cases pool based on selected subset
  const currentCases = useMemo(() => {
    let list = [];
    if (selectedSubset === 'f2l') {
      list = F2L_CASES;
    } else if (selectedSubset === 'oll') {
      list = OLL_CASES;
    } else if (selectedSubset === 'pll') {
      list = PLL_CASES;
    } else if (selectedSubset === '2look-oll') {
      list = OLL_CASES.filter((c) => c.is2Look);
    } else if (selectedSubset === '2look-pll') {
      list = PLL_CASES.filter((c) => c.is2Look);
    } else if (selectedSubset === 'favorites') {
      const all = [...F2L_CASES, ...OLL_CASES, ...PLL_CASES];
      list = all.filter((c) => favorites.includes(c.id));
    } else {
      list = PLL_CASES;
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.notation.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
    );
  }, [selectedSubset, searchQuery, favorites]);

  // Active drill case index & selected algorithm variation index
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAlgIndex, setSelectedAlgIndex] = useState(0);
  const activeCase = currentCases[currentIndex] || currentCases[0] || null;

  // Reset variation selection when active case changes
  useEffect(() => {
    setSelectedAlgIndex(0);
  }, [activeCase?.id]);

  // Active variation object & notation
  const activeAlgObj = useMemo(() => {
    if (activeCase?.algorithms && activeCase.algorithms[selectedAlgIndex]) {
      return activeCase.algorithms[selectedAlgIndex];
    }
    return {
      name: 'Standard',
      notation: activeCase?.notation || '',
      note: '',
    };
  }, [activeCase, selectedAlgIndex]);

  const activeNotation = activeAlgObj.notation;

  // Peek algorithm toggle
  const [peekFormula, setPeekFormula] = useState(true);
  const [copied, setCopied] = useState(false);
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());

  // Stopwatch state for Drill Mode
  const [stopwatchState, setStopwatchState] = useState('idle'); // 'idle' | 'holding' | 'ready' | 'running' | 'stopped'
  const [timerDisplayMs, setTimerDisplayMs] = useState(0);
  const [sessionTimes, setSessionTimes] = useState([]);
  const [isNewPb, setIsNewPb] = useState(false);

  const startTimeRef = useRef(0);
  const holdTimeoutRef = useRef(null);
  const rafRef = useRef(null);
  const stopwatchStateRef = useRef(stopwatchState);
  stopwatchStateRef.current = stopwatchState;

  // Flashcards state
  const [flashcardOptions, setFlashcardOptions] = useState([]);
  const [flashcardSelected, setFlashcardSelected] = useState(null);
  const [flashcardScore, setFlashcardScore] = useState({ correct: 0, total: 0 });

  // Keep index in range
  useEffect(() => {
    if (currentIndex >= currentCases.length) {
      setCurrentIndex(0);
    }
  }, [currentCases.length, currentIndex]);

  // Persist PBs and Favorites
  const savePb = (caseId, timeMs) => {
    setPbs((prev) => {
      const existing = prev[caseId];
      if (!existing || timeMs < existing) {
        const next = { ...prev, [caseId]: timeMs };
        localStorage.setItem(STORAGE_KEY_PBS, JSON.stringify(next));
        return next;
      }
      return prev;
    });
  };

  const toggleFavorite = (caseId, e) => {
    e?.stopPropagation();
    setFavorites((prev) => {
      const next = prev.includes(caseId) ? prev.filter((id) => id !== caseId) : [...prev, caseId];
      localStorage.setItem(STORAGE_KEY_FAVS, JSON.stringify(next));
      return next;
    });
  };

  // Generate Setup Scramble based on currently selected algorithm variation
  const setupScramble = useMemo(() => {
    if (!activeNotation) return '';
    return invertAlgorithm(activeNotation);
  }, [activeNotation]);

  // Copy Setup / Formula
  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // fallback
    }
  };

  // Timer controls
  const startStopwatch = () => {
    playStartSound();
    const now = performance.now();
    startTimeRef.current = now;
    setStopwatchState('running');
    setIsNewPb(false);

    const updateTimer = () => {
      const elapsed = performance.now() - startTimeRef.current;
      setTimerDisplayMs(elapsed);
      rafRef.current = requestAnimationFrame(updateTimer);
    };
    rafRef.current = requestAnimationFrame(updateTimer);
  };

  const stopStopwatch = () => {
    cancelAnimationFrame(rafRef.current);
    const finalElapsed = performance.now() - startTimeRef.current;
    setTimerDisplayMs(finalElapsed);
    setStopwatchState('stopped');
    setSessionTimes((prev) => [finalElapsed, ...prev]);

    // Check PB
    if (activeCase) {
      const prevPb = pbs[activeCase.id];
      if (!prevPb || finalElapsed < prevPb) {
        setIsNewPb(true);
        savePb(activeCase.id, finalElapsed);
        playPbSound();
      } else {
        playStopSound();
      }
    }
  };

  const resetStopwatch = () => {
    cancelAnimationFrame(rafRef.current);
    clearTimeout(holdTimeoutRef.current);
    setStopwatchState('idle');
    setTimerDisplayMs(0);
    setIsNewPb(false);
  };

  // Keyboard spacebar listener for stopwatch in drill mode
  useEffect(() => {
    if (trainerMode !== 'drill') return undefined;

    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (stopwatchStateRef.current === 'running') {
          stopStopwatch();
        } else if (stopwatchStateRef.current === 'idle' || stopwatchStateRef.current === 'stopped') {
          setStopwatchState('holding');
          clearTimeout(holdTimeoutRef.current);
          holdTimeoutRef.current = setTimeout(() => {
            setStopwatchState('ready');
            playReadySound();
          }, 250);
        }
      } else if (e.code === 'KeyN' || e.code === 'ArrowRight') {
        handleNextCase();
      } else if (e.code === 'KeyP' || e.code === 'ArrowLeft') {
        handlePrevCase();
      } else if (e.code === 'KeyH') {
        setPeekFormula((v) => !v);
      }
    };

    const handleKeyUp = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (stopwatchStateRef.current === 'ready') {
          startStopwatch();
        } else if (stopwatchStateRef.current === 'holding') {
          clearTimeout(holdTimeoutRef.current);
          setStopwatchState('idle');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(rafRef.current);
      clearTimeout(holdTimeoutRef.current);
    };
  }, [trainerMode, activeCase]);

  // Flashcards setup: pick 1 correct answer and 3 random distractors
  useEffect(() => {
    if (trainerMode !== 'flashcards' || !activeCase) return;

    setFlashcardSelected(null);
    const pool = currentCases.filter((c) => c.id !== activeCase.id);
    const shuffledPool = [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
    const options = [activeCase, ...shuffledPool].sort(() => Math.random() - 0.5);
    setFlashcardOptions(options);
  }, [trainerMode, activeCase, currentCases]);

  const handleFlashcardChoice = (choice) => {
    if (flashcardSelected) return; // already answered
    setFlashcardSelected(choice);
    const isCorrect = choice.id === activeCase.id;

    if (isCorrect) {
      playReadySound();
      setFlashcardScore((prev) => ({ correct: prev.correct + 1, total: prev.total + 1 }));
    } else {
      setFlashcardScore((prev) => ({ ...prev, total: prev.total + 1 }));
    }
  };

  const handleNextCase = () => {
    resetStopwatch();
    if (currentCases.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % currentCases.length);
  };

  const handlePrevCase = () => {
    resetStopwatch();
    if (currentCases.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + currentCases.length) % currentCases.length);
  };

  const handleRandomCase = () => {
    resetStopwatch();
    if (currentCases.length <= 1) return;
    let nextIdx = Math.floor(Math.random() * currentCases.length);
    if (nextIdx === currentIndex) {
      nextIdx = (nextIdx + 1) % currentCases.length;
    }
    setCurrentIndex(nextIdx);
  };

  // Toggle audio
  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  };

  const activePb = activeCase ? pbs[activeCase.id] : null;

  return (
    <div className="algo-studio-container">
      {/* Studio Header */}
      <div className="studio-header">
        <div className="studio-title-wrap">
          <div className="flex items-center gap-3">
            <h1 className="studio-title">Algorithm Studio</h1>
            <span className="studio-badge-pro">PRO TRAINER</span>
          </div>
          <p className="studio-subtitle">
            Complete database of 41 F2L, 57 OLL, and 21 PLL algorithms with interactive drill stopwatches, inverted setup scrambles, and flashcard recognition.
          </p>
        </div>

        {/* Global Sound and Action buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`icon-btn ${soundOn ? 'active' : ''}`}
            onClick={toggleSound}
            title={soundOn ? 'Mute audio' : 'Enable audio'}
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="studio-tabs-bar">
        <div className="mode-toggle-group">
          <button
            type="button"
            className={`mode-tab-btn ${trainerMode === 'drill' ? 'active' : ''}`}
            onClick={() => setTrainerMode('drill')}
          >
            <Zap className="w-4 h-4" /> Speed Drill Mode
          </button>
          <button
            type="button"
            className={`mode-tab-btn ${trainerMode === 'flashcards' ? 'active' : ''}`}
            onClick={() => setTrainerMode('flashcards')}
          >
            <HelpCircle className="w-4 h-4" /> Flashcard Recognition
          </button>
          <button
            type="button"
            className={`mode-tab-btn ${trainerMode === 'library' ? 'active' : ''}`}
            onClick={() => setTrainerMode('library')}
          >
            <BookOpen className="w-4 h-4" /> Complete Library ({F2L_CASES.length + OLL_CASES.length + PLL_CASES.length})
          </button>
        </div>

        {/* Subset Selector Pills */}
        <div className="subset-pills-group">
          <button
            type="button"
            className={`subset-pill ${selectedSubset === 'f2l' ? 'active' : ''}`}
            onClick={() => { setSelectedSubset('f2l'); setCurrentIndex(0); }}
          >
            Full F2L (41)
          </button>
          <button
            type="button"
            className={`subset-pill ${selectedSubset === 'oll' ? 'active' : ''}`}
            onClick={() => { setSelectedSubset('oll'); setCurrentIndex(0); }}
          >
            Full OLL (57)
          </button>
          <button
            type="button"
            className={`subset-pill ${selectedSubset === 'pll' ? 'active' : ''}`}
            onClick={() => { setSelectedSubset('pll'); setCurrentIndex(0); }}
          >
            Full PLL (21)
          </button>
          <button
            type="button"
            className={`subset-pill ${selectedSubset === '2look-oll' ? 'active' : ''}`}
            onClick={() => { setSelectedSubset('2look-oll'); setCurrentIndex(0); }}
          >
            2-Look OLL (7)
          </button>
          <button
            type="button"
            className={`subset-pill ${selectedSubset === '2look-pll' ? 'active' : ''}`}
            onClick={() => { setSelectedSubset('2look-pll'); setCurrentIndex(0); }}
          >
            2-Look PLL (6)
          </button>
          <button
            type="button"
            className={`subset-pill ${selectedSubset === 'favorites' ? 'active' : ''}`}
            onClick={() => { setSelectedSubset('favorites'); setCurrentIndex(0); }}
          >
            ★ Favorites ({favorites.length})
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODE 1: SPEED DRILL MODE (Stopwatch + Setup Scramble + PB)     */}
      {/* ============================================================== */}
      {trainerMode === 'drill' && activeCase && (
        <div className="drill-hero-container">
          <div className="drill-grid">
            {/* Left Card: Case Visual, Name, and Setup Scramble */}
            <div className="drill-case-card">
              <div className="drill-card-top">
                <span className="algo-badge">{activeCase.category}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    className={`algo-icon-btn ${favorites.includes(activeCase.id) ? 'text-amber-400' : ''}`}
                    onClick={(e) => toggleFavorite(activeCase.id, e)}
                    title="Bookmark algorithm"
                  >
                    <Star className="w-4 h-4 fill-current" />
                  </button>
                  <button
                    type="button"
                    className="algo-icon-btn"
                    onClick={() => handleCopy(activeNotation)}
                    title="Copy active algorithm"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* High-res Visual Diagram */}
              <div className="drill-visual-wrap">
                <AlgoVisualizer caseObj={activeCase} size={150} />
              </div>

              <div className="flex items-center justify-between gap-2 mt-2">
                <h2 className="drill-case-title">{activeCase.name}</h2>
                {activeCase.algorithms && activeCase.algorithms.length > 1 && (
                  <span className="text-[11px] font-mono text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 px-2 py-0.5 rounded border border-[var(--accent-cyan)]/30">
                    {activeAlgObj.name}
                  </span>
                )}
              </div>
              {activeCase.description && (
                <p className="drill-case-desc">{activeCase.description}</p>
              )}

              {/* Scramble to set up the case on physical cube */}
              <div className="setup-scramble-block">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-[var(--accent-cyan)] tracking-wider uppercase">
                    Setup Scramble (Invert)
                  </span>
                  <button
                    type="button"
                    className="text-xs text-[var(--text-dim)] hover:text-white flex items-center gap-1"
                    onClick={() => handleCopy(setupScramble)}
                  >
                    <Copy className="w-3 h-3" /> Copy Scramble
                  </button>
                </div>
                <div className="setup-scramble-text">{setupScramble || '--'}</div>
                <p className="text-[11px] text-[var(--text-muted)] mt-1.5">
                  Apply on a solved cube/F2L to create this exact state.
                </p>
              </div>

              {/* Revealable Solution Formula */}
              <div className="drill-formula-block">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-[var(--text-dim)] uppercase">
                    Algorithm Formula
                  </span>
                  <button
                    type="button"
                    className="text-xs text-[var(--text-muted)] hover:text-white flex items-center gap-1"
                    onClick={() => setPeekFormula((v) => !v)}
                  >
                    {peekFormula ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {peekFormula ? 'Hide (Test Memory)' : 'Peek Formula'}
                  </button>
                </div>
                {peekFormula ? (
                  <div className="drill-formula-text">{activeNotation}</div>
                ) : (
                  <div className="drill-formula-hidden" onClick={() => setPeekFormula(true)}>
                    <span>Tap or Press &apos;H&apos; to reveal algorithm</span>
                  </div>
                )}
                {activeAlgObj.note && peekFormula && (
                  <div className="text-[11px] text-[var(--accent-cyan)] mt-1 font-mono">
                    ✦ {activeAlgObj.note}
                  </div>
                )}
                {activeCase.alternative && peekFormula && !activeCase.algorithms && (
                  <div className="text-xs text-[var(--text-dim)] mt-1 font-mono">
                    Alt: {activeCase.alternative}
                  </div>
                )}

                {/* Multiple Algorithm Variations Selector (for PLL & multi-alg cases) */}
                {activeCase.algorithms && activeCase.algorithms.length > 1 && (
                  <div className="algo-variations-selector mt-3 pt-3 border-t border-[var(--border-subtle)]">
                    <div className="flex items-center justify-between text-[11px] mb-2 font-medium">
                      <span className="text-[var(--text-secondary)] uppercase tracking-wider font-semibold">
                        Algorithm Variations ({activeCase.algorithms.length})
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        Select variation to drill
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                      {activeCase.algorithms.map((algItem, idx) => {
                        const isSelected = selectedAlgIndex === idx;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setSelectedAlgIndex(idx)}
                            className={`text-left p-2 rounded-lg border transition-all text-xs ${
                              isSelected
                                ? 'bg-[var(--accent-cyan)]/15 border-[var(--accent-cyan)] text-white shadow-sm'
                                : 'bg-[var(--bg-tertiary)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-medium)]'
                            }`}
                          >
                            <div className="flex items-center justify-between font-medium">
                              <span className={isSelected ? 'text-[var(--accent-cyan)] font-semibold' : ''}>
                                {algItem.name}
                              </span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-[var(--accent-cyan)]" />}
                            </div>
                            <div className="font-mono text-[11px] text-[var(--text-dim)] truncate mt-0.5">
                              {algItem.notation}
                            </div>
                            {algItem.note && (
                              <div className="text-[10px] text-[var(--text-muted)] italic mt-0.5">
                                {algItem.note}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Practice on Main Timer Button */}
              {onSendToMainTimer && (
                <button
                  type="button"
                  className="drill-action-btn secondary mt-3"
                  onClick={() => onSendToMainTimer({
                    ...activeCase,
                    notation: activeNotation,
                    name: activeCase.algorithms?.length > 1
                      ? `${activeCase.name} (${activeAlgObj.name})`
                      : activeCase.name,
                  })}
                >
                  <ExternalLink className="w-4 h-4 mr-2" /> Load into Main Timer
                </button>
              )}
            </div>

            {/* Right Card: Interactive Stopwatch & Performance Metrics */}
            <div className="drill-stopwatch-card">
              <div className="drill-stopwatch-header">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)]">
                  Execution Drill Timer
                </span>
                <span className="text-xs text-[var(--text-muted)]">
                  Case {currentIndex + 1} of {currentCases.length}
                </span>
              </div>

              {/* Large Stopwatch Numerals */}
              <div
                className={`drill-timer-display ${stopwatchState}`}
                onClick={() => {
                  if (stopwatchState === 'running') stopStopwatch();
                  else if (stopwatchState === 'idle' || stopwatchState === 'stopped') startStopwatch();
                }}
              >
                {formatTime(timerDisplayMs)}
              </div>

              {/* Stopwatch State Indicator / Banner */}
              <div className="drill-timer-status">
                {stopwatchState === 'idle' && (
                  <span className="text-[var(--text-dim)]">Hold Spacebar or Click to Start</span>
                )}
                {stopwatchState === 'holding' && (
                  <span className="text-rose-400 font-bold">Arming...</span>
                )}
                {stopwatchState === 'ready' && (
                  <span className="text-emerald-400 font-bold animate-pulse">READY! Release to Drill</span>
                )}
                {stopwatchState === 'running' && (
                  <span className="text-cyan-400 font-bold">EXECUTING ALGORITHM</span>
                )}
                {stopwatchState === 'stopped' && (
                  <div className="flex items-center gap-2 justify-center">
                    {isNewPb && (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-bold bg-emerald-950/60 px-3 py-1 rounded-full text-xs">
                        <Trophy className="w-3.5 h-3.5" /> NEW PERSONAL BEST!
                      </span>
                    )}
                    <button
                      type="button"
                      className="text-xs text-[var(--text-muted)] hover:text-white underline"
                      onClick={resetStopwatch}
                    >
                      Reset
                    </button>
                  </div>
                )}
              </div>

              {/* Performance Stats: PB & Session Average */}
              <div className="drill-stats-row">
                <div className="drill-stat-box">
                  <span className="drill-stat-lbl">Personal Best</span>
                  <span className="drill-stat-val text-emerald-400">
                    {activePb ? formatTime(activePb) : '--'}
                  </span>
                </div>
                <div className="drill-stat-box">
                  <span className="drill-stat-lbl">Session Reps</span>
                  <span className="drill-stat-val">{sessionTimes.length}</span>
                </div>
                <div className="drill-stat-box">
                  <span className="drill-stat-lbl">Session Avg</span>
                  <span className="drill-stat-val">
                    {sessionTimes.length > 0
                      ? formatTime(
                          sessionTimes.reduce((a, b) => a + b, 0) / sessionTimes.length
                        )
                      : '--'}
                  </span>
                </div>
              </div>

              {/* Navigation Controls: Next, Prev, Random */}
              <div className="drill-nav-controls">
                <button
                  type="button"
                  className="drill-nav-btn"
                  onClick={handlePrevCase}
                  title="Previous Case (Left Arrow)"
                >
                  <ChevronLeft className="w-5 h-5 mr-1" /> Prev
                </button>
                <button
                  type="button"
                  className="drill-nav-btn random"
                  onClick={handleRandomCase}
                  title="Random Case"
                >
                  <Shuffle className="w-4 h-4 mr-1.5" /> Shuffle
                </button>
                <button
                  type="button"
                  className="drill-nav-btn primary"
                  onClick={handleNextCase}
                  title="Next Case (Right Arrow)"
                >
                  Next <ChevronRight className="w-5 h-5 ml-1" />
                </button>
              </div>

              <div className="drill-keyboard-hint">
                <span>Space</span> Start/Stop · <span>N</span> Next Case · <span>P</span> Prev · <span>H</span> Peek Formula
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODE 2: FLASHCARD RECOGNITION MODE                             */}
      {/* ============================================================== */}
      {trainerMode === 'flashcards' && activeCase && (
        <div className="flashcard-container">
          <div className="flashcard-header">
            <div>
              <h2 className="text-xl font-bold text-white">Recognition Flashcards</h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Inspect the cube diagram and identify the correct case without looking at the algorithm.
              </p>
            </div>
            <div className="flashcard-score-badge">
              Score: {flashcardScore.correct} / {flashcardScore.total}
              {flashcardScore.total > 0 && (
                <span className="text-[var(--accent-cyan)] ml-1">
                  ({Math.round((flashcardScore.correct / flashcardScore.total) * 100)}%)
                </span>
              )}
            </div>
          </div>

          <div className="flashcard-card">
            <div className="flashcard-diagram-box">
              <AlgoVisualizer caseObj={activeCase} size={180} />
            </div>

            <p className="text-sm font-semibold text-[var(--text-light)] mb-4 text-center">
              Which algorithm or case matches this state?
            </p>

            {/* 4 Multiple Choice Options */}
            <div className="flashcard-options-grid">
              {flashcardOptions.map((opt) => {
                const isChosen = flashcardSelected?.id === opt.id;
                const isCorrect = opt.id === activeCase.id;

                let optClass = '';
                if (flashcardSelected) {
                  if (isCorrect) optClass = 'correct';
                  else if (isChosen) optClass = 'wrong';
                }

                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`flashcard-opt-btn ${optClass}`}
                    onClick={() => handleFlashcardChoice(opt)}
                  >
                    <span className="font-bold text-sm block">{opt.name}</span>
                    <span className="font-mono text-xs text-[var(--text-muted)] block mt-1 truncate">
                      {opt.notation}
                    </span>
                  </button>
                );
              })}
            </div>

            {flashcardSelected && (
              <div className="mt-5 flex justify-center">
                <button
                  type="button"
                  className="drill-nav-btn primary px-8"
                  onClick={handleNextCase}
                >
                  Next Flashcard <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODE 3: FULL ALGORITHM LIBRARY & CHEAT SHEET                   */}
      {/* ============================================================== */}
      {trainerMode === 'library' && (
        <div className="library-container">
          {/* Search bar & filter toolbar */}
          <div className="library-search-bar">
            <Search className="w-4 h-4 text-[var(--text-dim)] ml-3" />
            <input
              type="text"
              placeholder={`Search ${currentCases.length} algorithms by name, notation, or triggers...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="library-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="text-xs text-[var(--text-dim)] hover:text-white mr-3"
                onClick={() => setSearchQuery('')}
              >
                Clear
              </button>
            )}
          </div>

          {/* Cards Grid */}
          <div className="algo-grid">
            {currentCases.map((caseObj, idx) => {
              const isFav = favorites.includes(caseObj.id);
              const casePb = pbs[caseObj.id];

              return (
                <div
                  key={caseObj.id}
                  className="algo-card-enhanced"
                  onClick={() => {
                    setCurrentIndex(idx);
                    setTrainerMode('drill');
                  }}
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
                    <div className="flex items-center gap-1.5">
                      {casePb && (
                        <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-950/50 px-2 py-0.5 rounded">
                          PB {formatTime(casePb)}
                        </span>
                      )}
                      <button
                        type="button"
                        className={`algo-icon-btn ${isFav ? 'text-amber-400' : ''}`}
                        onClick={(e) => toggleFavorite(caseObj.id, e)}
                        title="Bookmark"
                      >
                        <Star className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </div>
                  </div>

                  {/* Diagram */}
                  <div className="algo-visualizer-wrap">
                    <AlgoVisualizer caseObj={caseObj} size={90} />
                  </div>

                  <div className="algo-info">
                    <h3 className="algo-name-title">{caseObj.name}</h3>
                    <div className="algo-formula">{caseObj.notation}</div>
                    {caseObj.algorithms && caseObj.algorithms.length > 1 && (
                      <div className="text-[10px] text-[var(--text-dim)] mt-1 font-mono truncate">
                        {caseObj.algorithms.map((a) => a.name).join(' · ')}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="algo-practice-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentIndex(idx);
                      setTrainerMode('drill');
                    }}
                  >
                    <Zap className="w-3.5 h-3.5 mr-1" /> Practice Case
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
