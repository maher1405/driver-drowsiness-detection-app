import React, { useRef, useEffect } from 'react';
import { DetectionConfig, Theme } from '../types';

interface MetricsGraphProps {
  history: { ear: number; mar: number; pitch: number }[];
  config: DetectionConfig;
  theme?: Theme;
}

export const MetricsGraph: React.FC<MetricsGraphProps> = ({ history, config, theme = 'dark' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isLight = theme === 'light';
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Subtle Grid lines
    ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.07)' : 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let y = 0; y < height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    if (history.length < 2) {
      ctx.fillStyle = isLight ? 'rgba(0, 0, 0, 0.45)' : 'rgba(255, 255, 255, 0.3)';
      ctx.font = '11px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('AWAITING SENSOR TELEMETRY...', width / 2, height / 2);
      return;
    }

    // Y scale range: 0.0 to 0.85
    const maxVal = 0.85;
    const getY = (val: number) => {
      const clamped = Math.max(0, Math.min(maxVal, val));
      return height - (clamped / maxVal) * (height - 20) - 10;
    };

    // Draw EAR threshold line (Dashed Red)
    const earThreshY = getY(config.earThreshold);
    ctx.strokeStyle = isLight ? 'rgba(220, 38, 38, 0.85)' : 'rgba(220, 38, 38, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, earThreshY);
    ctx.lineTo(width, earThreshY);
    ctx.stroke();

    // Draw MAR threshold line (Dashed Amber/Orange)
    const marThreshY = getY(config.marThreshold);
    ctx.strokeStyle = isLight ? 'rgba(217, 119, 6, 0.85)' : 'rgba(234, 179, 8, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, marThreshY);
    ctx.lineTo(width, marThreshY);
    ctx.stroke();
    ctx.setLineDash([]);

    const stepX = width / Math.max(history.length - 1, 1);

    // Draw MAR Line (Blue)
    ctx.beginPath();
    ctx.strokeStyle = isLight ? '#2563eb' : '#60a5fa';
    ctx.lineWidth = 1.5;
    history.forEach((pt, i) => {
      const x = i * stepX;
      const y = getY(pt.mar);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw EAR Line (Red if below threshold)
    ctx.beginPath();
    ctx.strokeStyle = isLight ? '#dc2626' : '#ef4444';
    ctx.lineWidth = 1.5;
    history.forEach((pt, i) => {
      const x = i * stepX;
      const y = getY(pt.ear);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw last point dot for EAR
    const lastIdx = history.length - 1;
    const lastX = lastIdx * stepX;
    const lastEarY = getY(history[lastIdx].ear);
    const lastMarY = getY(history[lastIdx].mar);

    ctx.fillStyle = history[lastIdx].ear < config.earThreshold
      ? (isLight ? '#dc2626' : '#ef4444')
      : (isLight ? '#18181b' : '#ffffff');
    ctx.beginPath();
    ctx.arc(lastX, lastEarY, 3, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = isLight ? '#2563eb' : '#60a5fa';
    ctx.beginPath();
    ctx.arc(lastX, lastMarY, 3, 0, 2 * Math.PI);
    ctx.fill();
  }, [history, config, theme]);

  return (
    <div
      id="metrics-graph-card"
      className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 p-4 font-mono shadow-xs transition-colors"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h3 className="text-[10px] text-zinc-500 uppercase tracking-[0.2em]">
            Temporal Waveform
          </h3>
          <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
            60-FRAME ROLLING SENSOR OSCILLOSCOPE
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[10px] uppercase tracking-wider">
          <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
            <span className="h-1.5 w-3 bg-red-500" />
            <span>EAR (EYES)</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
            <span className="h-1.5 w-3 bg-blue-500 dark:bg-blue-400" />
            <span>MAR (MOUTH)</span>
          </div>
        </div>
      </div>

      <div className="relative h-32 w-full overflow-hidden bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
        <canvas
          ref={canvasRef}
          width={700}
          height={128}
          className="h-full w-full object-fill"
        />

        {/* Left Y-axis labels */}
        <div className="absolute left-2 inset-y-2 flex flex-col justify-between text-[9px] font-mono text-zinc-500 dark:text-zinc-600 pointer-events-none uppercase">
          <span>0.80</span>
          <span>0.50</span>
          <span>0.25</span>
          <span>0.00</span>
        </div>
      </div>
    </div>
  );
};

