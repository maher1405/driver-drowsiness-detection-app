import React from 'react';
import { DetectionConfig, DetectionMetrics, AlertState } from '../types';

interface StatusPanelProps {
  metrics: DetectionMetrics;
  config: DetectionConfig;
  alertState: AlertState;
  drowsyEventCount: number;
  lastEventTime: string | null;
}

export const StatusPanel: React.FC<StatusPanelProps> = ({
  metrics,
  config,
  alertState,
  drowsyEventCount,
  lastEventTime,
}) => {
  // Normalize progress percentages for gauges
  const earGaugePercent = Math.min(
    100,
    Math.max(0, Math.round(((metrics.ear - 0.1) / (0.45 - 0.1)) * 100))
  );

  const marGaugePercent = Math.min(
    100,
    Math.max(0, Math.round(((metrics.mar - 0.05) / (0.90 - 0.05)) * 100))
  );

  // Pitch range: -35 deg to +20 deg
  const pitchClamped = Math.max(-35, Math.min(20, metrics.headPitch));
  const pitchPercent = Math.min(
    100,
    Math.max(0, Math.round(((pitchClamped - -35) / (20 - -35)) * 100))
  );

  return (
    <div id="telemetry-status-panel" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
      {/* 1. Eye Aspect Ratio (EAR) */}
      <div
        id="card-ear-telemetry"
        className="bg-zinc-900/40 border border-zinc-800 p-4 flex flex-col justify-between"
      >
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[10px] text-zinc-500 uppercase tracking-[0.2em]">
              Live Analytics
            </h3>
            <span
              className={`text-[9px] uppercase px-1.5 py-0.5 border ${
                metrics.isEyesClosed
                  ? 'bg-red-950 border-red-800 text-red-500 animate-pulse'
                  : metrics.ear < config.earThreshold
                  ? 'bg-yellow-950 border-yellow-800 text-yellow-500'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-500'
              }`}
            >
              {metrics.isEyesClosed ? 'CRITICAL' : metrics.ear < config.earThreshold ? 'WARNING' : 'STABLE'}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400">Eye Aspect (EAR)</span>
              <span
                className={`font-bold ${
                  metrics.isEyesClosed
                    ? 'text-red-500'
                    : metrics.ear < config.earThreshold
                    ? 'text-yellow-500'
                    : 'text-white'
                }`}
              >
                {metrics.ear.toFixed(2)}
              </span>
            </div>

            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-150 ${
                  metrics.isEyesClosed
                    ? 'bg-red-600'
                    : metrics.ear < config.earThreshold
                    ? 'bg-yellow-500'
                    : 'bg-blue-500'
                }`}
                style={{ width: `${earGaugePercent}%` }}
              />
            </div>

            <div className="text-[9px] text-zinc-600 flex justify-between uppercase tracking-wider">
              <span>Threshold: {config.earThreshold.toFixed(2)}</span>
              <span>L:{metrics.leftEar.toFixed(2)} R:{metrics.rightEar.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-2 border-t border-zinc-800/80 flex justify-between text-[10px] uppercase">
          <span className="text-zinc-500">Consecutive</span>
          <span className={metrics.eyesClosedFrames >= config.earConsecutiveFrames ? 'text-red-500 font-bold' : 'text-zinc-400'}>
            {metrics.eyesClosedFrames} / {config.earConsecutiveFrames} Frames
          </span>
        </div>
      </div>

      {/* 2. Mouth Aspect Ratio (MAR) */}
      <div
        id="card-mar-telemetry"
        className="bg-zinc-900/40 border border-zinc-800 p-4 flex flex-col justify-between"
      >
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[10px] text-zinc-500 uppercase tracking-[0.2em]">
              Yawn Detection
            </h3>
            <span
              className={`text-[9px] uppercase px-1.5 py-0.5 border ${
                metrics.isYawning
                  ? 'bg-red-950 border-red-800 text-red-500 animate-pulse'
                  : metrics.mar > config.marThreshold
                  ? 'bg-yellow-950 border-yellow-800 text-yellow-500'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-500'
              }`}
            >
              {metrics.isYawning ? 'YAWN ACTIVE' : metrics.mar > config.marThreshold ? 'OPENING' : 'STABLE'}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400">Mouth Aspect (MAR)</span>
              <span
                className={`font-bold ${
                  metrics.isYawning
                    ? 'text-red-500'
                    : metrics.mar > config.marThreshold
                    ? 'text-yellow-500'
                    : 'text-white'
                }`}
              >
                {metrics.mar.toFixed(2)}
              </span>
            </div>

            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-150 ${
                  metrics.isYawning
                    ? 'bg-red-600'
                    : metrics.mar > config.marThreshold
                    ? 'bg-yellow-500'
                    : 'bg-blue-500'
                }`}
                style={{ width: `${marGaugePercent}%` }}
              />
            </div>

            <div className="text-[9px] text-zinc-600 flex justify-between uppercase tracking-wider">
              <span>Threshold: {config.marThreshold.toFixed(2)}</span>
              <span>LIMIT: 0.60</span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-2 border-t border-zinc-800/80 flex justify-between text-[10px] uppercase">
          <span className="text-zinc-500">Consecutive</span>
          <span className={metrics.yawningFrames >= config.marConsecutiveFrames ? 'text-red-500 font-bold' : 'text-zinc-400'}>
            {metrics.yawningFrames} / {config.marConsecutiveFrames} Frames
          </span>
        </div>
      </div>

      {/* 3. Head Pitch */}
      <div
        id="card-pose-telemetry"
        className="bg-zinc-900/40 border border-zinc-800 p-4 flex flex-col justify-between"
      >
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[10px] text-zinc-500 uppercase tracking-[0.2em]">
              Head Orientation
            </h3>
            <span
              className={`text-[9px] uppercase px-1.5 py-0.5 border ${
                metrics.isHeadNodding
                  ? 'bg-red-950 border-red-800 text-red-500 animate-pulse'
                  : metrics.headPitch <= config.headPitchThreshold
                  ? 'bg-yellow-950 border-yellow-800 text-yellow-500'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-500'
              }`}
            >
              {metrics.isHeadNodding ? 'NODDING' : metrics.headPitch <= config.headPitchThreshold ? 'TILTING' : 'NORMAL'}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400">Head Pitch</span>
              <span
                className={`font-bold ${
                  metrics.isHeadNodding
                    ? 'text-red-500'
                    : metrics.headPitch <= config.headPitchThreshold
                    ? 'text-yellow-500'
                    : 'text-white'
                }`}
              >
                {metrics.headPitch > 0 ? `+${metrics.headPitch}°` : `${metrics.headPitch}°`}
              </span>
            </div>

            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-150 ${
                  metrics.isHeadNodding
                    ? 'bg-red-600'
                    : metrics.headPitch <= config.headPitchThreshold
                    ? 'bg-yellow-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${pitchPercent}%` }}
              />
            </div>

            <div className="text-[9px] text-zinc-600 flex justify-between uppercase tracking-wider">
              <span>Limit: {config.headPitchThreshold}°</span>
              <span>Y:{metrics.headYaw}° R:{metrics.headRoll}°</span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-2 border-t border-zinc-800/80 flex justify-between text-[10px] uppercase">
          <span className="text-zinc-500">Nodding</span>
          <span className={metrics.headNoddingFrames >= config.headNodConsecutiveFrames ? 'text-red-500 font-bold' : 'text-zinc-400'}>
            {metrics.headNoddingFrames} / {config.headNodConsecutiveFrames} Frames
          </span>
        </div>
      </div>

      {/* 4. Event Statistics Block */}
      <div
        id="card-signal-matrix"
        className="bg-zinc-900/40 border border-zinc-800 p-4 flex flex-col justify-between"
      >
        <div>
          <h3 className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] mb-3">
            Event Statistics
          </h3>

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-zinc-950 p-2 border border-zinc-800">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Yawns</div>
              <div className="text-xl font-bold text-white mt-1">
                {String(metrics.yawningFrames > 0 ? 1 : 0).padStart(2, '0')}
              </div>
            </div>
            <div className="bg-zinc-950 p-2 border border-zinc-800">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Drowsy</div>
              <div className="text-xl font-bold text-red-500 mt-1">
                {String(drowsyEventCount).padStart(2, '0')}
              </div>
            </div>
          </div>

          {/* Active signal badges */}
          <div className="mt-3 grid grid-cols-3 gap-1 text-[9px] uppercase tracking-wider text-center">
            <div className={`p-1 border ${metrics.isEyesClosed ? 'bg-red-950 border-red-800 text-red-400' : 'bg-zinc-950 border-zinc-800 text-zinc-600'}`}>
              Eyes
            </div>
            <div className={`p-1 border ${metrics.isYawning ? 'bg-red-950 border-red-800 text-red-400' : 'bg-zinc-950 border-zinc-800 text-zinc-600'}`}>
              Yawn
            </div>
            <div className={`p-1 border ${metrics.isHeadNodding ? 'bg-red-950 border-red-800 text-red-400' : 'bg-zinc-950 border-zinc-800 text-zinc-600'}`}>
              Tilt
            </div>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-zinc-800/80 flex justify-between text-[10px] uppercase">
          <span className="text-zinc-500">Last Incident</span>
          <span className="text-zinc-300 font-bold">{lastEventTime || 'NONE'}</span>
        </div>
      </div>
    </div>
  );
};
