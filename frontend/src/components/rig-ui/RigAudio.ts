import type { ClassicRigSnapshot, ClassicRigSoundCue } from "@rigintel/classic-rig-runtime";

/** Browser-only synthesized ambience and simulation cues. Created after a user gesture. */
export class RigAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private wind: GainNode | null = null;
  private rain: GainNode | null = null;
  private machinery: GainNode | null = null;
  private sources: AudioScheduledSourceNode[] = [];

  async enable(): Promise<void> {
    if (!this.context) {
      const Context = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Context) throw new Error("Браузер не поддерживает звук сцены");
      const context = new Context();
      this.context = context;
      this.master = context.createGain();
      this.master.gain.value = 0;
      this.master.connect(context.destination);
      const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      const noise = (type: BiquadFilterType, frequency: number) => {
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        const filter = context.createBiquadFilter();
        filter.type = type;
        filter.frequency.value = frequency;
        const gain = context.createGain();
        gain.gain.value = 0;
        source.connect(filter).connect(gain).connect(this.master!);
        source.start();
        this.sources.push(source);
        return gain;
      };
      this.wind = noise("lowpass", 550);
      this.rain = noise("highpass", 1700);
      const oscillator = context.createOscillator();
      oscillator.type = "sawtooth";
      oscillator.frequency.value = 48;
      const filter = context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 180;
      this.machinery = context.createGain();
      this.machinery.gain.value = 0;
      oscillator.connect(filter).connect(this.machinery).connect(this.master);
      oscillator.start();
      this.sources.push(oscillator);
    }
    await this.context.resume();
    if (this.context.state !== "running") throw new Error("Не удалось включить звук сцены");
    this.master!.gain.setTargetAtTime(0.35, this.context.currentTime, 0.12);
  }

  disable(): void {
    if (this.context && this.master) this.master.gain.setTargetAtTime(0, this.context.currentTime, 0.08);
  }

  update(snapshot: ClassicRigSnapshot): void {
    if (!this.context || !this.wind || !this.rain || !this.machinery) return;
    const now = this.context.currentTime;
    const preset = snapshot.weather.preset;
    this.wind.gain.setTargetAtTime(Math.min(snapshot.weather.wind / 25, 1) * 0.16, now, 0.5);
    this.rain.gain.setTargetAtTime(preset === "storm" ? 0.12 : preset === "rain" ? 0.06 : preset === "blizzard" ? 0.025 : 0, now, 0.5);
    this.machinery.gain.setTargetAtTime(snapshot.running ? 0.045 : 0, now, 0.3);
  }

  play(cue: ClassicRigSoundCue): void {
    if (!this.context || !this.master || this.context.state !== "running") return;
    const ctx = this.context;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const alarm = cue.cue === "kick_siren";
    oscillator.type = alarm ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(alarm ? 650 : 210, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(alarm ? 900 : 85, ctx.currentTime + (alarm ? 0.45 : 0.18));
    gain.gain.setValueAtTime(Math.min(1, Math.max(0, cue.gain ?? 1)) * 0.09, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (alarm ? 0.55 : 0.22));
    oscillator.connect(gain).connect(this.master);
    oscillator.start();
    oscillator.stop(ctx.currentTime + (alarm ? 0.56 : 0.23));
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }

  dispose(): void {
    for (const source of this.sources) { try { source.stop(); } catch { /* already stopped */ } source.disconnect(); }
    this.sources = [];
    if (this.context) void this.context.close().catch(() => {});
    this.context = null;
    this.master = this.wind = this.rain = this.machinery = null;
  }
}