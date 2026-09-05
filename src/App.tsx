import { useState } from 'react';
import { useDrowsinessDetector } from './hooks/useDrowsinessDetector';
import { useTheme } from './hooks/useTheme';
import { Navbar } from './components/Navbar';
import { AlertBanner } from './components/AlertBanner';
import { CameraView } from './components/CameraView';
import { StatusPanel } from './components/StatusPanel';
import { MetricsGraph } from './components/MetricsGraph';
import { AlertLogTable } from './components/AlertLogTable';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const {
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
  } = useDrowsinessDetector();

  const handleToggleSound = () => {
    setConfig((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }));
  };

  const handleToggleMirror = () => {
    setConfig((prev) => ({ ...prev, mirrorWebcam: !prev.mirrorWebcam }));
  };

  const handleToggleMesh = () => {
    setConfig((prev) => ({ ...prev, showMeshOverlay: !prev.showMeshOverlay }));
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#0a0a0a] text-zinc-900 dark:text-zinc-300 font-mono flex flex-col selection:bg-red-600 selection:text-white transition-colors duration-150">
      {/* Clean Minimalism Header */}
      <Navbar
        alertState={alertState}
        soundEnabled={config.soundEnabled}
        theme={theme}
        onToggleSound={handleToggleSound}
        onToggleTheme={toggleTheme}
        onOpenSettings={() => setIsSettingsOpen(true)}
        drowsyEventCount={drowsyEventCount}
        isSnoozed={isSnoozed}
        snoozeTimeRemaining={snoozeTimeRemaining}
        onSnooze={() => snoozeAlert(30)}
        onCancelSnooze={cancelSnooze}
      />

      {/* Critical Alert Banner with 30s Snooze Action */}
      <AlertBanner
        alertState={alertState}
        reason={activeAlertReason}
        onAcknowledge={acknowledgeAlert}
        soundEnabled={config.soundEnabled}
        isSnoozed={isSnoozed}
        snoozeTimeRemaining={snoozeTimeRemaining}
        onSnooze={() => snoozeAlert(30)}
        onCancelSnooze={cancelSnooze}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-4">
        {/* Full-width Top Telemetry Metrics Summary */}
        <StatusPanel
          metrics={metrics}
          config={config}
          alertState={alertState}
          drowsyEventCount={drowsyEventCount}
          lastEventTime={lastEventTime}
        />

        {/* Two-Column Grid: Video & Waveform on Left, Rules & Table on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left Column: Optical Feed & Waveform (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <CameraView
              videoRef={videoRef}
              canvasRef={canvasRef}
              isCameraActive={isCameraActive}
              isModelLoading={isModelLoading}
              modelError={modelError}
              cameraError={cameraError}
              metrics={metrics}
              alertState={alertState}
              config={config}
              devices={devices}
              selectedDeviceId={selectedDeviceId}
              isCalibrating={isCalibrating}
              calibrationProgress={calibrationProgress}
              isSnoozed={isSnoozed}
              snoozeTimeRemaining={snoozeTimeRemaining}
              isCheckingDevices={isCheckingDevices}
              onStartCamera={startCamera}
              onStopCamera={stopCamera}
              onToggleMirror={handleToggleMirror}
              onToggleMesh={handleToggleMesh}
              onSelectDevice={setSelectedDeviceId}
              onStartCalibration={startCalibration}
              onSnooze={() => snoozeAlert(30)}
              onClearCameraError={clearCameraError}
              onRefreshDevices={refreshDevices}
            />

            <MetricsGraph history={historyBuffer} config={config} theme={theme} />
          </div>

          {/* Right Column: Detection Rules & Incident Log Table (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Rules & Logic Reference Card */}
            <div
              id="verification-guide-card"
              className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 shadow-xs transition-colors"
            >
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
                <h3 className="text-[10px] text-zinc-500 uppercase tracking-[0.2em]">
                  Detection Rules & Calibration
                </h3>
                <span className="text-[9px] uppercase px-1.5 py-0.5 border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400">
                  AUTONOMOUS LOGIC
                </span>
              </div>

              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed uppercase">
                ALARM TRIGGERS ON <strong className="text-red-600 dark:text-red-500">2 ACTIVE SIGNALS</strong> OR <strong className="text-red-600 dark:text-red-500">1 PERSISTENT SIGNAL</strong>:
              </p>

              <div className="space-y-2 text-xs">
                {/* Rule 1 */}
                <div className={`p-2 border transition-all ${
                  metrics.isEyesClosed
                    ? 'border-red-500 bg-red-50 dark:border-red-600 dark:bg-red-950/30'
                    : 'border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-950'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-800 dark:text-zinc-300 uppercase text-[11px] font-medium">
                      1. Closed Eyes (EAR &lt; {config.earThreshold.toFixed(2)})
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 border ${
                      metrics.isEyesClosed ? 'bg-red-600 border-red-500 text-white font-bold' : 'border-zinc-300 dark:border-zinc-800 text-zinc-500'
                    }`}>
                      {metrics.isEyesClosed ? 'TRIGGERED' : `${metrics.eyesClosedFrames}/${config.earConsecutiveFrames}F`}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1 uppercase">
                    Maintain closed eyelids for {config.earConsecutiveFrames} consecutive frames (~0.7s).
                  </p>
                </div>

                {/* Rule 2 */}
                <div className={`p-2 border transition-all ${
                  metrics.isYawning
                    ? 'border-amber-500 bg-amber-50 dark:border-yellow-600 dark:bg-yellow-950/30'
                    : 'border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-950'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-800 dark:text-zinc-300 uppercase text-[11px] font-medium">
                      2. Yawning (MAR &gt; {config.marThreshold.toFixed(2)})
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 border ${
                      metrics.isYawning ? 'bg-amber-500 border-amber-600 text-black font-bold' : 'border-zinc-300 dark:border-zinc-800 text-zinc-500'
                    }`}>
                      {metrics.isYawning ? 'TRIGGERED' : `${metrics.yawningFrames}/${config.marConsecutiveFrames}F`}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1 uppercase">
                    Open mouth wide for {config.marConsecutiveFrames} frames to register fatigue yawn.
                  </p>
                </div>

                {/* Rule 3 */}
                <div className={`p-2 border transition-all ${
                  metrics.isHeadNodding
                    ? 'border-red-500 bg-red-50 dark:border-red-600 dark:bg-red-950/30'
                    : 'border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-950'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-800 dark:text-zinc-300 uppercase text-[11px] font-medium">
                      3. Head Nodding (Pitch &le; {config.headPitchThreshold}°)
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 border ${
                      metrics.isHeadNodding ? 'bg-red-600 border-red-500 text-white font-bold' : 'border-zinc-300 dark:border-zinc-800 text-zinc-500'
                    }`}>
                      {metrics.isHeadNodding ? 'TRIGGERED' : `${metrics.headNoddingFrames}/${config.headNodConsecutiveFrames}F`}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1 uppercase">
                    Tilt chin downward as if nodding off for {config.headNodConsecutiveFrames} frames.
                  </p>
                </div>
              </div>

              <div className="text-[10px] text-zinc-500 uppercase pt-1 border-t border-zinc-200 dark:border-zinc-800/60">
                NOTE: Use Calibrate button to adapt neural threshold for glasses.
              </div>
            </div>

            {/* Incident Alert History Log */}
            <AlertLogTable logs={alertLogs} onClearLogs={clearAlertLogs} />
          </div>
        </div>
      </main>

      {/* Clean Minimalism Technical Footer */}
      <footer className="px-6 py-3 bg-zinc-100 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap justify-between items-center text-[10px] text-zinc-500 dark:text-zinc-600 uppercase tracking-widest transition-colors">
        <div>HW_VER: 2.4.0-STABLE | KERNEL: MP_VIS_v4.2</div>
        <div className="flex gap-4">
          <span>FPS: {metrics.fps}</span>
          <span>MEM: 442MB</span>
          <span className="text-emerald-600 dark:text-emerald-500">Connection: Secure (Local)</span>
        </div>
      </footer>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onChangeConfig={setConfig}
        onStartCalibration={startCalibration}
        isCameraActive={isCameraActive}
      />
    </div>
  );
}
