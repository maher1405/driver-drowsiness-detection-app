import { useState, useEffect, useRef, useCallback } from 'react';
import {
  AlertLogItem,
  AlertState,
  DetectionConfig,
  DetectionMetrics,
  NormalizedLandmark,
  CameraErrorInfo,
} from '../types';
import { getFaceLandmarker, detectFace } from '../services/faceLandmarkerService';
import { computeAverageEAR, computeMAR, estimateHeadPose } from '../utils/math';
import { drawFaceLandmarks } from '../utils/canvasDrawing';
import { alarmAudio } from '../utils/audio';

export function parseCameraError(err: unknown): CameraErrorInfo {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return {
      code: 'UNSUPPORTED',
      title: 'CAMERA API NOT SUPPORTED',
      message: 'Your browser environment or current security context does not support video streaming.',
      suggestion: 'Ensure you are running the application over HTTPS or localhost on a supported modern browser.',
      rawError: String(err),
    };
  }

  if (err instanceof DOMException || (err && typeof err === 'object' && 'name' in err)) {
    const domErr = err as DOMException;
    switch (domErr.name) {
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return {
          code: 'NOT_FOUND',
          title: 'NO CAMERA DETECTED',
          message: 'No video capture hardware or optical sensor was found on your system.',
          suggestion: 'Ensure your webcam is plugged into a USB port, turned on, and not disabled in system settings.',
          rawError: domErr.message || domErr.name,
        };
      case 'NotAllowedError':
      case 'PermissionDeniedError':
      case 'SecurityError':
        return {
          code: 'NOT_ALLOWED',
          title: 'CAMERA PERMISSION DENIED',
          message: 'Camera access permission was denied by your browser or operating system.',
          suggestion: 'Click the camera or lock icon in your browser address bar to allow camera access, then retry.',
          rawError: domErr.message || domErr.name,
        };
      case 'NotReadableError':
      case 'TrackStartError':
        return {
          code: 'NOT_READABLE',
          title: 'CAMERA BUSY / HARDWARE IN USE',
          message: 'The optical sensor could not be started because another application is locking it.',
          suggestion: 'Close video conferencing apps (Zoom, Teams, Google Meet, Skype, OBS) and retry.',
          rawError: domErr.message || domErr.name,
        };
      case 'OverconstrainedError':
      case 'ConstraintNotSatisfiedError':
        return {
          code: 'OVERCONSTRAINED',
          title: 'CAMERA CONSTRAINTS UNSUPPORTED',
          message: 'The requested video format or resolution constraints cannot be delivered by this camera.',
          suggestion: 'Select a different connected camera or restart feed with standard resolution settings.',
          rawError: domErr.message || domErr.name,
        };
      case 'AbortError':
        return {
          code: 'GENERIC',
          title: 'CAMERA INITIALIZATION ABORTED',
          message: 'Camera activation was interrupted or timed out.',
          suggestion: 'Click Initialize Feed to try starting the webcam again.',
          rawError: domErr.message || domErr.name,
        };
    }
  }

  const errStr = String(err || '').toLowerCase();
  if (
    errStr.includes('not found') ||
    errStr.includes('no device') ||
    errStr.includes('device not found') ||
    errStr.includes('camera not detected')
  ) {
    return {
      code: 'NOT_FOUND',
      title: 'NO CAMERA DETECTED',
      message: 'No video capture hardware or optical sensor was found on your system.',
      suggestion: 'Connect an external USB webcam or ensure your device\'s built-in camera is enabled.',
      rawError: String(err),
    };
  }

  return {
    code: 'GENERIC',
    title: 'OPTICAL SENSOR ERROR',
    message: err instanceof Error ? err.message : 'An error occurred while starting the camera.',
    suggestion: 'Verify hardware connections and permissions, then click Retry.',
    rawError: String(err),
  };
}

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
  const [cameraError, setCameraError] = useState<CameraErrorInfo | null>(null);
  const [isCheckingDevices, setIsCheckingDevices] = useState<boolean>(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  // History buffer for sparkline graph
  const [historyBuffer, setHistoryBuffer] = useState<{ ear: number; mar: number; pitch: number }[]>([]);

  // Calibration state
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const [calibrationProgress, setCalibrationProgress] = useState<number>(0);

  // Snooze state (pauses alerts for 30s)
  const [isSnoozed, setIsSnoozed] = useState<boolean>(false);
  const [snoozeTimeRemaining, setSnoozeTimeRemaining] = useState<number>(0);
  const snoozeUntilRef = useRef<number | null>(null);

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

  // Snooze countdown timer
  useEffect(() => {
    if (!isSnoozed) return;
    const interval = setInterval(() => {
      if (snoozeUntilRef.current) {
        const remaining = Math.max(0, Math.ceil((snoozeUntilRef.current - Date.now()) / 1000));
        setSnoozeTimeRemaining(remaining);
        if (remaining <= 0) {
          snoozeUntilRef.current = null;
          setIsSnoozed(false);
          setSnoozeTimeRemaining(0);
        }
      } else {
        setIsSnoozed(false);
        setSnoozeTimeRemaining(0);
      }
    }, 250);
    return () => clearInterval(interval);
  }, [isSnoozed]);

  // Update volume on audio controller
  useEffect(() => {
    alarmAudio.setVolume(config.soundVolume);
  }, [config.soundVolume]);

  // Load available camera devices
  const refreshDevices = useCallback(async (): Promise<MediaDeviceInfo[]> => {
    setIsCheckingDevices(true);
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        setDevices([]);
        return [];
      }
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices.filter((d) => d.kind === 'videoinput');
      setDevices(videoInputs);
      if (videoInputs.length > 0) {
        // If we previously had a NOT_FOUND error and now devices exist, clear it
        setCameraError((prev) => (prev?.code === 'NOT_FOUND' ? null : prev));
        if (!selectedDeviceId || !videoInputs.some((d) => d.deviceId === selectedDeviceId)) {
          setSelectedDeviceId(videoInputs[0].deviceId);
        }
      } else if (allDevices.length > 0) {
        // Devices enumerated, but 0 video cameras
        setSelectedDeviceId('');
      }
      return videoInputs;
    } catch (e) {
      console.warn('Could not enumerate devices:', e);
      return [];
    } finally {
      setIsCheckingDevices(false);
    }
  }, [selectedDeviceId]);

  // Listen for hardware plug/unplug events
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.addEventListener) return;
    const handleDeviceChange = () => {
      refreshDevices();
    };
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [refreshDevices]);

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
    setCameraError(null);
    setModelError(null);

    // 1. Verify Browser API support
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const errInfo: CameraErrorInfo = {
        code: 'UNSUPPORTED',
        title: 'CAMERA API NOT SUPPORTED',
        message: 'Your browser environment or current window context does not support webcam capture.',
        suggestion: 'Ensure you are running the application over HTTPS or localhost on a modern browser (Chrome, Edge, Safari, Firefox).',
      };
      setCameraError(errInfo);
      setIsCameraActive(false);
      return;
    }

    // 2. Pre-check device enumeration if available
    try {
      if (navigator.mediaDevices.enumerateDevices) {
        const availableDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = availableDevices.filter((d) => d.kind === 'videoinput');
        setDevices(videoDevices);
        // If devices exist but strictly 0 video capture inputs:
        if (availableDevices.length > 0 && videoDevices.length === 0) {
          const notFoundError: CameraErrorInfo = {
            code: 'NOT_FOUND',
            title: 'NO CAMERA DETECTED',
            message: 'No video capture hardware or optical sensor was found on your system.',
            suggestion: 'Connect an external USB webcam or verify your integrated camera is enabled in device settings.',
          };
          setCameraError(notFoundError);
          setIsCameraActive(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Pre-check device enumeration notice:', e);
    }

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const targetDeviceId = deviceIdToUse || selectedDeviceId;
      const constraints: MediaStreamConstraints = {
        video: targetDeviceId
          ? { deviceId: { exact: targetDeviceId }, width: { ideal: 640 }, height: { ideal: 480 } }
          : { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstErr) {
        // If exact device constraint failed (e.g. OverconstrainedError or device disconnected), attempt generic fallback
        if (targetDeviceId && firstErr instanceof DOMException && (firstErr.name === 'OverconstrainedError' || firstErr.name === 'NotFoundError')) {
          console.warn('Specified deviceId failed, attempting fallback to default camera...');
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
            audio: false,
          });
        } else {
          throw firstErr;
        }
      }

      streamRef.current = stream;

      // Monitor hardware disconnection during active stream
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          console.warn('Camera video track terminated unexpectedly (camera disconnected)');
          setCameraError({
            code: 'DISCONNECTED',
            title: 'CAMERA DISCONNECTED',
            message: 'The optical sensor video stream was terminated or the camera was unplugged.',
            suggestion: 'Reconnect your camera, ensure cables are secure, and click Reconnect Feed.',
          });
          setIsCameraActive(false);
          alarmAudio.stopAlarm();
        };
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsCameraActive(true);
      setCameraError(null);
      await refreshDevices();
    } catch (err) {
      console.error('Error starting camera:', err);
      const parsed = parseCameraError(err);
      setCameraError(parsed);
      setIsCameraActive(false);
    }
  }, [refreshDevices, selectedDeviceId]);

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

            // Check if snooze mode is active
            const isCurrentlySnoozed =
              snoozeUntilRef.current !== null && Date.now() < snoozeUntilRef.current;

            if (isCurrentlySnoozed) {
              eyesClosedCounterRef.current = 0;
              yawningCounterRef.current = 0;
              headNodCounterRef.current = 0;
              if (isDrowsyActiveRef.current) {
                isDrowsyActiveRef.current = false;
                alarmAudio.stopAlarm();
              }
            } else if (snoozeUntilRef.current !== null) {
              // Snooze just expired
              snoozeUntilRef.current = null;
              setIsSnoozed(false);
              setSnoozeTimeRemaining(0);
            }

            // Signal 1: Eyes Closed
            if (!isCurrentlySnoozed && ear < cfg.earThreshold) {
              eyesClosedCounterRef.current += 1;
            } else {
              eyesClosedCounterRef.current = Math.max(0, eyesClosedCounterRef.current - 1);
            }
            const isEyesClosed = !isCurrentlySnoozed && eyesClosedCounterRef.current >= cfg.earConsecutiveFrames;
            const isPersistentEyesClosed = !isCurrentlySnoozed && eyesClosedCounterRef.current >= cfg.earPersistentFrames;

            // Signal 2: Yawning
            if (!isCurrentlySnoozed && mar > cfg.marThreshold) {
              yawningCounterRef.current += 1;
            } else {
              yawningCounterRef.current = Math.max(0, yawningCounterRef.current - 1);
            }
            const isYawning = !isCurrentlySnoozed && yawningCounterRef.current >= cfg.marConsecutiveFrames;
            const isPersistentYawning = !isCurrentlySnoozed && yawningCounterRef.current >= cfg.marPersistentFrames;

            // Signal 3: Head Nodding
            if (!isCurrentlySnoozed && pitch <= cfg.headPitchThreshold) {
              headNodCounterRef.current += 1;
            } else {
              headNodCounterRef.current = Math.max(0, headNodCounterRef.current - 1);
            }
            const isHeadNodding = !isCurrentlySnoozed && headNodCounterRef.current >= cfg.headNodConsecutiveFrames;
            const isPersistentHeadNodding = !isCurrentlySnoozed && headNodCounterRef.current >= cfg.headNodPersistentFrames;

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
            const isCriticalDrowsy = !isCurrentlySnoozed && (activeSignalCount >= 2 || persistentReason.length > 0);

            // WARNING STATE: 1 active signal or borderline
            const isWarning = !isCurrentlySnoozed && !isCriticalDrowsy && (
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

              if (isCurrentlySnoozed) {
                setAlertState('Normal');
                setActiveAlertReason('');
              } else if (!isDrowsyActiveRef.current) {
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

  const snoozeAlert = useCallback((durationSeconds: number = 30) => {
    alarmAudio.stopAlarm();
    isDrowsyActiveRef.current = false;
    eyesClosedCounterRef.current = 0;
    yawningCounterRef.current = 0;
    headNodCounterRef.current = 0;
    safeRecoveryCounterRef.current = 0;
    snoozeUntilRef.current = Date.now() + durationSeconds * 1000;
    setIsSnoozed(true);
    setSnoozeTimeRemaining(durationSeconds);
    setAlertState('Normal');
    setActiveAlertReason('');
  }, []);

  const cancelSnooze = useCallback(() => {
    snoozeUntilRef.current = null;
    setIsSnoozed(false);
    setSnoozeTimeRemaining(0);
  }, []);

  const clearCameraError = useCallback(() => {
    setCameraError(null);
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
    cameraError,
    devices,
    isCheckingDevices,
    selectedDeviceId,
    setSelectedDeviceId,
    historyBuffer,
    isCalibrating,
    calibrationProgress,
    isSnoozed,
    snoozeTimeRemaining,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    refreshDevices,
    clearCameraError,
    startCalibration,
    clearAlertLogs,
    acknowledgeAlert,
    snoozeAlert,
    cancelSnooze,
  };
}
