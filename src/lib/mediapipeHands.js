/**
 * MediaPipe is loaded from CDN (not bundled) so Vite production builds on Vercel work.
 * @see https://github.com/google-ai-edge/mediapipe/issues/4120
 */

const HANDS_VERSION = '0.4.1675469240';
const HANDS_CDN = `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${HANDS_VERSION}`;

let handsInstance = null;
let loadPromise = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)));
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.crossOrigin = 'anonymous';
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

export function ensureMediaPipeLoaded() {
  if (globalThis.Hands) {
    return Promise.resolve();
  }

  if (!loadPromise) {
    loadPromise = loadScript(`${HANDS_CDN}/hands.js`).then(() => {
      if (!globalThis.Hands) {
        throw new Error('MediaPipe Hands did not initialize');
      }
    });
  }

  return loadPromise;
}

export function getHandsInstance() {
  if (!handsInstance) {
    handsInstance = new globalThis.Hands({
      locateFile: (file) => `${HANDS_CDN}/${file}`,
    });
    handsInstance.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  }
  return handsInstance;
}

/** Two hands visible in frame = palms-down stackmat-style pose. */
export function areBothHandsDown(results) {
  return (results.multiHandLandmarks?.length ?? 0) >= 2;
}

/**
 * Start webcam + hand tracking. Must be called from a user click (required on HTTPS/production).
 * @returns {Promise<() => void>} cleanup
 */
export async function startHandCamera(videoElement, onResults) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera API not supported in this browser');
  }

  await ensureMediaPipeLoaded();

  const hands = getHandsInstance();
  hands.onResults(onResults);

  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: 'user',
      width: { ideal: 640 },
      height: { ideal: 480 },
    },
    audio: false,
  });

  videoElement.srcObject = stream;
  await videoElement.play();

  let active = true;

  const tick = async () => {
    if (!active) return;

    if (videoElement.readyState >= 2) {
      try {
        await hands.send({ image: videoElement });
      } catch (err) {
        console.warn('MediaPipe frame error:', err);
      }
    }

    if (active) {
      requestAnimationFrame(tick);
    }
  };

  requestAnimationFrame(tick);

  return () => {
    active = false;
    stream.getTracks().forEach((track) => track.stop());
    videoElement.srcObject = null;
  };
}
