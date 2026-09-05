import React, { useState, useEffect } from 'react';
import { AlertState, Theme } from '../types';
import {
  Volume2,
  VolumeX,
  Sliders,
  BellRing,
  BellOff,
  Play,
  Sun,
  Moon,
} from 'lucide-react';
import { alarmAudio } from '../utils/audio';

interface NavbarProps {
  alertState: AlertState;
  soundEnabled: boolean;
  theme: Theme;
  onToggleSound: () => void;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  drowsyEventCount: number;
  isSnoozed?: boolean;
  snoozeTimeRemaining?: number;
  onSnooze?: () => void;
  onCancelSnooze?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  alertState,
  soundEnabled,
  theme,
  onToggleSound,
  onToggleTheme,
  onOpenSettings,
  drowsyEventCount,
  isSnoozed = false,
  snoozeTimeRemaining = 0,
  onSnooze,
  onCancelSnooze,
}) => {
  const [systemTime, setSystemTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const centis = String(Math.floor(now.getMilliseconds() / 10)).padStart(2, '0');
      setSystemTime(`${hours}:${minutes}:${seconds}:${centis}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 40);
    return () => clearInterval(interval);
  }, []);

  const handleTestAlarm = () => {
    alarmAudio.playTestBeep();
  };

  return (
    <header
      id="main-navbar"
      className="sticky top-0 z-30 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-[#0d0d0d]/95 backdrop-blur-xs font-mono px-4 sm:px-6 py-3.5 transition-colors"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        {/* Brand & System Title */}
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full shrink-0 ${
              isSnoozed
                ? 'bg-amber-400'
                : alertState === 'Drowsy'
                ? 'bg-red-600 animate-ping'
                : alertState === 'Warning'
                ? 'bg-amber-500 animate-pulse'
                : 'bg-emerald-500'
            }`}
          />
          <div>
            <h1
              id="app-heading"
              className="text-base sm:text-lg font-bold tracking-tighter text-zinc-900 dark:text-white uppercase flex items-center gap-2"
            >
              SENTINEL-X{' '}
              <span className="text-zinc-400 dark:text-zinc-500 font-light text-xs sm:text-sm tracking-normal hidden sm:inline">
                | Driver Drowsiness Detection
              </span>
            </h1>
          </div>
        </div>

        {/* System Telemetry Badges & Controls */}
        <div className="flex items-center gap-4 sm:gap-6">
          {/* System Time & Status in Clean Minimalism style */}
          <div className="hidden sm:flex gap-6 text-[11px] uppercase tracking-widest font-mono">
            <div className="flex flex-col items-end">
              <span className="text-zinc-400 dark:text-zinc-500 text-[10px]">System Time</span>
              <span className="text-zinc-900 dark:text-white font-bold">{systemTime || '00:00:00:00'}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-zinc-400 dark:text-zinc-500 text-[10px]">Status</span>
              <span
                className={`font-bold ${
                  isSnoozed
                    ? 'text-amber-500 dark:text-amber-400'
                    : alertState === 'Drowsy'
                    ? 'text-red-600 dark:text-red-500 animate-pulse'
                    : alertState === 'Warning'
                    ? 'text-amber-600 dark:text-amber-500'
                    : 'text-emerald-600 dark:text-emerald-500'
                }`}
              >
                {isSnoozed
                  ? `SNOOZED (${snoozeTimeRemaining}S)`
                  : alertState === 'Drowsy'
                  ? 'ALARM ACTIVE'
                  : alertState === 'Warning'
                  ? 'WARNING'
                  : 'NORMAL'}
              </span>
            </div>
          </div>

          {/* Drowsy Incidents Counter Box */}
          {drowsyEventCount > 0 && (
            <div
              id="event-counter-chip"
              className="hidden lg:flex items-center gap-2 px-2.5 py-1 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-[11px] uppercase tracking-wider"
            >
              <span className="text-zinc-500">Alerts:</span>
              <span className="font-bold text-red-600 dark:text-red-500">{drowsyEventCount}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Snooze button in Navbar if snoozed or if alert active */}
            {isSnoozed ? (
              <button
                id="btn-nav-unsnooze"
                type="button"
                onClick={onCancelSnooze}
                title="Resume alarm protection"
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-400/60 dark:border-amber-500/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/60 text-[11px] uppercase tracking-wider transition-colors cursor-pointer"
              >
                <Play className="h-3 w-3 fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400" />
                <span>Resume ({snoozeTimeRemaining}s)</span>
              </button>
            ) : alertState !== 'Normal' && onSnooze ? (
              <button
                id="btn-nav-snooze"
                type="button"
                onClick={onSnooze}
                title="Snooze alerts for 30 seconds"
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-900 border border-amber-500/50 hover:border-amber-500 text-amber-700 dark:text-amber-400 text-[11px] uppercase tracking-wider transition-colors cursor-pointer"
              >
                <BellOff className="h-3.5 w-3.5" />
                <span>Snooze (30s)</span>
              </button>
            ) : null}

            {/* Dark / Light Theme Toggle Button */}
            <button
              id="btn-theme-toggle"
              type="button"
              onClick={onToggleTheme}
              title={theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
              aria-label={theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white text-[11px] uppercase tracking-wider transition-colors cursor-pointer"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-3.5 w-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Light</span>
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5 text-indigo-600" />
                  <span className="hidden sm:inline">Dark</span>
                </>
              )}
            </button>

            <button
              id="btn-test-sound"
              type="button"
              onClick={handleTestAlarm}
              title="Test Alarm Audio"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white text-[11px] uppercase tracking-wider transition-colors cursor-pointer"
            >
              <BellRing className="h-3.5 w-3.5 text-red-500" />
              <span className="hidden sm:inline">Test</span>
            </button>

            <button
              id="btn-toggle-sound"
              type="button"
              onClick={onToggleSound}
              title={soundEnabled ? 'Mute alarm sound' : 'Enable alarm sound'}
              className={`p-1.5 border text-xs transition-colors cursor-pointer ${
                soundEnabled
                  ? 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
                  : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900 text-red-600 dark:text-red-500'
              }`}
            >
              {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            </button>

            <button
              id="btn-open-settings"
              type="button"
              onClick={onOpenSettings}
              title="Detection & Audio Settings"
              className="p-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white text-xs transition-colors cursor-pointer"
            >
              <Sliders className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
