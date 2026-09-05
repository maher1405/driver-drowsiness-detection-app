import { useState, useEffect, useRef, useCallback } from 'react';
import {
  AlertLogItem,
  AlertState,
  DetectionConfig,
  DetectionMetrics,
  NormalizedLandmark,
} from '../types';
import { getFaceLandmarker, detectFace } from '../services/faceLandmarkerService';
import { computeAverageEAR, computeMAR, estimateHeadPose } from '../utils/math';
import { drawFaceLandmarks } from '../utils/canvasDrawing';
import { alarmAudio } from '../utils/audio';

const DEFAULT_CONFIG: DetectionConfig = {
  earThreshold: 0.25,
  earConsecutiveFrames: 20,
  earPersistentFrames: 35,
  marThreshold: 0.60,
  marConsecutiveFrames: 15,
  marPersistentFrames: 30,
  headPitchThreshold: -14, // -14 degrees down
  headNodConsecutiveFrames: 15,
  headNodPersistentFrames: 35,
  soundEnabled: true,
  soundVolume: 0.8,
  alarmPitch: 880,
  showMeshOverlay: true,
  showLandmarkPoints: false,
  mirrorWebcam: true,
};

const INITIAL_METRICS: DetectionMetrics = {
  ear: 0.32,
  leftEar: 0.32,
  rightEar: 0.32,
  mar: 0.15,
  headPitch: 0,
  headYaw: 0,
  headRoll: 0,
  eyesClosedFrames: 0,
  yawningFrames: 0,
  headNoddingFrames: 0,
  isEyesClosed: false,
  isYawning: false,
  isHeadNodding: false,
  fps: 0,
  faceDetected: false,
};

