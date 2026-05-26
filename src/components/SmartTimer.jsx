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
  const [handsData, setHandsData] = useState(null); // Will store results from MediaPipe

  const videoRef = useRef(null);
  const timerRef = useRef(null);
  const handsRef = useRef(null); // For MediaPipe Hands solution

  // Format milliseconds to MM:SS.hh
  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    const hundredths = String(Math.floor((ms % 1000) / 10)).padStart(2, '0');
    return `${minutes}:${seconds}.${hundredths}`;
  };

  // Start the timer
  const startTimer = () => {
    if (timerStatus === 'ready') {
      setTimerStatus('running');
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 10);
      }, 10);
    }
  };

  // Stop the timer
  const stopTimer = () => {
    if (timerStatus === 'running') {
      clearInterval(timerRef.current);
      setTimerStatus('stopped');
      // Save to history
      const newRecord = {
        time: elapsedTime,
        scramble: scramble,
        date: new Date().toLocaleTimeString(),
      };
      setHistory((prev) => [newRecord, ...prev.slice(0, 9)]); // Keep last 10
    }
  };

  // Reset timer
  const resetTimer = () => {
    clearInterval(timerRef.current);
    setTimerStatus('idle');
    setElapsedTime(0);
    setScramble(generateScramble());
  };

  // Spacebar fallback
  const handleKeyDown = (e) => {
    if (e.code === 'Space' && timerStatus !== 'running') {
      e.preventDefault();
      setTimerStatus('ready');
    }
  };

  const handleKeyUp = (e) => {
    if (e.code === 'Space' && timerStatus === 'ready') {
      e.preventDefault();
      startTimer();
    }
  };

  const handleKeyPress = (e) => {
    if (timerStatus === 'running') {
      // Any key stops the timer
      stopTimer();
    }
  };

  // MediaPipe Hands initialization and processing
  useEffect(() => {
    // Initialize MediaPipe Hands
    const hands = new Hands({
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

    // Start webcam
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoRef.current.srcObject = stream;
        setIsCameraReady(true);
      } catch (err) {
        console.error('Failed to access webcam:', err);
        // Fallback to keyboard only
        setIsCameraReady(false);
      }
    };

    startCamera();

    // Cleanup
    return () => {
      handsRef.current.close();
      if (videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const onResults = (results) => {
    setHandsData(results);
    // Determine if both hands are flat
    const leftHandFlat = isHandFlat(results, 'left');
    const rightHandFlat = isHandFlat(results, 'right');
    const bothHandsFlat = leftHandFlat && rightHandFlat;

    // State transitions based on hand detection
    if (timerStatus === 'idle' && bothHandsFlat) {
      setTimerStatus('ready');
    } else if (timerStatus === 'ready' && !bothHandsFlat) {
      startTimer();
    } else if (timerStatus === 'running' && bothHandsFlat) {
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
      if (h.label === handedness) {
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

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
        <button
          onClick={resetTimer}
          className="neon-button w-full sm:w-auto"
        >
          Reset
        </button>
        {!isCameraReady && (
          <div className="w-full sm:w-auto">
            <p className="text-[var(--text-muted)] text-center">
              Camera not available. Use spacebar fallback.
            </p>
          </div>
        )}
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
