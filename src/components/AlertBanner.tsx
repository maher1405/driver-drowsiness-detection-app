import React from 'react';
import { AlertState } from '../types';
import { CheckCircle2, Volume2 } from 'lucide-react';

interface AlertBannerProps {
  alertState: AlertState;
  reason: string;
  onAcknowledge: () => void;
  soundEnabled: boolean;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  alertState,
  reason,
  onAcknowledge,
  soundEnabled,
}) => {
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

        {isDrowsy && (
          <button
            id="btn-acknowledge-alert"
            type="button"
            onClick={onAcknowledge}
            className="flex items-center gap-1.5 bg-white px-5 py-2 text-xs font-bold uppercase tracking-widest text-zinc-950 hover:bg-zinc-100 border border-zinc-300 shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <CheckCircle2 className="h-4 w-4 text-red-600" />
            I Am Awake / Dismiss
          </button>
        )}
      </div>
    </div>
  );
};
