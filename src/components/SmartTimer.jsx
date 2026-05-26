import React, { useMemo, useRef, useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { generateScramble } from '../utils/scramble';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';

const INSPECTION_LIMIT_MS = 15000;
const INSPECTION_DNF_MS = 17000;
const HOLD_TO_START_MS = 300;

function SmartTimer({ session }) {
  const [timerStatus, setTimerStatus] = useState('idle');
  const [displayTime, setDisplayTime] = useState(0);
  const [inspectionRemaining, setInspectionRemaining] = useState(INSPECTION_LIMIT_MS);
  const [inspectionElapsed, setInspectionElapsed] = useState(0);
  const [inspectionPenalty, setInspectionPenalty] = useState(null);
  const [scramble, setScramble] = useState(generateScramble());
  const [history, setHistory] = useState([]);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraMessage, setCameraMessage] = useState('Starting camera...');
  const [handsData, setHandsData] = useState(null);

  const videoRef = useRef(null);
  const handsRef = useRef(null);
  const timerStatusRef = useRef(timerStatus);
  const inspectionStartRef = useRef(0);
  const solveStartRef = useRef(0);
  const holdTimeoutRef = useRef(null);
  const rafRef = useRef(null);
  const scrambleRef = useRef(scramble);
  const inspectionPenaltyRef = useRef(inspectionPenalty);
  const handsDownRef = useRef(false);
  const ignoreNextSpaceUpRef = useRef(false);
  const userId = session?.user?.id;
  const userIdRef = useRef(userId);

  useEffect(() => {
    timerStatusRef.current = timerStatus;
  }, [timerStatus]);

  useEffect(() => {
    scrambleRef.current = scramble;
  }, [scramble]);

  useEffect(() => {
    inspectionPenaltyRef.current = inspectionPenalty;
  }, [inspectionPenalty]);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  const formatTime = (ms) => {
    if (!Number.isFinite(ms)) return 'DNF';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    const hundredths = String(Math.floor((ms % 1000) / 10)).padStart(2, '0');
    return `${minutes}:${seconds}.${hundredths}`;
  };

  const formatSolve = (record) => {
    if (record.penalty === 'DNF') return 'DNF';
    return `${formatTime(record.finalTime)}${record.penalty === '+2' ? ' +2' : ''}`;
  };

  const averageOf = (records, count) => {
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
  };

  const stats = useMemo(() => ({
    ao5: averageOf(history, 5),
    ao12: averageOf(history, 12),
  }), [history]);

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

  const dbRowToRecord = (row) => ({
    id: row.id,
    type: row.type,
    penalty: row.penalty,
    time: row.raw_time_ms,
    finalTime: row.final_time_ms,
    scramble: row.scramble,
    date: new Date(row.solved_at).toLocaleTimeString(),
    solvedAt: row.solved_at,
  });

  const saveRecordToCloud = async (record) => {
    if (!isSupabaseConfigured || !userIdRef.current) return;

    const { data, error } = await supabase
      .from('solves')
      .insert({
        user_id: userIdRef.current,
        type: record.type,
        raw_time_ms: Number.isFinite(record.time) ? Math.round(record.time) : null,
        final_time_ms: Number.isFinite(record.finalTime) ? Math.round(record.finalTime) : null,
        penalty: record.penalty,
        scramble: record.scramble,
        solved_at: record.solvedAt,
      })
      .select()
      .single();

    if (error) {
      console.warn('Unable to save solve:', error);
      return;
    }

    setHistory((prev) => [
      dbRowToRecord(data),
      ...prev.filter((item) => item.localId !== record.localId),
    ].slice(0, 20));
  };

  const addRecord = (record) => {
    const recordWithMeta = {
      ...record,
      localId: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      solvedAt: new Date().toISOString(),
    };

    setHistory((prev) => [recordWithMeta, ...prev.slice(0, 19)]);
    saveRecordToCloud(recordWithMeta);
  };

  useEffect(() => {
    if (!isSupabaseConfigured || !userId) {
      setHistory([]);
      return;
    }

    let isMounted = true;

    const loadSolves = async () => {
      const { data, error } = await supabase
        .from('solves')
        .select('id, type, raw_time_ms, final_time_ms, penalty, scramble, solved_at')
        .eq('user_id', userId)
        .order('solved_at', { ascending: false })
        .limit(20);

      if (!isMounted) return;

      if (error) {
        console.warn('Unable to load solves:', error);
        return;
      }

      setHistory(data.map(dbRowToRecord));
    };

    loadSolves();

    return () => {
      isMounted = false;
    };
  }, [userId]);

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
        addRecord({
          type: 'solve',
          penalty: 'DNF',
          time: null,
          finalTime: null,
          scramble: scrambleRef.current,
          date: new Date().toLocaleTimeString(),
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
    addRecord({
      type: 'solve',
      penalty: inspectionPenaltyRef.current,
      time: rawTime,
      finalTime,
      scramble: scrambleRef.current,
      date: new Date().toLocaleTimeString(),
    });
    setScramble(generateScramble());
  };

  const resetTimer = () => {
    clearHoldTimeout();
    stopAnimation();
    setStatus('idle');
    setDisplayTime(0);
    setInspectionElapsed(0);
    setInspectionRemaining(INSPECTION_LIMIT_MS);
    setPenalty(null);
    setScramble(generateScramble());
  };

  const clearSession = async () => {
    setHistory([]);

    if (!isSupabaseConfigured || !userIdRef.current) return;

    const { error } = await supabase
      .from('solves')
      .delete()
      .eq('user_id', userIdRef.current);

    if (error) {
      console.warn('Unable to clear solves:', error);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.repeat) return;

      if (timerStatusRef.current === 'running') {
        e.preventDefault();
        if (e.code === 'Space') {
          ignoreNextSpaceUpRef.current = true;
        }
        stopSolve();
        return;
      }

      if (e.code !== 'Space') return;
      e.preventDefault();

      if (timerStatusRef.current === 'inspection') {
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

      if (timerStatusRef.current === 'idle' || timerStatusRef.current === 'stopped') {
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
  }, []);

  useEffect(() => {
    let animationFrameId;
    let stream;
    let isMounted = true;

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraMessage('Camera not available in this browser. Use spacebar fallback.');
      return undefined;
    }

    if (!window.Hands) {
      setCameraMessage('Hand detection library did not load. Use spacebar fallback.');
      return undefined;
    }

    const hands = new window.Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });
    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    hands.onResults(onResults);
    handsRef.current = hands;

    const processFrame = async () => {
      if (!isMounted || !videoRef.current || !handsRef.current) return;

      if (videoRef.current.readyState >= 2) {
        await handsRef.current.send({ image: videoRef.current });
      }

      animationFrameId = requestAnimationFrame(processFrame);
    };

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoRef.current.srcObject = stream;
        setIsCameraReady(true);
        setCameraMessage('Camera ready. Tap space for inspection, or use hands after inspection starts.');
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          processFrame();
        };
      } catch (err) {
        console.warn('Failed to access webcam:', err);
        setIsCameraReady(false);
        setCameraMessage('Camera not available. Use spacebar fallback.');
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      cancelAnimationFrame(animationFrameId);
      handsRef.current?.close();
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const onResults = (results) => {
    setHandsData(results);
    const bothHandsFlat = isHandFlat(results, 'left') && isHandFlat(results, 'right');
    const wasHandsDown = handsDownRef.current;
    handsDownRef.current = bothHandsFlat;

    if (!wasHandsDown && bothHandsFlat && timerStatusRef.current === 'inspection') {
      beginHoldToStart();
    } else if (wasHandsDown && !bothHandsFlat && timerStatusRef.current === 'holding') {
      abortHoldToStart();
    } else if (wasHandsDown && !bothHandsFlat && timerStatusRef.current === 'ready') {
      startSolve();
    } else if (!wasHandsDown && bothHandsFlat && timerStatusRef.current === 'running') {
      stopSolve();
    }
  };

  const isHandFlat = (results, handedness) => {
    if (!results.multiHandLandmarks || !results.multiHandedness) return false;

    return results.multiHandedness.some((hand) => hand.label?.toLowerCase() === handedness);
  };

  const displayLabel = () => {
    if (timerStatus === 'inspection' || timerStatus === 'holding' || timerStatus === 'ready') {
      return `${Math.ceil(inspectionRemaining / 1000)}`;
    }

    if (timerStatus === 'stopped' && history[0]?.penalty === 'DNF') {
      return 'DNF';
    }

    return formatTime(displayTime);
  };

  const statusClass = timerStatus === 'holding'
    ? 'holding'
    : timerStatus === 'ready'
      ? 'ready'
      : timerStatus === 'running'
        ? 'running'
        : 'stopped';

  const statusText = {
    idle: 'Tap Space to start 15-second inspection.',
    inspection: 'Inspection running. Hold Space for 300ms to arm.',
    holding: 'Hold steady...',
    ready: 'Green. Release Space to start.',
    running: 'Solving. Press any key to stop.',
    stopped: 'Solve logged. Tap Space for the next inspection.',
  }[timerStatus];

  const warningText = inspectionElapsed >= 12000
    ? '12 seconds'
    : inspectionElapsed >= 8000
      ? '8 seconds'
      : '';

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="text-center space-y-3">
        <div className="scramble">{scramble}</div>
        <button onClick={resetTimer} className="neon-button">
          <RefreshCw className="w-4 h-4 mr-2" /> New Scramble
        </button>
      </div>

      <div className="text-center space-y-2">
        <div className={`timer-display ${statusClass}`}>
          {displayLabel()}
        </div>
        <div className="text-sm text-[var(--text-muted)]">{statusText}</div>
        {warningText && (timerStatus === 'inspection' || timerStatus === 'holding' || timerStatus === 'ready') && (
          <div className="text-sm font-semibold text-[var(--neon-green)]">{warningText}</div>
        )}
        {inspectionPenalty === '+2' && (
          <div className="text-sm font-semibold text-yellow-300">+2 inspection penalty armed</div>
        )}
      </div>

      {isCameraReady && (
        <div className="relative">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-[300px] object-cover rounded-lg bg-black"
          />
        </div>
      )}

      <p className="text-[var(--text-muted)] text-center text-sm">{cameraMessage}</p>

      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="bg-[var(--bg-darker)] rounded-md p-3 border border-[var(--neon-green)]/20">
          <div className="text-xs text-[var(--text-muted)]">Ao5</div>
          <div className="font-mono text-[var(--text-light)]">{stats.ao5 ? formatTime(stats.ao5) : '--'}</div>
        </div>
        <div className="bg-[var(--bg-darker)] rounded-md p-3 border border-[var(--neon-green)]/20">
          <div className="text-xs text-[var(--text-muted)]">Ao12</div>
          <div className="font-mono text-[var(--text-light)]">{stats.ao12 ? formatTime(stats.ao12) : '--'}</div>
        </div>
      </div>

      <p className="text-[var(--text-muted)] text-center text-sm">
        Keyboard: tap Space for inspection, hold Space until green, release to start, press any key to stop.
      </p>
      <p className="text-[var(--text-muted)] text-center text-xs">
        {isSupabaseConfigured
          ? userId
            ? 'Cloud sync is on for this account.'
            : 'Log in above to save solves to the cloud.'
          : 'Cloud sync is not configured yet.'}
      </p>

      {history.length > 0 && (
        <div className="text-center">
          <button type="button" onClick={clearSession} className="secondary-button">
            Clear Session
          </button>
        </div>
      )}

      {history.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-light)] mb-2">
            Session History
          </h2>
          <div className="space-y-1">
            {history.map((record, index) => (
              <div key={`${record.date}-${index}`} className="history-item gap-3">
                <span className="font-mono">{formatSolve(record)}</span>
                <span className="text-[var(--text-muted)] text-xs truncate">{record.scramble}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default SmartTimer;
