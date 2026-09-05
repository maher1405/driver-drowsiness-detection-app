export type AlertState = 'Normal' | 'Warning' | 'Drowsy';

export type SignalType = 'eyesClosed' | 'yawning' | 'headNodding';

export interface AlertLogItem {
  id: string;
  timestamp: string; // e.g. "14:23:05"
  date: string;
  alertState: AlertState;
  reason: string;
  activeSignals: string[];
  ear: number;
  mar: number;
  headPitch: number;
  durationSeconds: number;
}

export interface DetectionMetrics {
  ear: number;
  leftEar: number;
  rightEar: number;
  mar: number;
  headPitch: number; // degrees: negative = tilted down
  headYaw: number;   // degrees: left/right
  headRoll: number;  // degrees: tilt
  eyesClosedFrames: number;
  yawningFrames: number;
  headNoddingFrames: number;
  isEyesClosed: boolean;
  isYawning: boolean;
  isHeadNodding: boolean;
  fps: number;
  faceDetected: boolean;
}

export interface DetectionConfig {
  earThreshold: number; // default 0.25
  earConsecutiveFrames: number; // default 20
  earPersistentFrames: number; // default 35
  marThreshold: number; // default 0.60
  marConsecutiveFrames: number; // default 15
  marPersistentFrames: number; // default 30
  headPitchThreshold: number; // degrees down e.g. -14
  headNodConsecutiveFrames: number; // default 15
  headNodPersistentFrames: number; // default 35
  soundEnabled: boolean;
  soundVolume: number; // 0.0 to 1.0
  alarmPitch: number; // frequency in Hz
  showMeshOverlay: boolean;
  showLandmarkPoints: boolean;
  mirrorWebcam: boolean;
}

export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
}
