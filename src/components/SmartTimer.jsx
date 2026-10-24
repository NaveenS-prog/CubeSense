import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Copy,
  RefreshCw,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Check,
  Maximize2,
  Minimize2,
  X,
  Settings,
  Cloud,
} from 'lucide-react';
import { generateScramble, CUBE_EVENTS } from '../utils/scramble';
import { formatTime, computeStats } from '../utils/timerStats';
import {
  playWarning8s,
  playWarning12s,
  playReadySound,
  playStartSound,
  playStopSound,
  playPbSound,
  isSoundEnabled,
  setSoundEnabled,
} from '../utils/soundEffects';
import { useTimerSessions } from '../hooks/useTimerSessions';
import SolveHistoryPanel from './layout/SolveHistoryPanel';
import CubeNetVisualizer from './CubeNetVisualizer';

const INSPECTION_LIMIT_MS = 15000;
const INSPECTION_DNF_MS = 17000;
const HOLD_TO_START_MS = 300;

function SmartTimer({ session, practiceCase, onExitPractice, onOpenAuth }) {
  const {
    sessions,
    activeSession,
    activeSessionId,
    solves,
    createSession,
    switchSession,
    addSolve,
    deleteSolve,
    updatePenalty,
    clearCurrentSession,
    renameSession,
  } = useTimerSessions(session);

  // Core timer state
  const [timerStatus, setTimerStatus] = useState('idle'); // idle, inspection, holding, ready, running, stopped
  const [displayTime, setDisplayTime] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState('3x3');
  const [scramble, setScramble] = useState(() =>
    practiceCase ? practiceCase.setupScramble : generateScramble('3x3')
  );

  // Inspection states
  const [inspectionRemaining, setInspectionRemaining] = useState(INSPECTION_LIMIT_MS);
  const [inspectionElapsed, setInspectionElapsed] = useState(0);
  const [inspectionPenalty, setInspectionPenalty] = useState(null);

  // Settings & Toggles
  const [useInspection, setUseInspection] = useState(true);
  const [soundActive, setSoundActive] = useState(() => isSoundEnabled());
  const [showVisualizer, setShowVisualizer] = useState(false);
  const [showTouchpads, setShowTouchpads] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedScramble, setCopiedScramble] = useState(false);

  // Touchpad states (manual touch on screen)
  const [touchLeftDown, setTouchLeftDown] = useState(false);
  const [touchRightDown, setTouchRightDown] = useState(false);

  // Refs for high-speed performance / animation frame loops
  const timerStatusRef = useRef(timerStatus);
  const inspectionStartRef = useRef(0);
  const solveStartRef = useRef(0);
  const holdTimeoutRef = useRef(null);
  const rafRef = useRef(null);
  const scrambleRef = useRef(scramble);
  const inspectionPenaltyRef = useRef(inspectionPenalty);
  const touchpadsDownRef = useRef(false);
  const ignoreNextSpaceUpRef = useRef(false);
  const warned8sRef = useRef(false);
  const warned12sRef = useRef(false);
  const lastPbRef = useRef(null);

  useEffect(() => { timerStatusRef.current = timerStatus; }, [timerStatus]);
  useEffect(() => { scrambleRef.current = scramble; }, [scramble]);
  useEffect(() => { inspectionPenaltyRef.current = inspectionPenalty; }, [inspectionPenalty]);

  // Keep track of PB for sound celebration
  const currentStats = React.useMemo(() => computeStats(solves), [solves]);
  useEffect(() => {
    lastPbRef.current = currentStats.pb;
  }, [currentStats.pb]);

  // Practice mode updates
  useEffect(() => {
    if (practiceCase) {
      setScramble(practiceCase.setupScramble);
    }
  }, [practiceCase]);

  const clearHoldTimeout = () => {
    clearTimeout(holdTimeoutRef.current);
    holdTimeoutRef.current = null;
  };

  const stopAnimation = () => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };

  const setStatus = (status) => {
    timerStatusRef.current = status;
    setTimerStatus(status);
  };

  const setPenalty = (penalty) => {
    inspectionPenaltyRef.current = penalty;
    setInspectionPenalty(penalty);
  };

  const recordSolve = (record) => {
    try {
      const isPb = lastPbRef.current !== null && record.finalTime !== null && record.finalTime < lastPbRef.current;
      addSolve({
        event: selectedEvent,
        ...record,
        date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });

      if (isPb) {
        setTimeout(() => {
          try {
            playPbSound();
          } catch (e) {
            console.warn('PB sound error:', e);
          }
        }, 200);
      }
    } catch (err) {
      console.error('Error recording solve:', err);
    }
  };

  const nextScramble = useCallback((event = selectedEvent) => {
    if (practiceCase) {
      return practiceCase.setupScramble;
    }
    return generateScramble(event);
  }, [selectedEvent, practiceCase]);

  // 1. Start Inspection (or direct hold if inspection disabled)
  const startInspection = () => {
    clearHoldTimeout();
    stopAnimation();

    if (!useInspection) {
      // Direct timer start mode
      setStatus('ready');
      return;
    }

    const startedAt = performance.now();
    inspectionStartRef.current = startedAt;
    warned8sRef.current = false;
    warned12sRef.current = false;
    setPenalty(null);
    setInspectionElapsed(0);
    setInspectionRemaining(INSPECTION_LIMIT_MS);
    setDisplayTime(0);
    setStatus('inspection');

    const tickInspection = () => {
      const elapsed = performance.now() - inspectionStartRef.current;
      const remaining = Math.max(0, INSPECTION_LIMIT_MS - elapsed);
      setInspectionElapsed(elapsed);
      setInspectionRemaining(remaining);

      // WCA Sound Cues
      if (elapsed >= 8000 && !warned8sRef.current) {
        warned8sRef.current = true;
        playWarning8s();
      }
      if (elapsed >= 12000 && !warned12sRef.current) {
        warned12sRef.current = true;
        playWarning12s();
      }

      if (elapsed >= INSPECTION_DNF_MS) {
        stopAnimation();
        setPenalty('DNF');
        setStatus('stopped');
        playStopSound();
        recordSolve({
          type: 'solve',
          event: selectedEvent,
          penalty: 'DNF',
          time: null,
          finalTime: null,
          scramble: scrambleRef.current,
        });
        setScramble(nextScramble());
        return;
      }

      rafRef.current = requestAnimationFrame(tickInspection);
    };

    rafRef.current = requestAnimationFrame(tickInspection);
  };

  // 2. Begin Hold To Start (Hands down on pads or Space held)
  const beginHoldToStart = () => {
    const status = timerStatusRef.current;
    if (status !== 'inspection' && status !== 'idle' && status !== 'stopped') return;

    clearHoldTimeout();
    setStatus('holding');

    holdTimeoutRef.current = setTimeout(() => {
      if (timerStatusRef.current === 'holding') {
        if (useInspection && inspectionStartRef.current > 0) {
          const elapsed = performance.now() - inspectionStartRef.current;
          setPenalty(elapsed > INSPECTION_LIMIT_MS ? '+2' : null);
        }
        setStatus('ready');
        playReadySound();
      }
    }, HOLD_TO_START_MS);
  };

  const abortHoldToStart = () => {
    clearHoldTimeout();
    if (timerStatusRef.current === 'holding') {
      setStatus(useInspection && inspectionStartRef.current > 0 ? 'inspection' : 'idle');
    }
  };

  // 3. Start Solve (Hands lifted or Space released when ready)
  const startSolve = () => {
    if (timerStatusRef.current !== 'ready') return;
    clearHoldTimeout();
    stopAnimation();

    if (useInspection && inspectionStartRef.current > 0) {
      const inspectionTime = performance.now() - inspectionStartRef.current;
      setPenalty(inspectionTime > INSPECTION_LIMIT_MS ? '+2' : null);
    }

    solveStartRef.current = performance.now();
    setDisplayTime(0);
    setStatus('running');
    playStartSound();

    const tickSolve = () => {
      setDisplayTime(performance.now() - solveStartRef.current);
      rafRef.current = requestAnimationFrame(tickSolve);
    };

    rafRef.current = requestAnimationFrame(tickSolve);
  };

  // 4. Stop Solve (Hands back on pads or Any key pressed)
  const stopSolve = () => {
    try {
      if (timerStatusRef.current !== 'running') return;
      const endTime = performance.now();
      const rawTime = endTime - solveStartRef.current;
      const finalTime = rawTime + (inspectionPenaltyRef.current === '+2' ? 2000 : 0);

      stopAnimation();
      setDisplayTime(rawTime);
      setStatus('stopped');
      try {
        playStopSound();
      } catch (e) {
        console.warn('Stop sound error:', e);
      }

      recordSolve({
        type: 'solve',
        event: selectedEvent,
        penalty: inspectionPenaltyRef.current,
        time: rawTime,
        finalTime,
        scramble: scrambleRef.current,
      });
      setScramble(nextScramble());
    } catch (err) {
      console.error('Error in stopSolve:', err);
      setStatus('stopped');
    }
  };

  const resetScramble = () => {
    clearHoldTimeout();
    stopAnimation();
    setStatus('idle');
    setDisplayTime(0);
    setInspectionElapsed(0);
    setInspectionRemaining(INSPECTION_LIMIT_MS);
    setPenalty(null);
    setScramble(nextScramble());
  };

  const hardStop = () => {
    if (timerStatusRef.current === 'idle') return;
    clearHoldTimeout();
    stopAnimation();
    touchpadsDownRef.current = false;
    setDisplayTime(0);
    setInspectionElapsed(0);
    setInspectionRemaining(INSPECTION_LIMIT_MS);
    setPenalty(null);
    setStatus('idle');
  };

  const copyScramble = async () => {
    try {
      await navigator.clipboard.writeText(scramble);
      setCopiedScramble(true);
      setTimeout(() => setCopiedScramble(false), 1500);
    } catch {
      // clipboard fallback
    }
  };

  const handleEventChange = (e) => {
    const ev = e.target.value;
    setSelectedEvent(ev);
    setScramble(generateScramble(ev));
  };

  const toggleSound = () => {
    const next = !soundActive;
    setSoundActive(next);
    setSoundEnabled(next);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Keyboard controls
  useEffect(() => {
    const isTypingTarget = (target) => {
      const tag = target?.tagName?.toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select';
    };

    const handleKeyDown = (e) => {
      if (e.repeat) return;
      if (isTypingTarget(e.target)) return;

      if (e.code === 'Escape') {
        if (timerStatusRef.current !== 'idle') {
          e.preventDefault();
          hardStop();
        }
        return;
      }

      if (timerStatusRef.current === 'running') {
        e.preventDefault();
        if (e.code === 'Space') ignoreNextSpaceUpRef.current = true;
        stopSolve();
        return;
      }

      if (e.code !== 'Space') return;
      e.preventDefault();

      if (timerStatusRef.current === 'inspection') {
        beginHoldToStart();
      } else if (!useInspection && (timerStatusRef.current === 'idle' || timerStatusRef.current === 'stopped')) {
        beginHoldToStart();
      }
    };

    const handleKeyUp = (e) => {
      if (e.code !== 'Space') return;
      e.preventDefault();

      if (ignoreNextSpaceUpRef.current) {
        ignoreNextSpaceUpRef.current = false;
        return;
      }

      if (useInspection && (timerStatusRef.current === 'idle' || timerStatusRef.current === 'stopped')) {
        startInspection();
        return;
      }

      if (timerStatusRef.current === 'holding') {
        abortHoldToStart();
        return;
      }

      if (timerStatusRef.current === 'ready') {
        startSolve();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      clearHoldTimeout();
      stopAnimation();
    };
  }, [useInspection]);

  // Touchpad event handlers
  useEffect(() => {
    const bothPadsTouched = touchLeftDown && touchRightDown;
    const wasTouched = touchpadsDownRef.current;

    if (showTouchpads) {
      touchpadsDownRef.current = bothPadsTouched;

      if (!wasTouched && bothPadsTouched) {
        if (timerStatusRef.current === 'inspection' || (!useInspection && (timerStatusRef.current === 'idle' || timerStatusRef.current === 'stopped'))) {
          beginHoldToStart();
        }
      } else if (wasTouched && !bothPadsTouched && timerStatusRef.current === 'holding') {
        abortHoldToStart();
      } else if (wasTouched && !bothPadsTouched && timerStatusRef.current === 'ready') {
        startSolve();
      } else if (!wasTouched && bothPadsTouched && timerStatusRef.current === 'running') {
        stopSolve();
      }
    }
  }, [touchLeftDown, touchRightDown, showTouchpads, useInspection]);

  // Display time formatting
  const displayLabel = () => {
    if (timerStatus === 'inspection' || timerStatus === 'holding' || timerStatus === 'ready') {
      return `${Math.ceil(inspectionRemaining / 1000)}`;
    }
    if (timerStatus === 'stopped' && solves?.[0]?.penalty === 'DNF') return 'DNF';
    if (timerStatus === 'idle') return '0.00';
    return formatTime(displayTime);
  };

  const statusClass =
    timerStatus === 'holding'
      ? 'holding'
      : timerStatus === 'ready'
      ? 'ready'
      : timerStatus === 'running'
      ? 'running'
      : timerStatus === 'inspection'
      ? 'inspection'
      : 'stopped';

  const statusText = {
    idle: useInspection ? 'Press space to start inspection' : 'Hold space to arm timer',
    inspection: 'Inspection on · Place hands on pads or hold space · Esc to cancel',
    holding: 'Hold steady… (300ms) · Esc to cancel',
    ready: 'Release to start solving!',
    running: 'Solving · Any key or hands on pads to stop',
    stopped: 'Solve complete · Press space for next solve',
  }[timerStatus];

  const warningText =
    inspectionElapsed >= 12000
      ? '12 seconds!'
      : inspectionElapsed >= 8000
      ? '8 seconds!'
      : '';

  return (
    <div className={`timer-layout ${isFullscreen ? 'fullscreen-mode' : ''}`}>
      <div className="timer-main">
        {/* Top Toolbar */}
        <div className="timer-toolbar">
          <select
            className="toolbar-select"
            value={selectedEvent}
            onChange={handleEventChange}
            disabled={timerStatus === 'running' || practiceCase !== null}
          >
            {CUBE_EVENTS.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>

          <div className="session-controls">
            <select
              className="toolbar-select session-select"
              value={activeSessionId || ''}
              onChange={(e) => switchSession(e.target.value)}
              disabled={timerStatus === 'running'}
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <button
              type="button"
              className="toolbar-btn"
              onClick={createSession}
              disabled={timerStatus === 'running'}
            >
              + Session
            </button>

            {onOpenAuth && (
              <button
                type="button"
                className={`toolbar-btn flex items-center gap-1.5 ${
                  session?.user
                    ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                    : 'text-[var(--text-secondary)] hover:text-white'
                }`}
                onClick={onOpenAuth}
                title={
                  session?.user
                    ? `Cloud Sync Active (${session.user.email})`
                    : 'Sign In to sync solves with Supabase cloud'
                }
              >
                <Cloud
                  className={`w-3.5 h-3.5 ${
                    session?.user ? 'text-emerald-400' : 'text-[var(--text-muted)]'
                  }`}
                />
                <span className="text-[11px] font-medium hidden sm:inline">
                  {session?.user ? 'Synced' : 'Cloud Sync'}
                </span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <button
              type="button"
              className={`icon-btn ${soundActive ? 'active' : ''}`}
              onClick={toggleSound}
              title={soundActive ? 'Mute sound effects' : 'Enable sound effects'}
            >
              {soundActive ? <Volume2 className="w-4 h-4 text-white" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              type="button"
              className={`icon-btn ${showVisualizer ? 'active' : ''}`}
              onClick={() => setShowVisualizer((v) => !v)}
              title="Toggle 2D Scramble Net Visualizer"
            >
              {showVisualizer ? <EyeOff className="w-4 h-4 text-white" /> : <Eye className="w-4 h-4" />}
            </button>

            <button
              type="button"
              className="icon-btn"
              onClick={toggleFullscreen}
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Practice Mode Banner */}
        {practiceCase && (
          <div className="practice-banner">
            <div className="practice-info">
              <span className="practice-tag">Practice Mode</span>
              <span className="font-semibold text-white">{practiceCase.name}</span>
              <span className="text-xs text-[var(--text-secondary)] font-mono">({practiceCase.notation})</span>
            </div>
            {onExitPractice && (
              <button type="button" className="practice-exit-btn" onClick={onExitPractice}>
                <X className="w-3.5 h-3.5 mr-1" /> Exit
              </button>
            )}
          </div>
        )}

        {/* Scramble Display Block */}
        <div className="scramble-block">
          <div className="scramble scramble-large">{scramble}</div>
          <div className="scramble-actions">
            <button
              type="button"
              className="icon-btn"
              onClick={copyScramble}
              title="Copy scramble"
            >
              {copiedScramble ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={resetScramble}
              disabled={timerStatus === 'running'}
              title="New scramble"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Collapsible 2D Unfolded Scramble Net */}
          {showVisualizer && (
            <div className="scramble-visualizer-box">
              <CubeNetVisualizer scramble={scramble} event={selectedEvent} size={180} />
            </div>
          )}
        </div>

        {/* Center Timer Display */}
        <div className="timer-center">
          <div className={`timer-display-large ${statusClass}`}>{displayLabel()}</div>
          <div className="timer-status-text">{statusText}</div>
          {warningText && (timerStatus === 'inspection' || timerStatus === 'holding' || timerStatus === 'ready') && (
            <div className="timer-warning text-red-400 font-semibold">{warningText}</div>
          )}
          {inspectionPenalty === '+2' && (
            <div className="timer-warning text-amber-400 font-semibold">+2 inspection penalty applied</div>
          )}
        </div>

        {/* On-Screen Touchpads (For Mobile / Touchscreen or Visual Mouse Cubing) */}
        {showTouchpads && (
          <div className="onscreen-touchpads">
            <div
              className={`touchpad-zone left ${touchLeftDown ? 'active' : ''}`}
              onPointerDown={() => setTouchLeftDown(true)}
              onPointerUp={() => setTouchLeftDown(false)}
              onPointerLeave={() => setTouchLeftDown(false)}
            >
              <span>LEFT PAD</span>
            </div>
            <div
              className={`touchpad-zone right ${touchRightDown ? 'active' : ''}`}
              onPointerDown={() => setTouchRightDown(true)}
              onPointerUp={() => setTouchRightDown(false)}
              onPointerLeave={() => setTouchRightDown(false)}
            >
              <span>RIGHT PAD</span>
            </div>
          </div>
        )}

        <div className="timer-footer-hints">
          <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={useInspection}
                onChange={(e) => setUseInspection(e.target.checked)}
                className="rounded accent-[var(--accent-blue)]"
              />
              <span>15s WCA Inspection</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showTouchpads}
                onChange={(e) => setShowTouchpads(e.target.checked)}
                className="rounded accent-[var(--accent-blue)]"
              />
              <span>On-Screen Touchpads</span>
            </label>
          </div>
          <p className="timer-hint mt-2">
            Space: inspect → hold (300ms) → release to start → any key to stop · Esc: cancel
          </p>
        </div>
      </div>

      {/* Right Sidebar: Session History and WCA Analytics */}
      <SolveHistoryPanel
        solves={solves}
        onDelete={deleteSolve}
        onApplyPenalty={updatePenalty}
        onLoadScramble={(scrambleToLoad) => setScramble(scrambleToLoad)}
        onClearSession={clearCurrentSession}
      />
    </div>
  );
}

export default SmartTimer;
