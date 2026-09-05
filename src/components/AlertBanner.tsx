import React from 'react';
import { AlertState } from '../types';
import { CheckCircle2, Volume2, BellOff, Play } from 'lucide-react';

interface AlertBannerProps {
  alertState: AlertState;
  reason: string;
  onAcknowledge: () => void;
  soundEnabled: boolean;
  isSnoozed: boolean;
  snoozeTimeRemaining: number;
  onSnooze: () => void;
  onCancelSnooze: () => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  alertState,
  reason,
  onAcknowledge,
  soundEnabled,
  isSnoozed,
  snoozeTimeRemaining,
  onSnooze,
  onCancelSnooze,
}) => {
  // If actively snoozed, display clean countdown status banner
  if (isSnoozed) {
    const progressPct = Math.max(0, Math.min(100, (snoozeTimeRemaining / 30) * 100));

    return (
      <div
        id="snoozed-alert-banner"
        role="status"
        className="w-full font-mono bg-zinc-900/90 border-b border-zinc-800 text-zinc-300 py-2.5 px-4 sm:px-6 transition-all"
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center border border-amber-500/50 bg-amber-950/40 text-amber-400">
              <BellOff className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-widest uppercase text-xs text-amber-400">
                  ALERTS PAUSED
                </span>
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                  [{snoozeTimeRemaining}S REMAINING]
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-zinc-400 uppercase tracking-wider">
                Audible alarms & critical alerts suppressed for 30s • Telemetry sensors active
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Visual countdown bar */}
            <div className="hidden md:flex flex-col gap-1 w-28">
              <div className="w-full bg-zinc-950 border border-zinc-800 h-1.5 overflow-hidden">
                <div
                  className="bg-amber-400 h-full transition-all duration-250"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-[9px] text-right text-zinc-500 uppercase">
                {snoozeTimeRemaining}s / 30s
              </span>
            </div>

            <button
              id="btn-cancel-snooze"
              type="button"
              onClick={onCancelSnooze}
              className="flex items-center gap-1.5 border border-zinc-700 bg-zinc-950 hover:bg-zinc-900 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-200 hover:text-white transition-colors cursor-pointer"
            >
              <Play className="h-3 w-3 text-emerald-400 fill-emerald-400" />
              Resume Protection
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (alertState === 'Normal') return null;

  const isDrowsy = alertState === 'Drowsy';

  return (
    <div
      id="critical-alert-banner"
      role="alert"
      className={`w-full font-mono transition-all duration-200 ${
        isDrowsy
          ? 'bg-red-600 text-white border-b-2 border-white shadow-2xl animate-pulse'
          : 'bg-amber-500 text-zinc-950 border-b-2 border-zinc-900 shadow-md'
      }`}
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5">
        <div className="flex items-center gap-4">
          <div
            className={`w-3.5 h-3.5 rounded-full shrink-0 ${
              isDrowsy ? 'bg-white animate-ping' : 'bg-zinc-950 animate-pulse'
            }`}
          />
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-bold tracking-[0.2em] uppercase text-sm sm:text-base">
                {isDrowsy ? 'DROWSINESS DETECTED' : 'DRIVER FATIGUE WARNING'}
              </span>
              {isDrowsy && soundEnabled && (
                <span className="inline-flex items-center gap-1.5 bg-black/40 border border-white/40 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-widest">
                  <Volume2 className="h-3 w-3 animate-pulse" /> Audio Alert Active
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-xs uppercase tracking-wider opacity-90 mt-0.5">
              {reason ||
                (isDrowsy
                  ? 'CRITICAL FATIGUE DETECTED — PULL OVER SAFELY'
                  : 'EARLY SIGNS OF DROWSINESS DETECTED')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* SNOOZE 30S BUTTON */}
          <button
            id="btn-snooze-alert"
            type="button"
            onClick={onSnooze}
            title="Pause alerts for 30 seconds"
            className="flex items-center gap-1.5 bg-zinc-950/90 hover:bg-black text-amber-300 hover:text-amber-200 border border-amber-400/80 px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all active:scale-95 cursor-pointer shadow-md"
          >
            <BellOff className="h-3.5 w-3.5" />
            Snooze (30s)
          </button>

          {isDrowsy && (
            <button
              id="btn-acknowledge-alert"
              type="button"
              onClick={onAcknowledge}
              className="flex items-center gap-1.5 bg-white px-4 py-2 text-xs font-bold uppercase tracking-widest text-zinc-950 hover:bg-zinc-100 border border-zinc-300 shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4 text-red-600" />
              I Am Awake
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
