import React from 'react';
import { DetectionConfig } from '../types';
import { X, RotateCcw, Crosshair } from 'lucide-react';
import { alarmAudio } from '../utils/audio';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: DetectionConfig;
  onChangeConfig: (newConfig: DetectionConfig) => void;
  onStartCalibration: () => void;
  isCameraActive: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onChangeConfig,
  onStartCalibration,
  isCameraActive,
}) => {
  if (!isOpen) return null;

  const handleResetDefaults = () => {
    onChangeConfig({
      earThreshold: 0.25,
      earConsecutiveFrames: 20,
      earPersistentFrames: 35,
      marThreshold: 0.60,
      marConsecutiveFrames: 15,
      marPersistentFrames: 30,
      headPitchThreshold: -14,
      headNodConsecutiveFrames: 15,
      headNodPersistentFrames: 35,
      soundEnabled: true,
      soundVolume: 0.8,
      alarmPitch: 880,
      showMeshOverlay: true,
      showLandmarkPoints: false,
      mirrorWebcam: true,
    });
  };

  const handleTestBeep = () => {
    alarmAudio.playTestBeep();
  };

  return (
    <div
      id="settings-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/85 p-4 overflow-y-auto font-mono"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="settings-modal-panel"
        className="relative w-full max-w-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0a0a0a] p-6 shadow-2xl text-zinc-700 dark:text-zinc-300 my-8 space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div>
            <h2 className="text-xs text-zinc-500 uppercase tracking-[0.2em]">
              SYSTEM CONFIGURATION
            </h2>
            <p className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider mt-0.5">
              DETECTION & ALERT PARAMETERS
            </p>
          </div>

          <button
            id="btn-close-settings"
            type="button"
            onClick={onClose}
            className="p-1 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Calibration Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30 p-3">
          <div>
            <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
              DRIVER BIOMETRIC BASELINE
            </h4>
            <p className="text-[10px] text-zinc-500 uppercase mt-0.5">
              3-SECOND EYE & POSTURE CALIBRATION
            </p>
          </div>
          <button
            id="btn-modal-calibrate"
            type="button"
            disabled={!isCameraActive}
            onClick={() => {
              onStartCalibration();
              onClose();
            }}
            className="flex items-center gap-1.5 bg-red-600 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-red-500 transition-colors disabled:opacity-40 cursor-pointer"
          >
            <Crosshair className="h-3.5 w-3.5" />
            CALIBRATE
          </button>
        </div>

        {/* Section 1: Eye Aspect Ratio (EAR) */}
        <div className="space-y-3">
          <div className="text-[10px] text-zinc-500 uppercase tracking-[0.2em]">
            EYE ASPECT RATIO (EAR)
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <label htmlFor="input-ear-threshold" className="text-zinc-600 dark:text-zinc-400">THRESHOLD</label>
                <span className="font-bold text-red-600 dark:text-red-500">{config.earThreshold.toFixed(2)}</span>
              </div>
              <input
                id="input-ear-threshold"
                type="range"
                min="0.18"
                max="0.35"
                step="0.01"
                value={config.earThreshold}
                onChange={(e) =>
                  onChangeConfig({ ...config, earThreshold: parseFloat(e.target.value) })
                }
                className="w-full accent-red-600"
              />
              <span className="text-[9px] text-zinc-400 dark:text-zinc-600 uppercase">Default: 0.25</span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <label htmlFor="input-ear-frames" className="text-zinc-600 dark:text-zinc-400">TRIGGER FRAMES</label>
                <span className="font-bold text-zinc-900 dark:text-white">{config.earConsecutiveFrames}f</span>
              </div>
              <input
                id="input-ear-frames"
                type="range"
                min="10"
                max="45"
                step="1"
                value={config.earConsecutiveFrames}
                onChange={(e) =>
                  onChangeConfig({ ...config, earConsecutiveFrames: parseInt(e.target.value, 10) })
                }
                className="w-full accent-red-600"
              />
              <span className="text-[9px] text-zinc-400 dark:text-zinc-600 uppercase">Default: 20 frames</span>
            </div>
          </div>
        </div>

        {/* Section 2: Mouth Aspect Ratio (MAR) */}
        <div className="space-y-3 border-t border-zinc-200 dark:border-zinc-800/80 pt-3">
          <div className="text-[10px] text-zinc-500 uppercase tracking-[0.2em]">
            MOUTH ASPECT RATIO (MAR)
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <label htmlFor="input-mar-threshold" className="text-zinc-600 dark:text-zinc-400">THRESHOLD</label>
                <span className="font-bold text-blue-600 dark:text-blue-400">{config.marThreshold.toFixed(2)}</span>
              </div>
              <input
                id="input-mar-threshold"
                type="range"
                min="0.45"
                max="0.80"
                step="0.01"
                value={config.marThreshold}
                onChange={(e) =>
                  onChangeConfig({ ...config, marThreshold: parseFloat(e.target.value) })
                }
                className="w-full accent-blue-500"
              />
              <span className="text-[9px] text-zinc-400 dark:text-zinc-600 uppercase">Default: 0.60</span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <label htmlFor="input-mar-frames" className="text-zinc-600 dark:text-zinc-400">TRIGGER FRAMES</label>
                <span className="font-bold text-zinc-900 dark:text-white">{config.marConsecutiveFrames}f</span>
              </div>
              <input
                id="input-mar-frames"
                type="range"
                min="5"
                max="35"
                step="1"
                value={config.marConsecutiveFrames}
                onChange={(e) =>
                  onChangeConfig({ ...config, marConsecutiveFrames: parseInt(e.target.value, 10) })
                }
                className="w-full accent-blue-500"
              />
              <span className="text-[9px] text-zinc-400 dark:text-zinc-600 uppercase">Default: 15 frames</span>
            </div>
          </div>
        </div>

        {/* Section 3: Head Tilt Pose */}
        <div className="space-y-3 border-t border-zinc-200 dark:border-zinc-800/80 pt-3">
          <div className="text-[10px] text-zinc-500 uppercase tracking-[0.2em]">
            HEAD NODDING PITCH
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <label htmlFor="input-head-pitch" className="text-zinc-600 dark:text-zinc-400">PITCH LIMIT</label>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{config.headPitchThreshold}°</span>
              </div>
              <input
                id="input-head-pitch"
                type="range"
                min="-25"
                max="-8"
                step="1"
                value={config.headPitchThreshold}
                onChange={(e) =>
                  onChangeConfig({ ...config, headPitchThreshold: parseInt(e.target.value, 10) })
                }
                className="w-full accent-emerald-500"
              />
              <span className="text-[9px] text-zinc-400 dark:text-zinc-600 uppercase">Default: -14°</span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <label htmlFor="input-nod-frames" className="text-zinc-600 dark:text-zinc-400">TRIGGER FRAMES</label>
                <span className="font-bold text-zinc-900 dark:text-white">{config.headNodConsecutiveFrames}f</span>
              </div>
              <input
                id="input-nod-frames"
                type="range"
                min="8"
                max="30"
                step="1"
                value={config.headNodConsecutiveFrames}
                onChange={(e) =>
                  onChangeConfig({ ...config, headNodConsecutiveFrames: parseInt(e.target.value, 10) })
                }
                className="w-full accent-emerald-500"
              />
              <span className="text-[9px] text-zinc-400 dark:text-zinc-600 uppercase">Default: 15 frames</span>
            </div>
          </div>
        </div>

        {/* Section 4: Audio Alarm Controls */}
        <div className="space-y-3 border-t border-zinc-200 dark:border-zinc-800/80 pt-3">
          <div className="flex items-center justify-between">
            <div className="text-[10px] text-zinc-500 uppercase tracking-[0.2em]">
              AUDIO ALERT ALARM
            </div>
            <button
              type="button"
              onClick={handleTestBeep}
              className="text-[10px] text-red-600 dark:text-red-500 hover:text-red-500 uppercase tracking-wider cursor-pointer"
            >
              [TEST TONE]
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <label className="flex items-center gap-2 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={config.soundEnabled}
                onChange={(e) => onChangeConfig({ ...config, soundEnabled: e.target.checked })}
                className="h-3.5 w-3.5 accent-red-600"
              />
              <span className="uppercase text-zinc-800 dark:text-zinc-300">Audible Siren On Alert</span>
            </label>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500 uppercase">VOLUME</span>
                <span className="font-bold text-zinc-900 dark:text-white">
                  {Math.round(config.soundVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                disabled={!config.soundEnabled}
                value={config.soundVolume}
                onChange={(e) =>
                  onChangeConfig({ ...config, soundVolume: parseFloat(e.target.value) })
                }
                className="w-full accent-red-600 disabled:opacity-30"
              />
            </div>
          </div>
        </div>

        {/* Section 5: Overlays */}
        <div className="space-y-2 border-t border-zinc-200 dark:border-zinc-800/80 pt-3">
          <div className="text-[10px] text-zinc-500 uppercase tracking-[0.2em]">
            DISPLAY OVERLAYS
          </div>

          <div className="grid grid-cols-3 gap-2 text-[11px] uppercase text-zinc-700 dark:text-zinc-300">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={config.showMeshOverlay}
                onChange={(e) =>
                  onChangeConfig({ ...config, showMeshOverlay: e.target.checked })
                }
                className="accent-red-600"
              />
              <span>Mesh Lines</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={config.showLandmarkPoints}
                onChange={(e) =>
                  onChangeConfig({ ...config, showLandmarkPoints: e.target.checked })
                }
                className="accent-red-600"
              />
              <span>Points</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={config.mirrorWebcam}
                onChange={(e) =>
                  onChangeConfig({ ...config, mirrorWebcam: e.target.checked })
                }
                className="accent-red-600"
              />
              <span>Mirror</span>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-4">
          <button
            id="btn-reset-defaults"
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-900 dark:hover:text-white uppercase tracking-wider transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
            RESET DEFAULTS
          </button>

          <button
            id="btn-save-close-settings"
            type="button"
            onClick={onClose}
            className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 px-4 py-1.5 text-xs font-bold uppercase tracking-wider hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors cursor-pointer"
          >
            SAVE & CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
