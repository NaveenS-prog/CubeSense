/**
 * MediaPipe Hands & Stackmat Landmark Analysis
 * Loads MediaPipe Hands from CDN and performs real geometric landmark analysis
 * to detect palms-down resting hands on a desk / Stackmat surface.
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

/**
 * Calculates Euclidean distance between two 2D points.
 */
function dist2D(p1, p2) {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

/**
 * Evaluates whether a single hand is resting flat on a surface:
 * 1. Wrist (0) and knuckles (MCPs: 5, 9, 13, 17) are positioned towards the lower desk region.
 * 2. Fingers are extended outward (tips are farther from wrist than knuckles).
 * 3. The hand is not curled into a fist or grasping a cube.
 */
export function isHandFlat(landmarks) {
  if (!landmarks || landmarks.length < 21) return false;

  const wrist = landmarks[0];
  const indexMcp = landmarks[5];
  const middleMcp = landmarks[9];
  const ringMcp = landmarks[13];
  const pinkyMcp = landmarks[17];

  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  const ringTip = landmarks[16];
  const pinkyTip = landmarks[20];

  // Vertical position: Hand should be in lower 65% of the frame (desk area)
  // landmarks y is 0 at top, 1 at bottom
  if (wrist.y < 0.35 && middleMcp.y < 0.35) {
    return false;
  }

  // Check finger extension: distance from wrist to tip must be greater than distance from wrist to MCP
  const distIndexTip = dist2D(wrist, indexTip);
  const distIndexMcp = dist2D(wrist, indexMcp);

  const distMiddleTip = dist2D(wrist, middleTip);
  const distMiddleMcp = dist2D(wrist, middleMcp);

  const distRingTip = dist2D(wrist, ringTip);
  const distRingMcp = dist2D(wrist, ringMcp);

  const distPinkyTip = dist2D(wrist, pinkyTip);
  const distPinkyMcp = dist2D(wrist, pinkyMcp);

  // When fingers are extended flat, tip is at least 1.15x the distance of MCP from wrist
  let extendedCount = 0;
  if (distIndexTip > distIndexMcp * 1.15) extendedCount++;
  if (distMiddleTip > distMiddleMcp * 1.15) extendedCount++;
  if (distRingTip > distRingMcp * 1.15) extendedCount++;
  if (distPinkyTip > distPinkyMcp * 1.15) extendedCount++;

  // At least 3 of the 4 long fingers must be extended (not curled into a fist or gripping a cube)
  return extendedCount >= 3;
}

/**
 * Virtual Stackmat sensor zones (normalized coords: x: 0..1, y: 0..1)
 */
export const STACKMAT_ZONES = {
  leftPad: { minX: 0.04, maxX: 0.48, minY: 0.42, maxY: 0.98 },
  rightPad: { minX: 0.52, maxX: 0.96, minY: 0.42, maxY: 0.98 },
};

/**
 * Analyzes MediaPipe Hands results and returns detailed Stackmat state:
 * - leftHandOnPad: true if a flat hand is in the left sensor zone
 * - rightHandOnPad: true if a flat hand is in the right sensor zone
 * - bothHandsDown: true if both pads are engaged simultaneously
 */
export function analyzeStackmatHands(results) {
  const hands = results?.multiHandLandmarks || [];
  if (hands.length < 2) {
    // Check if at least 1 hand is down
    let leftDown = false;
    let rightDown = false;

    for (const hand of hands) {
      const wrist = hand[0];
      const middleTip = hand[12];
      const avgX = (wrist.x + middleTip.x) / 2;
      const flat = isHandFlat(hand);

      if (avgX < 0.5 && flat) leftDown = true;
      if (avgX >= 0.5 && flat) rightDown = true;
    }

    return {
      handsCount: hands.length,
      leftHandOnPad: leftDown,
      rightHandOnPad: rightDown,
      bothHandsDown: false,
      statusMessage: hands.length === 1 ? '1 hand detected — place both hands on pads' : 'Waiting for hands...',
    };
  }

  // We have 2 or more hands detected
  let leftHand = null;
  let rightHand = null;

  // Identify which hand is on the left vs right side of the screen
  for (const hand of hands) {
    const wrist = hand[0];
    const middleTip = hand[12];
    const avgX = (wrist.x + middleTip.x) / 2;

    if (avgX < 0.5) {
      if (!leftHand || hand[0].y > leftHand[0].y) leftHand = hand;
    } else {
      if (!rightHand || hand[0].y > rightHand[0].y) rightHand = hand;
    }
  }

  const leftFlat = leftHand ? isHandFlat(leftHand) : false;
  const rightFlat = rightHand ? isHandFlat(rightHand) : false;

  const bothDown = leftFlat && rightFlat;

  let status = 'Waiting for hands...';
  if (bothDown) {
    status = 'Both hands flat on pads';
  } else if (leftFlat && !rightFlat) {
    status = 'Left hand ready — place right hand flat';
  } else if (!leftFlat && rightFlat) {
    status = 'Right hand ready — place left hand flat';
  } else {
    status = 'Flatten hands on desk to arm timer';
  }

  return {
    handsCount: hands.length,
    leftHandOnPad: leftFlat,
    rightHandOnPad: rightFlat,
    bothHandsDown: bothDown,
    statusMessage: status,
  };
}

/**
 * Backward compatibility helper for SmartTimer.
 */
export function areBothHandsDown(results) {
  return analyzeStackmatHands(results).bothHandsDown;
}

/**
 * Draws the hand landmarks and Stackmat sensor overlay onto a canvas.
 */
export function drawStackmatCanvas(canvas, videoElement, analysis, results) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // If video ready, draw video mirrored
  if (videoElement && videoElement.readyState >= 2) {
    ctx.save();
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoElement, 0, 0, width, height);
    ctx.restore();
  } else {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);
  }

  // Draw semi-transparent dark overlay for high contrast
  ctx.fillStyle = 'rgba(11, 14, 20, 0.45)';
  ctx.fillRect(0, 0, width, height);

  // Draw Left and Right Virtual Stackmat Sensor Pads
  const leftPadRect = {
    x: width * 0.05,
    y: height * 0.50,
    w: width * 0.42,
    h: height * 0.45,
  };

  const rightPadRect = {
    x: width * 0.53,
    y: height * 0.50,
    w: width * 0.42,
    h: height * 0.45,
  };

  const drawPad = (rect, active, label) => {
    ctx.save();
    ctx.beginPath();
    const radius = 12;
    ctx.roundRect(rect.x, rect.y, rect.w, rect.h, radius);

    if (active) {
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#22c55e';
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 12;
    } else {
      ctx.fillStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.shadowBlur = 0;
    }
    ctx.stroke();

    // Pad label
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = active ? '#22c55e' : 'rgba(255, 255, 255, 0.6)';
    ctx.fillText(label, rect.x + rect.w / 2, rect.y + 22);

    ctx.restore();
  };

  const leftActive = analysis?.leftHandOnPad || false;
  const rightActive = analysis?.rightHandOnPad || false;

  drawPad(leftPadRect, leftActive, leftActive ? 'LEFT HAND READY' : 'LEFT TOUCHPAD');
  drawPad(rightPadRect, rightActive, rightActive ? 'RIGHT HAND READY' : 'RIGHT TOUCHPAD');

  // Draw hand landmarks (mirrored to match user reflection)
  const hands = results?.multiHandLandmarks || [];
  ctx.save();
  for (const hand of hands) {
    const isFlat = isHandFlat(hand);
    const color = isFlat ? '#22c55e' : '#f59e0b';

    // Draw joints
    for (const pt of hand) {
      const cx = (1 - pt.x) * width; // mirror x
      const cy = pt.y * height;

      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
    }

    // Connect finger bones
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8], // Index
      [0, 9], [9, 10], [10, 11], [11, 12], // Middle
      [0, 13], [13, 14], [14, 15], [15, 16], // Ring
      [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
      [5, 9], [9, 13], [13, 17], // Palm base
    ];

    ctx.strokeStyle = isFlat ? 'rgba(34, 197, 94, 0.6)' : 'rgba(245, 158, 11, 0.5)';
    ctx.lineWidth = 2;
    for (const [i, j] of connections) {
      const p1 = hand[i];
      const p2 = hand[j];
      ctx.beginPath();
      ctx.moveTo((1 - p1.x) * width, p1.y * height);
      ctx.lineTo((1 - p2.x) * width, p2.y * height);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/**
 * Starts webcam and hand tracking.
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
