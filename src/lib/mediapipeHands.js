import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

const HANDS_ASSET_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands';

let handsInstance = null;

export function getHandsInstance() {
  if (!handsInstance) {
    handsInstance = new Hands({
      locateFile: (file) => `${HANDS_ASSET_BASE}/${file}`,
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
 * Start webcam + MediaPipe frame loop on a video element.
 * @returns {Promise<() => void>} cleanup function
 */
export async function startHandCamera(videoElement, onResults) {
  const hands = getHandsInstance();
  hands.onResults(onResults);

  const camera = new Camera(videoElement, {
    onFrame: async () => {
      if (videoElement.readyState >= 2) {
        await hands.send({ image: videoElement });
      }
    },
    width: 640,
    height: 480,
  });

  await camera.start();

  return () => {
    camera.stop();
  };
}
