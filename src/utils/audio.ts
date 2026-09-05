/**
 * Web Audio API alarm sound synthesizer
 * Produces crisp, urgent warning and emergency drowsiness alarm tones
 * entirely client-side without external asset dependencies.
 */

class AlarmAudioController {
  private ctx: AudioContext | null = null;
  private isAlarmPlaying = false;
  private timerId: number | null = null;
  private masterGain: GainNode | null = null;
  private volume: number = 0.8;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  /**
   * Start pulsing emergency alarm (Dual-tone alert beep)
   */
  public startAlarm() {
    if (this.isAlarmPlaying) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    this.isAlarmPlaying = true;
    let step = 0;

    const playBeep = () => {
      if (!this.isAlarmPlaying || !this.ctx || !this.masterGain) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Alternating high urgent frequencies (880Hz -> 1174Hz)
      const freq = step % 2 === 0 ? 880 : 1174;
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      // Fast attack, short sustain, fast decay for rapid beeps
      const now = this.ctx.currentTime;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.6, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.17);

      step++;
      this.timerId = window.setTimeout(playBeep, 200);
    };

    playBeep();
  }

  /**
   * Stop the active alarm
   */
  public stopAlarm() {
    this.isAlarmPlaying = false;
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  /**
   * Play a brief single warning chime (for single warning state)
   */
  public playWarningChime() {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(659.25, now); // E5
    osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.15); // C5

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.exponentialRampToValueAtTime(0.3, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  /**
   * Play test beep to verify audio output
   */
  public playTestBeep() {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(1046.5, now + 0.1);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.exponentialRampToValueAtTime(0.5, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  public isPlaying(): boolean {
    return this.isAlarmPlaying;
  }
}

export const alarmAudio = new AlarmAudioController();
