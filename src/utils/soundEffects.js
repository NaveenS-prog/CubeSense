/**
 * Web Audio API synthesizer for speedcubing sound effects.
 * Requires zero external audio files and works offline seamlessly.
 */

let audioCtx = null;
let soundEnabled = true;

export function setSoundEnabled(enabled) {
  soundEnabled = Boolean(enabled);
  try {
    localStorage.setItem('cubesense-sound-enabled', String(soundEnabled));
  } catch {
    // localStorage unavailable
  }
}

export function isSoundEnabled() {
  try {
    const stored = localStorage.getItem('cubesense-sound-enabled');
    if (stored !== null) return stored === 'true';
  } catch {
    // fallback
  }
  return true;
}

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Plays a pleasant sine tone.
 */
function playTone(freq, duration = 0.1, type = 'sine', gainVal = 0.15) {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(gainVal, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (err) {
    console.warn('Audio tone error:', err);
  }
}

/**
 * 8-second inspection warning (two pleasant chimes).
 */
export function playWarning8s() {
  if (!isSoundEnabled()) return;
  playTone(523.25, 0.12, 'sine', 0.2); // C5
  setTimeout(() => playTone(659.25, 0.18, 'sine', 0.2), 120); // E5
}

/**
 * 12-second inspection warning (two alert chimes).
 */
export function playWarning12s() {
  if (!isSoundEnabled()) return;
  playTone(659.25, 0.12, 'triangle', 0.25); // E5
  setTimeout(() => playTone(880, 0.2, 'triangle', 0.25), 120); // A5
}

/**
 * Ready chime when hands/space have held long enough to arm the timer (green).
 */
export function playReadySound() {
  if (!isSoundEnabled()) return;
  playTone(587.33, 0.08, 'sine', 0.2); // D5
  setTimeout(() => playTone(880, 0.12, 'sine', 0.22), 70); // A5
}

/**
 * Solve start click/beep.
 */
export function playStartSound() {
  if (!isSoundEnabled()) return;
  playTone(700, 0.06, 'triangle', 0.15);
}

/**
 * Solve stop chime.
 */
export function playStopSound() {
  if (!isSoundEnabled()) return;
  playTone(440, 0.1, 'sine', 0.2);
}

/**
 * Personal Best celebration fanfare.
 */
export function playPbSound() {
  if (!isSoundEnabled()) return;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
  notes.forEach((freq, idx) => {
    setTimeout(() => {
      playTone(freq, 0.2, 'sine', 0.25);
    }, idx * 100);
  });
}
