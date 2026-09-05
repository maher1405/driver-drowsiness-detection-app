import { NormalizedLandmark } from '../types';

/**
 * 2D Euclidean distance between two landmarks (normalized coordinates)
 */
export function distance2D(p1: NormalizedLandmark, p2: NormalizedLandmark): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 3D Euclidean distance between two landmarks
 */
export function distance3D(p1: NormalizedLandmark, p2: NormalizedLandmark): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = (p1.z || 0) - (p2.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Eye Aspect Ratio (EAR) for a single eye
 * Formula: (|p2 - p6| + |p3 - p5|) / (2 * |p1 - p4|)
 */
export function computeEyeEAR(
  landmarks: NormalizedLandmark[],
  indices: [number, number, number, number, number, number]
): number {
  const [p1, p2, p3, p4, p5, p6] = indices.map((i) => landmarks[i]);
  if (!p1 || !p2 || !p3 || !p4 || !p5 || !p6) return 0.3;

  const vertical1 = distance2D(p2, p6);
  const vertical2 = distance2D(p3, p5);
  const horizontal = distance2D(p1, p4);

  if (horizontal === 0) return 0.3;
  return (vertical1 + vertical2) / (2.0 * horizontal);
}

// Landmark indices for MediaPipe Face Mesh
// Right eye (subject's right)
export const RIGHT_EYE_INDICES: [number, number, number, number, number, number] = [
  33, 160, 158, 133, 153, 144,
];

// Left eye (subject's left)
export const LEFT_EYE_INDICES: [number, number, number, number, number, number] = [
  362, 385, 387, 263, 373, 380,
];

/**
 * Compute average Eye Aspect Ratio (EAR) across both eyes
 */
export function computeAverageEAR(landmarks: NormalizedLandmark[]): {
  ear: number;
  leftEar: number;
  rightEar: number;
} {
  const rightEar = computeEyeEAR(landmarks, RIGHT_EYE_INDICES);
  const leftEar = computeEyeEAR(landmarks, LEFT_EYE_INDICES);
  const ear = (rightEar + leftEar) / 2.0;
  return { ear, leftEar, rightEar };
}

/**
 * Mouth Aspect Ratio (MAR)
 * Vertical distance of lips divided by horizontal corner distance
 * Uses upper inner/outer lip (81, 13, 311) and lower inner/outer lip (178, 14, 402)
 * Horizontal lip corners: 61, 291
 */
export function computeMAR(landmarks: NormalizedLandmark[]): number {
  const p61 = landmarks[61];
  const p291 = landmarks[291];
  const p13 = landmarks[13];
  const p14 = landmarks[14];
  const p81 = landmarks[81];
  const p178 = landmarks[178];
  const p311 = landmarks[311];
  const p402 = landmarks[402];

  if (!p61 || !p291 || !p13 || !p14 || !p81 || !p178 || !p311 || !p402) {
    return 0.1;
  }

  const vertical1 = distance2D(p81, p178);
  const vertical2 = distance2D(p13, p14);
  const vertical3 = distance2D(p311, p402);
  const horizontal = distance2D(p61, p291);

  if (horizontal === 0) return 0.1;
  return (vertical1 + vertical2 + vertical3) / (2.0 * horizontal);
}

/**
 * Estimate head pose pitch, yaw, roll from 3D landmarks
 * Pitch: negative is tilted down (nodding forward)
 * Glabella/Forehead: 10
 * Chin: 152
 * Nose tip: 1
 * Eyes outer: 33 (right), 263 (left)
 */
export function estimateHeadPose(landmarks: NormalizedLandmark[]): {
  pitch: number;
  yaw: number;
  roll: number;
} {
  const forehead = landmarks[10];
  const chin = landmarks[152];
  const nose = landmarks[1];
  const rightEye = landmarks[33];
  const leftEye = landmarks[263];

  if (!forehead || !chin || !nose || !rightEye || !leftEye) {
    return { pitch: 0, yaw: 0, roll: 0 };
  }

  // Pitch calculation:
  // In 3D, as head nods down, forehead tilts forward (z decreases) and chin tilts back (z increases)
  const dy = chin.y - forehead.y;
  const dz = chin.z - forehead.z;
  // Angle in radians then degrees; tilt down makes dz positive, so -atan2 gives negative angle
  let pitch = -(Math.atan2(dz, dy) * (180 / Math.PI));

  // Also factor in 2D relative position of nose tip between eyes level and chin
  const eyesMidY = (rightEye.y + leftEye.y) / 2;
  const faceHeight = chin.y - eyesMidY;
  if (faceHeight > 0.05) {
    const noseRelative = (nose.y - eyesMidY) / faceHeight;
    // When neutral, noseRelative is around 0.35 - 0.40.
    // When tilted down, noseRelative increases (nose drops lower towards chin)
    const ratioDeviation = (noseRelative - 0.40) * 80;
    // Combine 3D depth pitch and 2D perspective ratio for maximum robustness
    pitch = (pitch * 0.6) - (ratioDeviation * 0.4);
  }

  // Yaw calculation (looking left vs right)
  const eyeDx = leftEye.x - rightEye.x;
  const eyeDz = leftEye.z - rightEye.z;
  const yaw = Math.atan2(eyeDz, eyeDx) * (180 / Math.PI);

  // Roll calculation (tilting ear toward shoulder)
  const eyeDy = leftEye.y - rightEye.y;
  const roll = Math.atan2(eyeDy, eyeDx) * (180 / Math.PI);

  return {
    pitch: Math.round(pitch * 10) / 10,
    yaw: Math.round(yaw * 10) / 10,
    roll: Math.round(roll * 10) / 10,
  };
}
