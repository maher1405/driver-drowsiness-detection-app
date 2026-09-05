import React from 'react';
import { DetectionConfig, DetectionMetrics, AlertState } from '../types';
import {
  Camera,
  CameraOff,
  FlipHorizontal,
  RefreshCw,
  Eye,
  Crosshair,
} from 'lucide-react';

interface CameraViewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isCameraActive: boolean;
  isModelLoading: boolean;
  modelError: string | null;
  metrics: DetectionMetrics;
  alertState: AlertState;
  config: DetectionConfig;
  devices: MediaDeviceInfo[];
  selectedDeviceId: string;
  isCalibrating: boolean;
  calibrationProgress: number;
  onStartCamera: (deviceId?: string) => void;
  onStopCamera: () => void;
  onToggleMirror: () => void;
  onToggleMesh: () => void;
  onSelectDevice: (deviceId: string) => void;
  onStartCalibration: () => void;
}

export const CameraView: React.FC<CameraViewProps> = ({
  videoRef,
  canvasRef,
  isCameraActive,
  isModelLoading,
  modelError,
  metrics,
  alertState,
  config,
  devices,
  selectedDeviceId,
  isCalibrating,
  calibrationProgress,
  onStartCamera,
  onStopCamera,
  onToggleMirror,
  onToggleMesh,
  onSelectDevice,
  onStartCalibration,
}) => {
  return (
    <div
      id="camera-view-container"
      className="relative flex flex-col border border-zinc-800 bg-zinc-900/40 p-4 font-mono shadow-xl overflow-hidden"
    >
      {/* Top Video Header / Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-red-600" />
          <h2 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            OPTICAL SENSOR FEED
            {isCameraActive && (
              <span className="text-[10px] text-zinc-500 font-normal">
                [{metrics.fps} FPS]
              </span>
            )}
          </h2>
        </div>

        {/* Video Controls */}
        <div className="flex items-center gap-1.5">
          {devices.length > 1 && (
            <select
              id="camera-device-select"
              value={selectedDeviceId}
              onChange={(e) => {
                onSelectDevice(e.target.value);
                if (isCameraActive) onStartCamera(e.target.value);
              }}
              className="h-7 border border-zinc-800 bg-zinc-950 px-2 text-[10px] uppercase text-zinc-300 focus:outline-none max-w-[130px] truncate"
            >
              {devices.map((device, idx) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `DEV_${idx + 1}`}
                </option>
              ))}
            </select>
          )}

          <button
            id="btn-toggle-mirror"
            type="button"
            onClick={onToggleMirror}
            title={config.mirrorWebcam ? 'Mirror: On' : 'Mirror: Off'}
            className={`flex h-7 w-7 items-center justify-center border text-[10px] transition-colors cursor-pointer ${
              config.mirrorWebcam
                ? 'border-red-900 bg-red-950/40 text-red-400'
                : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FlipHorizontal className="h-3.5 w-3.5" />
          </button>

          <button
            id="btn-toggle-mesh"
            type="button"
            onClick={onToggleMesh}
            title={config.showMeshOverlay ? 'Facial Mesh Overlay: Enabled' : 'Facial Mesh Overlay: Disabled'}
            className={`flex h-7 w-7 items-center justify-center border text-[10px] transition-colors cursor-pointer ${
              config.showMeshOverlay
                ? 'border-blue-900 bg-blue-950/40 text-blue-400'
                : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
          </button>

          <button
            id="btn-quick-calibrate"
            type="button"
            disabled={!isCameraActive || isCalibrating}
            onClick={onStartCalibration}
            title="Auto-Calibrate Neutral Eye & Face Baseline"
            className="flex items-center gap-1 h-7 px-2 border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-zinc-300 text-[10px] uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Crosshair className="h-3 w-3 text-red-500" />
            <span className="hidden sm:inline">Calibrate</span>
          </button>
        </div>
      </div>

      {/* Video Viewport Stage */}
      <div
        id="camera-viewport"
        className={`relative mt-3 aspect-[4/3] sm:aspect-[16/10] w-full overflow-hidden bg-zinc-950 border transition-all duration-300 flex items-center justify-center ${
          alertState === 'Drowsy'
            ? 'border-red-600 shadow-[inset_0_0_100px_rgba(220,38,38,0.2)]'
            : alertState === 'Warning'
            ? 'border-yellow-600'
            : 'border-zinc-800'
        }`}
      >
        {/* Background placeholder subtle wireframe when camera active */}
        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
          <svg width="240" height="240" viewBox="0 0 100 100" className="text-red-500">
            <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2,2" />
            <path d="M30,40 Q50,35 70,40 M30,65 Q50,75 70,65" fill="none" stroke="currentColor" strokeWidth="1" />
            <circle cx="35" cy="45" r="2" fill="currentColor" />
            <circle cx="65" cy="45" r="2" fill="currentColor" />
          </svg>
        </div>

        {/* Hidden or active HTML5 video element */}
        <video
          ref={videoRef}
          id="webcam-feed"
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
            isCameraActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
          } ${config.mirrorWebcam ? 'scale-x-[-1]' : ''}`}
        />

        {/* Overlay Canvas for Landmark Mesh & HUD Vectors */}
        <canvas
          ref={canvasRef}
          id="landmarks-overlay-canvas"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover z-10"
        />

        {/* Red Alarm Overlay Border & Box */}
        {alertState === 'Drowsy' && (
          <>
            <div className="absolute inset-0 border-2 border-red-600 pointer-events-none opacity-60 shadow-[inset_0_0_100px_rgba(220,38,38,0.25)] z-20 animate-pulse" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center z-30 pointer-events-none px-4">
              <div className="bg-red-600 text-white font-bold py-3 sm:py-4 px-6 sm:px-10 inline-block border-2 border-white shadow-2xl">
                <p className="text-lg sm:text-2xl tracking-[0.2em] mb-1 uppercase">DROWSINESS DETECTED</p>
                <p className="text-[10px] sm:text-xs opacity-90 uppercase tracking-wider">IMMEDIATE AUDIO ALERT ACTIVE</p>
              </div>
            </div>
          </>
        )}

        {/* Calibration HUD Overlay Banner */}
        {isCalibrating && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/85 p-4">
            <div className="max-w-xs text-center space-y-3">
              <div className="inline-flex h-10 w-10 items-center justify-center border border-zinc-700 bg-zinc-900 text-red-500 animate-spin">
                <Crosshair className="h-5 w-5" />
              </div>
              <h3 className="text-xs font-bold text-white uppercase tracking-[0.2em]">
                CALIBRATING BASELINE
              </h3>
              <p className="text-[11px] text-zinc-400">
                LOOK STRAIGHT AHEAD WITH NATURAL GAZE
              </p>
              <div className="w-full bg-zinc-900 border border-zinc-800 h-1.5 overflow-hidden">
                <div
                  className="bg-red-600 h-full transition-all duration-100"
                  style={{ width: `${calibrationProgress}%` }}
                />
              </div>
              <span className="text-[10px] text-zinc-500 uppercase">
                {calibrationProgress}% COMPLETE
              </span>
            </div>
          </div>
        )}

        {/* Inactive or Loading Splash View */}
        {!isCameraActive && (
          <div className="relative z-10 flex flex-col items-center justify-center p-6 text-center space-y-4 max-w-sm">
            <div className="flex h-12 w-12 items-center justify-center border border-zinc-800 bg-zinc-950 text-zinc-500">
              {isModelLoading ? (
                <RefreshCw className="h-6 w-6 animate-spin text-red-500" />
              ) : (
                <CameraOff className="h-6 w-6 text-zinc-600" />
              )}
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {isModelLoading
                  ? 'INITIALIZING NEURAL VISION'
                  : modelError
                  ? 'SENSOR / MODEL ERROR'
                  : 'OPTICAL SENSOR OFFLINE'}
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed uppercase">
                {isModelLoading
                  ? 'Loading MediaPipe Face Mesh model assets...'
                  : modelError
                  ? modelError
                  : 'Start optical sensor to enable facial landmark monitoring.'}
              </p>
            </div>

            {!isModelLoading && (
              <button
                id="btn-start-camera-splash"
                type="button"
                onClick={() => onStartCamera(selectedDeviceId)}
                className="flex items-center gap-2 bg-red-600 px-5 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-red-500 border border-red-400 transition-colors cursor-pointer"
              >
                <Camera className="h-3.5 w-3.5" />
                Initialize Feed
              </button>
            )}
          </div>
        )}

        {/* Minimalist Top HUD Badges */}
        {isCameraActive && (
          <>
            <div className="absolute top-3 left-3 z-10 flex gap-2">
              <div className="px-2 py-1 bg-zinc-900/90 text-[10px] border border-zinc-700 uppercase tracking-wider text-zinc-300">
                720P {metrics.fps}FPS
              </div>
              <div
                className={`px-2 py-1 text-[10px] uppercase tracking-wider border ${
                  metrics.faceDetected
                    ? 'bg-zinc-900/90 text-emerald-400 border-zinc-700'
                    : 'bg-red-950/80 text-red-400 border-red-800 animate-pulse'
                }`}
              >
                {metrics.faceDetected ? 'DETECTION ON' : 'SEARCHING'}
              </div>
            </div>

            {/* Bottom HUD: Live readings */}
            <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
              <div className="flex items-center gap-3 bg-zinc-950/90 border border-zinc-800 px-2.5 py-1 text-[10px] uppercase tracking-wider text-zinc-400">
                <span>
                  EAR: <strong className={metrics.ear < config.earThreshold ? 'text-red-500' : 'text-white'}>{metrics.ear.toFixed(2)}</strong>
                </span>
                <span>
                  MAR: <strong className={metrics.mar > config.marThreshold ? 'text-red-500' : 'text-white'}>{metrics.mar.toFixed(2)}</strong>
                </span>
                <span>
                  PITCH: <strong className={metrics.headPitch <= config.headPitchThreshold ? 'text-red-500' : 'text-white'}>{metrics.headPitch}°</strong>
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Camera Control Footer Buttons */}
      <div className="mt-3 flex items-center justify-between gap-3 pt-2 text-[10px] uppercase text-zinc-500 tracking-wider">
        <span>WebAssembly Engine • Zero Cloud Transmission</span>

        {isCameraActive ? (
          <button
            id="btn-stop-camera"
            type="button"
            onClick={onStopCamera}
            className="flex items-center gap-1.5 border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-300 hover:text-white hover:border-zinc-700 transition-colors cursor-pointer"
          >
            <CameraOff className="h-3.5 w-3.5 text-red-500" />
            Stop Sensor
          </button>
        ) : (
          <button
            id="btn-start-camera"
            type="button"
            disabled={isModelLoading}
            onClick={() => onStartCamera(selectedDeviceId)}
            className="flex items-center gap-1.5 bg-red-600 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-red-500 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Camera className="h-3.5 w-3.5" />
            Start Sensor
          </button>
        )}
      </div>
    </div>
  );
};
