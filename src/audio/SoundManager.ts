/**
 * SoundManager.ts
 * Web Audio API based procedural synthesizer & SFX engine for Horizon: Zero Frontier.
 * Guarantees zero asset loading latency and full cyber-tribal sound palette.
 */
export class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private isBgmPlaying: boolean = false;
  private bgmTimer: number | null = null;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  public init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = 0.25;
      this.bgmGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.5;
      this.sfxGain.connect(this.ctx.destination);

      this.startAmbientMusic();
    } else if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // --- BOW & COMBAT SFX ---

  public playBowDraw(chargeRatio: number) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120 + chargeRatio * 180, now);
    osc.frequency.exponentialRampToValueAtTime(180 + chargeRatio * 250, now + 0.15);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playArrowShoot() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    
    // Whoosh noise
    const bufferSize = this.ctx.sampleRate * 0.18;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(400, now + 0.18);
    filter.Q.setValueAtTime(3.0, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain!);
    noise.start(now);
  }

  public playHitImpact(isCrit: boolean = false) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isCrit ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(isCrit ? 520 : 180, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + (isCrit ? 0.25 : 0.12));

    gain.gain.setValueAtTime(isCrit ? 0.6 : 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isCrit ? 0.25 : 0.12));

    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.3);

    // Extra metallic ping for critical hit
    if (isCrit) {
      const ping = this.ctx.createOscillator();
      const pingGain = this.ctx.createGain();
      ping.type = 'sine';
      ping.frequency.setValueAtTime(1400, now);
      ping.frequency.exponentialRampToValueAtTime(2200, now + 0.2);
      pingGain.gain.setValueAtTime(0.35, now);
      pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      ping.connect(pingGain);
      pingGain.connect(this.sfxGain!);
      ping.start(now);
      ping.stop(now + 0.22);
    }
  }

  public playComponentTearOff() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Metal tear screech + blast
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.35);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.36);
  }

  public playExplosion() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const bufferSize = this.ctx.sampleRate * 0.6;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-3 * (i / bufferSize));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, now);
    filter.frequency.linearRampToValueAtTime(60, now + 0.6);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain!);
    noise.start(now);
  }

  // --- FOCUS AR SCAN SFX ---

  public playFocusActivate() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.2);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  public playFocusPing() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(1174, now + 0.08);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  // --- MACHINE SOUNDS ---

  public playMachineAlert() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.setValueAtTime(640, now + 0.08);
    osc.frequency.setValueAtTime(960, now + 0.16);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playThunderjawRoar() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Sub rumble + sawtooth growl
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(75, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.4);
    osc.frequency.exponentialRampToValueAtTime(45, now + 1.2);

    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 1.25);
  }

  // --- INTERACTION & QUEST SFX ---

  public playOverride() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const freqs = [350, 520, 780, 1040, 1400];
    freqs.forEach((f, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + idx * 0.09);
      gain.gain.setValueAtTime(0.2, now + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.26);
    });
  }

  public playGather() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(580, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playCampfireSave() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const chords = [261.63, 329.63, 392.00, 523.25]; // C major chord
    chords.forEach((note, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(note, now + i * 0.06);
      gain.gain.setValueAtTime(0.18, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.8);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.85);
    });
  }

  public playQuestComplete() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const notes = [440, 554.37, 659.25, 880]; // A major triumphant fanfare
    notes.forEach((note, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note, now + i * 0.12);
      gain.gain.setValueAtTime(0.28, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.6);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.65);
    });
  }

  // --- PROCEDURAL AMBIENT SOUNDTRACK ---

  private startAmbientMusic() {
    if (this.isBgmPlaying || !this.ctx) return;
    this.isBgmPlaying = true;

    const playAmbientDrone = () => {
      if (!this.ctx || !this.isBgmPlaying) return;
      const now = this.ctx.currentTime;

      // Ambient drone pad (D minor / A pentatonic horizon atmosphere)
      const droneNotes = [73.42, 110.0, 146.83, 220.0];
      const root = droneNotes[Math.floor(Math.random() * droneNotes.length)];

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(root, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300, now);
      filter.frequency.linearRampToValueAtTime(500, now + 3);
      filter.frequency.linearRampToValueAtTime(250, now + 6);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 2);
      gain.gain.linearRampToValueAtTime(0.001, now + 6);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.bgmGain!);

      osc.start(now);
      osc.stop(now + 6.1);

      this.bgmTimer = window.setTimeout(playAmbientDrone, 5500);
    };

    playAmbientDrone();
  }
}

export const soundManager = new SoundManager();
