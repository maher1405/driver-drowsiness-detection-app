import React, { useState, useEffect } from 'react';
import { AlertState } from '../types';
import {
  Volume2,
  VolumeX,
  Sliders,
  BellRing,
} from 'lucide-react';
import { alarmAudio } from '../utils/audio';

interface NavbarProps {
  alertState: AlertState;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenSettings: () => void;
  drowsyEventCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  alertState,
  soundEnabled,
  onToggleSound,
  onOpenSettings,
  drowsyEventCount,
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
      className="sticky top-0 z-30 w-full border-b border-zinc-800 bg-[#0d0d0d] font-mono px-4 sm:px-6 py-3.5 transition-colors"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        {/* Brand & System Title */}
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full shrink-0 ${
              alertState === 'Drowsy'
                ? 'bg-red-600 animate-ping'
                : alertState === 'Warning'
                ? 'bg-amber-500 animate-pulse'
                : 'bg-emerald-500'
            }`}
          />
          <div>
            <h1
              id="app-heading"
              className="text-base sm:text-lg font-bold tracking-tighter text-white uppercase flex items-center gap-2"
            >
              SENTINEL-X{' '}
              <span className="text-zinc-500 font-light text-xs sm:text-sm tracking-normal hidden sm:inline">
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
              <span className="text-zinc-500 text-[10px]">System Time</span>
              <span className="text-white font-bold">{systemTime || '00:00:00:00'}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-zinc-500 text-[10px]">Status</span>
              <span
                className={`font-bold ${
                  alertState === 'Drowsy'
                    ? 'text-red-500 animate-pulse'
                    : alertState === 'Warning'
                    ? 'text-amber-500'
                    : 'text-emerald-500'
                }`}
              >
                {alertState === 'Drowsy'
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
              className="hidden lg:flex items-center gap-2 px-2.5 py-1 bg-zinc-950 border border-zinc-800 text-[11px] uppercase tracking-wider"
            >
              <span className="text-zinc-500">Alerts:</span>
              <span className="font-bold text-red-500">{drowsyEventCount}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              id="btn-test-sound"
              type="button"
              onClick={handleTestAlarm}
              title="Test Alarm Audio"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-[11px] uppercase tracking-wider transition-colors cursor-pointer"
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
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:text-white'
                  : 'bg-red-950/30 border-red-900 text-red-500'
              }`}
            >
              {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            </button>

            <button
              id="btn-open-settings"
              type="button"
              onClick={onOpenSettings}
              title="Detection & Audio Settings"
              className="p-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-xs transition-colors cursor-pointer"
            >
              <Sliders className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
