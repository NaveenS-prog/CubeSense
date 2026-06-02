import React, { useRef, useState, useEffect } from 'react';
import { Copy, RefreshCw, Video } from 'lucide-react';
import { generateScramble } from '../utils/scramble';
import { formatTime } from '../utils/timerStats';
import { areBothHandsDown, startHandCamera } from '../lib/mediapipeHands';
import { useTimerSessions } from '../hooks/useTimerSessions';
import SolveHistoryPanel from './layout/SolveHistoryPanel';

const INSPECTION_LIMIT_MS = 15000;
const INSPECTION_DNF_MS = 17000;
const HOLD_TO_START_MS = 300;

function SmartTimer({ session }) {
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
  } = useTimerSessions(session);

  const [timerStatus, setTimerStatus] = useState('idle');
  const [displayTime, setDisplayTime] = useState(0);
  const [inspectionRemaining, setInspectionRemaining] = useState(INSPECTION_LIMIT_MS);
  const [inspectionElapsed, setInspectionElapsed] = useState(0);
  const [inspectionPenalty, setInspectionPenalty] = useState(null);
  const [scramble, setScramble] = useState(generateScramble());
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [cameraMessage, setCameraMessage] = useState('');
  const [handsDetected, setHandsDetected] = useState(0);
  const [showCamera, setShowCamera] = useState(false);

  const videoRef = useRef(null);
  const stopCameraRef = useRef(null);
  const timerStatusRef = useRef(timerStatus);
  const inspectionStartRef = useRef(0);
  const solveStartRef = useRef(0);
  const holdTimeoutRef = useRef(null);
  const rafRef = useRef(null);
  const scrambleRef = useRef(scramble);
  const inspectionPenaltyRef = useRef(inspectionPenalty);
  const handsDownRef = useRef(false);
  const ignoreNextSpaceUpRef = useRef(false);
  const lastHandUiUpdateRef = useRef(0);

  useEffect(() => { timerStatusRef.current = timerStatus; }, [timerStatus]);
  useEffect(() => { scrambleRef.current = scramble; }, [scramble]);
  useEffect(() => { inspectionPenaltyRef.current = inspectionPenalty; }, [inspectionPenalty]);

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
    addSolve({
      ...record,
      date: new Date().toLocaleTimeString(),
    });
  };

  const startInspection = () => {
    clearHoldTimeout();
    stopAnimation();
    const startedAt = performance.now();
    inspectionStartRef.current = startedAt;
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

      if (elapsed >= INSPECTION_DNF_MS) {
        stopAnimation();
        setPenalty('DNF');
        setStatus('stopped');
        recordSolve({
          type: 'solve',
          penalty: 'DNF',
          time: null,
          finalTime: null,
          scramble: scrambleRef.current,
        });
        setScramble(generateScramble());
        return;
      }

      rafRef.current = requestAnimationFrame(tickInspection);
    };

    rafRef.current = requestAnimationFrame(tickInspection);
  };

  const beginHoldToStart = () => {
    if (timerStatusRef.current !== 'inspection') return;
    clearHoldTimeout();
    setStatus('holding');

    holdTimeoutRef.current = setTimeout(() => {
      if (timerStatusRef.current === 'holding') {
        const elapsed = performance.now() - inspectionStartRef.current;
        setPenalty(elapsed > INSPECTION_LIMIT_MS ? '+2' : null);
        setStatus('ready');
      }
    }, HOLD_TO_START_MS);
  };

  const abortHoldToStart = () => {
    clearHoldTimeout();
    if (timerStatusRef.current === 'holding') {
      setStatus('inspection');
    }
  };

  const startSolve = () => {
    if (timerStatusRef.current !== 'ready') return;
    clearHoldTimeout();
    stopAnimation();

    const inspectionTime = performance.now() - inspectionStartRef.current;
    const penalty = inspectionTime > INSPECTION_LIMIT_MS ? '+2' : null;
    setPenalty(penalty);
    solveStartRef.current = performance.now();
    setDisplayTime(0);
    setStatus('running');

    const tickSolve = () => {
      setDisplayTime(performance.now() - solveStartRef.current);
      rafRef.current = requestAnimationFrame(tickSolve);
    };

    rafRef.current = requestAnimationFrame(tickSolve);
  };

  const stopSolve = () => {
    if (timerStatusRef.current !== 'running') return;
    const endTime = performance.now();
    const rawTime = endTime - solveStartRef.current;
    const finalTime = rawTime + (inspectionPenaltyRef.current === '+2' ? 2000 : 0);

    stopAnimation();
    setDisplayTime(rawTime);
    setStatus('stopped');
    recordSolve({
      type: 'solve',
      penalty: inspectionPenaltyRef.current,
      time: rawTime,
      finalTime,
      scramble: scrambleRef.current,
    });
    setScramble(generateScramble());
  };

  const resetScramble = () => {
    clearHoldTimeout();
    stopAnimation();
    setStatus('idle');
    setDisplayTime(0);
    setInspectionElapsed(0);
    setInspectionRemaining(INSPECTION_LIMIT_MS);
    setPenalty(null);
    setScramble(generateScramble());
  };

  /** Cancel inspection or discard an in-progress solve without logging. */
  const hardStop = () => {
    const status = timerStatusRef.current;
    if (status === 'idle') return;

    clearHoldTimeout();
    stopAnimation();
    handsDownRef.current = false;
    setDisplayTime(0);
    setInspectionElapsed(0);
    setInspectionRemaining(INSPECTION_LIMIT_MS);
    setPenalty(null);
    setStatus('idle');
  };

  const copyScramble = async () => {
    try {
      await navigator.clipboard.writeText(scramble);
    } catch {
      // clipboard unavailable
    }
  };

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
      if (timerStatusRef.current === 'inspection') beginHoldToStart();
    };

    const handleKeyUp = (e) => {
      if (e.code !== 'Space') return;
      e.preventDefault();

      if (ignoreNextSpaceUpRef.current) {
        ignoreNextSpaceUpRef.current = false;
        return;
      }

      if (timerStatusRef.current === 'idle' || timerStatusRef.current === 'stopped') {
        startInspection();
        return;
      }

      if (timerStatusRef.current === 'holding') {
        abortHoldToStart();
        return;
      }

      if (timerStatusRef.current === 'ready') startSolve();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      clearHoldTimeout();
      stopAnimation();
    };
  }, []);

  const handleHandResults = (results) => {
    const count = results.multiHandLandmarks?.length ?? 0;
    const now = performance.now();
    if (now - lastHandUiUpdateRef.current > 200) {
      lastHandUiUpdateRef.current = now;
      setHandsDetected(count);
    }

    const bothHandsDown = areBothHandsDown(results);
    const wasHandsDown = handsDownRef.current;
    handsDownRef.current = bothHandsDown;

    if (!wasHandsDown && bothHandsDown && (timerStatusRef.current === 'inspection' || timerStatusRef.current === 'idle' || timerStatusRef.current === 'stopped')) {
      if (timerStatusRef.current === 'idle' || timerStatusRef.current === 'stopped') {
        startInspection();
      }
      beginHoldToStart();
    } else if (wasHandsDown && !bothHandsDown && timerStatusRef.current === 'holding') {
      abortHoldToStart();
    } else if (wasHandsDown && !bothHandsDown && timerStatusRef.current === 'ready') {
      startSolve();
    } else if (!wasHandsDown && bothHandsDown && timerStatusRef.current === 'running') {
      stopSolve();
    }
  };

  const enableCamera = () => {
    if (isCameraLoading || isCameraReady) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraMessage('Camera not available. Use spacebar.');
      return;
    }

    setIsCameraLoading(true);
    setShowCamera(true);
  };

  useEffect(() => {
    if (!showCamera) return undefined;

    let isMounted = true;
    const initCamera = async () => {
      const video = videoRef.current;
      if (!video) return;

      try {
        stopCameraRef.current?.();
        stopCameraRef.current = await startHandCamera(video, handleHandResults);
        if (isMounted) {
          setIsCameraReady(true);
          setCameraMessage('Camera active — both hands in frame to arm/start/stop.');
        }
      } catch (err) {
        if (isMounted) {
          setIsCameraReady(false);
          setCameraMessage(err?.message || 'Camera failed. Allow access and retry.');
        }
      } finally {
        if (isMounted) {
          setIsCameraLoading(false);
        }
      }
    };

    const t = setTimeout(initCamera, 50);

    return () => {
      isMounted = false;
      clearTimeout(t);
    };
  }, [showCamera]);

  useEffect(() => () => {
    stopCameraRef.current?.();
    stopCameraRef.current = null;
  }, []);

  const displayLabel = () => {
    if (timerStatus === 'inspection' || timerStatus === 'holding' || timerStatus === 'ready') {
      return `${Math.ceil(inspectionRemaining / 1000)}`;
    }
    if (timerStatus === 'stopped' && solves[0]?.penalty === 'DNF') return 'DNF';
    if (timerStatus === 'idle') return '0.00';
    return formatTime(displayTime).slice(3);
  };

  const statusClass = timerStatus === 'holding'
    ? 'holding'
    : timerStatus === 'ready'
      ? 'ready'
      : timerStatus === 'running'
        ? 'running'
        : timerStatus === 'inspection'
          ? 'inspection'
          : 'stopped';

  const statusText = {
    idle: 'Press space to start inspection',
    inspection: 'Inspection on · Esc to cancel',
    holding: 'Hold steady… · Esc to cancel',
    ready: 'Release to start · Esc to cancel',
    running: 'Solving · Esc to discard',
    stopped: 'Press space for next solve',
  }[timerStatus];

  const warningText = inspectionElapsed >= 12000
    ? '12 seconds'
    : inspectionElapsed >= 8000
      ? '8 seconds'
      : '';

  return (
    <div className="timer-layout">
      <div className="timer-main">
        <div className="timer-toolbar">
          <select className="toolbar-select" defaultValue="3x3" disabled>
            <option value="3x3">3x3</option>
          </select>

          <div className="session-controls">
            <select
              className="toolbar-select session-select"
              value={activeSessionId || ''}
              onChange={(e) => switchSession(e.target.value)}
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <button type="button" className="toolbar-btn" onClick={createSession}>
              + New Session
            </button>
          </div>
        </div>

        <div className="scramble-block">
          <div className="scramble scramble-large">{scramble}</div>
          <div className="scramble-actions">
            <button type="button" className="icon-btn" onClick={copyScramble} title="Copy scramble">
              <Copy className="w-4 h-4" />
            </button>
            <button type="button" className="icon-btn" onClick={resetScramble} title="New scramble">
              <RefreshCw className="w-4 h-4" />
            </button>
            {!isCameraReady && (
              <button
                type="button"
                className="icon-btn"
                onClick={enableCamera}
                disabled={isCameraLoading}
                title="Enable camera"
              >
                <Video className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="timer-center">
          <div className={`timer-display-large ${statusClass}`}>{displayLabel()}</div>
          <div className="timer-status-text">{statusText}</div>
          {warningText && (timerStatus === 'inspection' || timerStatus === 'holding' || timerStatus === 'ready') && (
            <div className="timer-warning">{warningText}</div>
          )}
          {inspectionPenalty === '+2' && (
            <div className="timer-warning">+2 inspection penalty</div>
          )}
        </div>

        {showCamera && (
          <div className="camera-block">
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="camera-video"
              />
              {isCameraReady && (
                <div className="camera-badge">
                  Hands: {handsDetected}/2
                </div>
              )}
            </div>
            {cameraMessage && <p className="camera-hint">{cameraMessage}</p>}
          </div>
        )}

        <p className="timer-hint">
          Space: inspect → hold → release to start → any key to stop · Esc: cancel / discard
          {activeSession ? ` · ${activeSession.name}` : ''}
        </p>
      </div>

      <SolveHistoryPanel
        solves={solves}
        onDelete={deleteSolve}
        onApplyPenalty={updatePenalty}
      />
    </div>
  );
}

export default SmartTimer;
