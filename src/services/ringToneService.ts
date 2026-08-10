// Web Audio API Ringtone Service for incoming calls and outgoing ringback
class RingToneService {
  private audioCtx: AudioContext | null = null;
  private isRinging = false;
  private timerId: any = null;

  private getAudioContext(): AudioContext | null {
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return this.audioCtx;
    } catch (err) {
      console.warn('AudioContext initialization failed:', err);
      return null;
    }
  }

  private playDualToneBurst(freq1: number, freq2: number, durationMs: number, volume = 0.15) {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';

      osc1.frequency.setValueAtTime(freq1, now);
      osc2.frequency.setValueAtTime(freq2, now);

      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);

      osc1.stop(now + durationMs / 1000);
      osc2.stop(now + durationMs / 1000);
    } catch (err) {
      console.warn('AudioContext playback error:', err);
    }
  }

  public playIncomingRing() {
    this.stopRingSound();
    this.isRinging = true;

    const ringCycle = () => {
      if (!this.isRinging) return;
      this.playDualToneBurst(440, 480, 750, 0.2);
      setTimeout(() => {
        if (!this.isRinging) return;
        this.playDualToneBurst(440, 480, 750, 0.2);
      }, 900);
    };

    ringCycle();
    this.timerId = setInterval(ringCycle, 3000);
  }

  public playOutgoingRingback() {
    this.stopRingSound();
    this.isRinging = true;

    const ringCycle = () => {
      if (!this.isRinging) return;
      this.playDualToneBurst(440, 480, 1200, 0.08);
    };

    ringCycle();
    this.timerId = setInterval(ringCycle, 3200);
  }

  public stopRingSound() {
    this.isRinging = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }
}

export const ringToneService = new RingToneService();
