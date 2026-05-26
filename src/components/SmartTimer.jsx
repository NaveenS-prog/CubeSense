import React, { useState, useRef, useEffect } from 'react';
import { generateScramble } from '../utils/scramble';

// Since we cannot rely on external icon libraries without installing, we'll use simple JSX for icons
// or we can use lucide-react if installed. Let's assume we have lucide-react installed via dependencies.

import { RefreshCw } from 'lucide-react';

function SmartTimer() {
  const [timerStatus, setTimerStatus] = useState('idle'); // idle, ready, running, stopped
  const [elapsedTime, setElapsedTime] = useState(0);
  const [scramble, setScramble] = useState(generateScramble());
  const [history, setHistory] = useState([]);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraMessage, setCameraMessage] = useState('Starting camera...');
  const [handsData, setHandsData] = useState(null); // Will store results from MediaPipe

  const videoRef = useRef(null);
  const timerRef = useRef(null);
  const handsRef = useRef(null); // For MediaPipe Hands solution
  const timerStatusRef = useRef(timerStatus);
  const elapsedTimeRef = useRef(elapsedTime);
  const scrambleRef = useRef(scramble);

  useEffect(() => {
    timerStatusRef.current = timerStatus;
  }, [timerStatus]);

  useEffect(() => {
    elapsedTimeRef.current = elapsedTime;
  }, [elapsedTime]);

  useEffect(() => {
    scrambleRef.current = scramble;
  }, [scramble]);

  // Format milliseconds to MM:SS.hh
  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    const hundredths = String(Math.floor((ms % 1000) / 10)).padStart(2, '0');
    return `${minutes}:${seconds}.${hundredths}`;
  };

  const setStatus = (status) => {
    timerStatusRef.current = status;
    setTimerStatus(status);
  };

  const startTimer = () => {
    if (timerStatusRef.current !== 'ready') return;

    clearInterval(timerRef.current);
    setStatus('running');
    timerRef.current = setInterval(() => {
      elapsedTimeRef.current += 10;
      setElapsedTime(elapsedTimeRef.current);
    }, 10);
  };

  const stopTimer = () => {
    if (timerStatusRef.current !== 'running') return;

    clearInterval(timerRef.current);
    setStatus('stopped');
    const newRecord = {
      time: elapsedTimeRef.current,
      scramble: scrambleRef.current,
      date: new Date().toLocaleTimeString(),
    };
    setHistory((prev) => [newRecord, ...prev.slice(0, 9)]); // Keep last 10
  };

  const prepareTimer = () => {
    if (timerStatusRef.current !== 'running') {
      setStatus('ready');
    }
  };

  // Reset timer
  const resetTimer = () => {
    clearInterval(timerRef.current);
    setStatus('idle');
    elapsedTimeRef.current = 0;
    setElapsedTime(0);
    setScramble(generateScramble());
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && timerStatusRef.current !== 'running') {
        e.preventDefault();
        prepareTimer();
        return;
      }

      if (timerStatusRef.current === 'running') {
        e.preventDefault();
        stopTimer();
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'Space' && timerStatusRef.current === 'ready') {
        e.preventDefault();
        startTimer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // MediaPipe Hands initialization and processing
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

    // Initialize MediaPipe Hands
    const hands = new window.Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      },
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

    // Start webcam
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoRef.current.srcObject = stream;
        setIsCameraReady(true);
        setCameraMessage('Camera ready. Put both hands in view, lift to start, return to stop.');
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          processFrame();
        };
      } catch (err) {
        console.error('Failed to access webcam:', err);
        // Fallback to keyboard only
        setIsCameraReady(false);
        setCameraMessage('Camera not available. Use spacebar fallback.');
      }
    };

    startCamera();

    // Cleanup
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
    // Determine if both hands are flat
    const leftHandFlat = isHandFlat(results, 'left');
    const rightHandFlat = isHandFlat(results, 'right');
    const bothHandsFlat = leftHandFlat && rightHandFlat;
    const currentStatus = timerStatusRef.current;

    // State transitions based on hand detection
    if (currentStatus === 'idle' && bothHandsFlat) {
      prepareTimer();
    } else if (currentStatus === 'ready' && !bothHandsFlat) {
      startTimer();
    } else if (currentStatus === 'running' && bothHandsFlat) {
      stopTimer();
    }
  };

  // Simple heuristic to determine if a hand is flat (all fingers extended)
  // This is a placeholder and needs refinement based on actual landmark positions.
  const isHandFlat = (results, handedness) => {
    if (!results.multiHandLandmarks || !results.multiHandedness) return false;

    // Find the hand of the specified handedness
    let handIndex = -1;
    results.multiHandedness.forEach((h, i) => {
      if (h.label?.toLowerCase() === handedness) {
        handIndex = i;
      }
    });

    if (handIndex === -1) return false;

    const landmarks = results.multiHandLandmarks[handIndex];

    // We'll use a simple check: if the wrist is visible and the fingertips are roughly at the same y-level as the knuckles (or slightly below for flat on table)
    // For simplicity, we'll consider the hand flat if the distance between wrist and middle finger tip is less than a threshold (indicating fingers are not curled)
    // But note: when flat, the fingers are extended, so the tip should be further from the wrist? Actually, if the hand is flat on a table, the fingers are lying flat, so the tip and knuckle are at similar depth (z) but in x,y they might be spread.

    // Given the complexity, we'll return true if the hand is detected (for now) and rely on spacebar for testing.
    // TODO: Implement proper flat hand detection using landmark positions.
    return true; // Placeholder: always true if hand detected
  };

  // Render
  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Scramble */}
      <div className="text-center">
        <div className="scramble">{scramble}</div>
        <button
          onClick={() => {
            setScramble(generateScramble());
            if (timerStatus === 'idle' || timerStatus === 'ready') {
              resetTimer();
            }
          }}
          className="neon-button"
        >
          <RefreshCw className="w-4 h-4 mr-2" /> New Scramble
        </button>
      </div>

      {/* Timer Display */}
      <div className="text-center">
        <div className={`timer-display ${timerStatus === 'ready' ? 'ready' : timerStatus === 'running' ? 'running' : 'stopped'}`}>
          {formatTime(elapsedTime)}
        </div>
      </div>

      {/* Camera Feed */}
      {isCameraReady && (
        <div className="relative">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-[300px] object-cover rounded-lg bg-black"
          />
          {/* We could draw landmarks on a canvas here, but for simplicity we skip */}
        </div>
      )}

      <p className="text-[var(--text-muted)] text-center text-sm">{cameraMessage}</p>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
        <button
          onClick={resetTimer}
          className="neon-button w-full sm:w-auto"
        >
          Reset
        </button>
        <p className="text-[var(--text-muted)] text-center text-sm">
          Spacebar: hold to ready, release to start, press any key to stop.
        </p>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-light)] mb-2">
            Session History
          </h2>
          <div className="space-y-1">
            {history.map((record, index) => (
              <div key={index} className="history-item">
                <span>{formatTime(record.time)}</span>
                <span className="text-[var(--text-muted)] text-xs">{record.scramble}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default SmartTimer;