export function useDrowsinessDetector() {
  const [config, setConfig] = useState<DetectionConfig>(DEFAULT_CONFIG);
  const [metrics, setMetrics] = useState<DetectionMetrics>(INITIAL_METRICS);
  const [alertState, setAlertState] = useState<AlertState>('Normal');
  const [activeAlertReason, setActiveAlertReason] = useState<string>('');
  const [alertLogs, setAlertLogs] = useState<AlertLogItem[]>([]);
  const [drowsyEventCount, setDrowsyEventCount] = useState<number>(0);
  const [lastEventTime, setLastEventTime] = useState<string | null>(null);

  // Camera & Stream states
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isModelLoading, setIsModelLoading] = useState<boolean>(true);
  const [modelError, setModelError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  // History buffer for sparkline graph
  const [historyBuffer, setHistoryBuffer] = useState<{ ear: number; mar: number; pitch: number }[]>([]);

  // Calibration state
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const [calibrationProgress, setCalibrationProgress] = useState<number>(0);

  // Refs for requestAnimationFrame loop
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Mutable state refs to avoid closure staleness in render loop
  const configRef = useRef<DetectionConfig>(config);
  configRef.current = config;

  const eyesClosedCounterRef = useRef<number>(0);
  const yawningCounterRef = useRef<number>(0);
  const headNodCounterRef = useRef<number>(0);
  const safeRecoveryCounterRef = useRef<number>(0);

  const isDrowsyActiveRef = useRef<boolean>(false);
  const drowsyStartTimeRef = useRef<number>(0);
  const activeAlertIdRef = useRef<string | null>(null);

  const lastFrameTimeRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);
  const fpsRef = useRef<number>(30);

  // Calibration samples
  const calibrationSamplesRef = useRef<{ ear: number; mar: number; pitch: number }[]>([]);

  // Update volume on audio controller
  useEffect(() => {
    alarmAudio.setVolume(config.soundVolume);
  }, [config.soundVolume]);

  // Load available camera devices
  const refreshDevices = useCallback(async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices.filter((d) => d.kind === 'videoinput');
      setDevices(videoInputs);
      if (videoInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoInputs[0].deviceId);
      }
    } catch (e) {
      console.warn('Could not enumerate devices:', e);
    }
  }, [selectedDeviceId]);

  // Pre-load MediaPipe Model
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setIsModelLoading(true);
        setModelError(null);
        await getFaceLandmarker();
        if (isMounted) {
          setIsModelLoading(false);
          refreshDevices();
        }
      } catch (err: unknown) {
        console.error('Error preloading FaceLandmarker:', err);
        if (isMounted) {
          setIsModelLoading(false);
          setModelError(
            err instanceof Error ? err.message : 'Failed to load MediaPipe Face Landmarker'
          );
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [refreshDevices]);

  // Start Webcam
  const startCamera = useCallback(async (deviceIdToUse?: string) => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: deviceIdToUse
          ? { deviceId: { exact: deviceIdToUse }, width: { ideal: 640 }, height: { ideal: 480 } }
          : { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsCameraActive(true);
      await refreshDevices();
    } catch (err) {
      console.error('Error starting camera:', err);
      setModelError('Could not access webcam. Please verify camera permissions.');
      setIsCameraActive(false);
    }
  }, [refreshDevices]);

  // Stop Webcam
  const stopCamera = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    alarmAudio.stopAlarm();
    setAlertState('Normal');
    setActiveAlertReason('');
  }, []);

  // Calibration routine
  const startCalibration = useCallback(() => {
    if (!isCameraActive) return;
    setIsCalibrating(true);
    setCalibrationProgress(0);
    calibrationSamplesRef.current = [];

    const startTime = Date.now();
    const duration = 3000; // 3 seconds

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, Math.round((elapsed / duration) * 100));
      setCalibrationProgress(progress);

      if (elapsed >= duration) {
        clearInterval(interval);
        setIsCalibrating(false);

        // Process samples
        const samples = calibrationSamplesRef.current;
        if (samples.length > 10) {
          const avgEar = samples.reduce((acc, s) => acc + s.ear, 0) / samples.length;
          const avgMar = samples.reduce((acc, s) => acc + s.mar, 0) / samples.length;
          const avgPitch = samples.reduce((acc, s) => acc + s.pitch, 0) / samples.length;

          // Calibrated thresholds based on user's open-eye neutral baseline
          const newEarThreshold = Math.max(0.18, Math.min(0.32, Math.round(avgEar * 0.75 * 100) / 100));
          const newMarThreshold = Math.max(0.50, Math.min(0.75, Math.round((avgMar + 0.35) * 100) / 100));
          const newPitchThreshold = Math.round((avgPitch - 14) * 10) / 10;

          setConfig((prev) => ({
            ...prev,
            earThreshold: newEarThreshold,
            marThreshold: newMarThreshold,
            headPitchThreshold: newPitchThreshold,
          }));
        }
      }
    }, 100);
  }, [isCameraActive]);

  // Main Detection Loop
  useEffect(() => {
    if (!isCameraActive || isModelLoading) return;

    let isRunning = true;

    const runLoop = async () => {
      if (!isRunning) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState >= 2) {
        const now = performance.now();
        const delta = now - lastFrameTimeRef.current;
        lastFrameTimeRef.current = now;
        frameCountRef.current++;

        if (frameCountRef.current % 10 === 0) {
          fpsRef.current = Math.round(1000 / Math.max(1, delta));
        }

        // Keep canvas matched to video resolution
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
        }

        try {
          const landmarker = await getFaceLandmarker();
          const landmarks: NormalizedLandmark[] | null = detectFace(
            landmarker,
            video,
            now
          );

          const cfg = configRef.current;

          if (landmarks && landmarks.length >= 468) {
            // 1. EAR
            const { ear, leftEar, rightEar } = computeAverageEAR(landmarks);
            // 2. MAR
            const mar = computeMAR(landmarks);
            // 3. Head Pose
            const { pitch, yaw, roll } = estimateHeadPose(landmarks);

            // Record samples during calibration
            if (isCalibrating) {
              calibrationSamplesRef.current.push({ ear, mar, pitch });
            }

            // Signal 1: Eyes Closed
            if (ear < cfg.earThreshold) {
              eyesClosedCounterRef.current += 1;
            } else {
              eyesClosedCounterRef.current = Math.max(0, eyesClosedCounterRef.current - 1);
            }
            const isEyesClosed = eyesClosedCounterRef.current >= cfg.earConsecutiveFrames;
            const isPersistentEyesClosed = eyesClosedCounterRef.current >= cfg.earPersistentFrames;

            // Signal 2: Yawning
            if (mar > cfg.marThreshold) {
              yawningCounterRef.current += 1;
            } else {
              yawningCounterRef.current = Math.max(0, yawningCounterRef.current - 1);
            }
            const isYawning = yawningCounterRef.current >= cfg.marConsecutiveFrames;
            const isPersistentYawning = yawningCounterRef.current >= cfg.marPersistentFrames;

            // Signal 3: Head Nodding
            if (pitch <= cfg.headPitchThreshold) {
              headNodCounterRef.current += 1;
            } else {
              headNodCounterRef.current = Math.max(0, headNodCounterRef.current - 1);
            }
            const isHeadNodding = headNodCounterRef.current >= cfg.headNodConsecutiveFrames;
            const isPersistentHeadNodding = headNodCounterRef.current >= cfg.headNodPersistentFrames;

            // Count active primary signals
            const activeSignalsList: string[] = [];
            if (isEyesClosed) activeSignalsList.push('Eyes Closed');
            if (isYawning) activeSignalsList.push('Yawning');
            if (isHeadNodding) activeSignalsList.push('Head Nodding');

            const activeSignalCount = activeSignalsList.length;

            // Persistent single signal check
            let persistentReason = '';
            if (isPersistentEyesClosed) {
              persistentReason = `Persistent Eyes Closed (${eyesClosedCounterRef.current} frames)`;
            } else if (isPersistentHeadNodding) {
              persistentReason = `Persistent Head Nodding (${headNodCounterRef.current} frames)`;
            } else if (isPersistentYawning) {
              persistentReason = `Persistent Yawning (${yawningCounterRef.current} frames)`;
            }

            // CRITICAL RULE:
            // "When any two of these three signals are active at once, or one signal persists long enough, trigger a clear on-screen red alert banner and play a loud beep/alarm sound."
            const isCriticalDrowsy = activeSignalCount >= 2 || persistentReason.length > 0;

            // WARNING STATE: 1 active signal or borderline
            const isWarning = !isCriticalDrowsy && (
              activeSignalCount === 1 ||
              eyesClosedCounterRef.current >= Math.floor(cfg.earConsecutiveFrames * 0.6) ||
              yawningCounterRef.current >= Math.floor(cfg.marConsecutiveFrames * 0.6) ||
              headNodCounterRef.current >= Math.floor(cfg.headNodConsecutiveFrames * 0.6)
            );

            // Handle Drowsy Event Transition
            if (isCriticalDrowsy) {
              safeRecoveryCounterRef.current = 0;
              const reasonText = persistentReason || `Dual Signals: ${activeSignalsList.join(' + ')}`;

              if (!isDrowsyActiveRef.current) {
                // New alert triggered!
                isDrowsyActiveRef.current = true;
                drowsyStartTimeRef.current = Date.now();
                const alertId = 'alert_' + Date.now();
                activeAlertIdRef.current = alertId;

                const nowObj = new Date();
                const timeString = nowObj.toLocaleTimeString();
                const dateString = nowObj.toLocaleDateString();

                setDrowsyEventCount((prev) => prev + 1);
                setLastEventTime(timeString);

                const newLog: AlertLogItem = {
                  id: alertId,
                  timestamp: timeString,
                  date: dateString,
                  alertState: 'Drowsy',
                  reason: reasonText,
                  activeSignals: activeSignalsList.length > 0 ? activeSignalsList : [persistentReason],
                  ear: Math.round(ear * 100) / 100,
                  mar: Math.round(mar * 100) / 100,
                  headPitch: pitch,
                  durationSeconds: 1,
                };

                setAlertLogs((prev) => [newLog, ...prev]);

                if (cfg.soundEnabled) {
                  alarmAudio.startAlarm();
                }
              } else {
                // Ongoing alert: update duration
                const duration = Math.max(1, Math.round((Date.now() - drowsyStartTimeRef.current) / 1000));
                setAlertLogs((prev) =>
                  prev.map((log) =>
                    log.id === activeAlertIdRef.current
                      ? { ...log, durationSeconds: duration }
                      : log
                  )
                );
              }

              setAlertState('Drowsy');
              setActiveAlertReason(reasonText);
            } else {
              // Not critical drowsy
              if (isDrowsyActiveRef.current) {
                // Require at least 8 consecutive safe frames before turning off emergency alert
                safeRecoveryCounterRef.current += 1;
                if (safeRecoveryCounterRef.current >= 8) {
                  isDrowsyActiveRef.current = false;
                  alarmAudio.stopAlarm();
                  activeAlertIdRef.current = null;
                }
              }

              if (!isDrowsyActiveRef.current) {
                if (isWarning) {
                  setAlertState('Warning');
                  const warnMsg = activeSignalsList.length > 0
                    ? `Warning: ${activeSignalsList.join(', ')}`
                    : 'Warning: Driver Fatigue Signs';
                  setActiveAlertReason(warnMsg);
                } else {
                  setAlertState('Normal');
                  setActiveAlertReason('');
                }
              }
            }

            const currentMetrics: DetectionMetrics = {
              ear: Math.round(ear * 1000) / 1000,
              leftEar: Math.round(leftEar * 1000) / 1000,
              rightEar: Math.round(rightEar * 1000) / 1000,
              mar: Math.round(mar * 1000) / 1000,
              headPitch: pitch,
              headYaw: yaw,
              headRoll: roll,
              eyesClosedFrames: eyesClosedCounterRef.current,
              yawningFrames: yawningCounterRef.current,
              headNoddingFrames: headNodCounterRef.current,
              isEyesClosed,
              isYawning,
              isHeadNodding,
              fps: fpsRef.current,
              faceDetected: true,
            };

            setMetrics(currentMetrics);

            // Buffer history for rolling sparkline chart (keep 60 frames)
            if (frameCountRef.current % 2 === 0) {
              setHistoryBuffer((prev) => {
                const next = [...prev, { ear, mar, pitch }];
                return next.length > 60 ? next.slice(next.length - 60) : next;
              });
            }

            // Render overlays
            const ctx = canvas.getContext('2d');
            if (ctx) {
              drawFaceLandmarks(
                ctx,
                landmarks,
                canvas.width,
                canvas.height,
                currentMetrics,
                cfg
              );
            }
          } else {
            // No face detected
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
            setMetrics((prev) => ({
              ...prev,
              faceDetected: false,
              fps: fpsRef.current,
            }));
          }
        } catch (loopErr) {
          console.error('Detection frame error:', loopErr);
        }
      }

      if (isRunning) {
        animationFrameId.current = requestAnimationFrame(runLoop);
      }
    };

    animationFrameId.current = requestAnimationFrame(runLoop);

    return () => {
      isRunning = false;
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      alarmAudio.stopAlarm();
    };
  }, [isCameraActive, isModelLoading, isCalibrating]);

  const clearAlertLogs = useCallback(() => {
    setAlertLogs([]);
    setDrowsyEventCount(0);
    setLastEventTime(null);
  }, []);

  const acknowledgeAlert = useCallback(() => {
    isDrowsyActiveRef.current = false;
    alarmAudio.stopAlarm();
    setAlertState('Normal');
    setActiveAlertReason('');
  }, []);

  return {
    config,
    setConfig,
    metrics,
    alertState,
    activeAlertReason,
    alertLogs,
    drowsyEventCount,
    lastEventTime,
    isCameraActive,
    isModelLoading,
    modelError,
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    historyBuffer,
    isCalibrating,
    calibrationProgress,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    startCalibration,
    clearAlertLogs,
    acknowledgeAlert,
  };
}
