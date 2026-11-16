/**
 * Шина событий симуляции. Чистый модуль.
 * Эталон генерировал только тосты (ot.toast) и обновления UI; здесь каждое значимое действие —
 * типизированное событие ClassicRigTelemetryEvent, которое потребляют телеметрия и экзамены.
 */
import type { ClassicRigTelemetryEvent } from "../types";

export type ClassicRigNotification = { text: string; timestamp: number };

/** Звуковые сигналы — runtime их только объявляет; воспроизведение делает приложение (см. environment/sound.ts). */
export type ClassicRigSoundCue = { cue: string; timestamp: number; gain?: number };

type Listener<T> = (value: T) => void;

export class ClassicRigEventBus {
  private events: Listener<ClassicRigTelemetryEvent>[] = [];
  private notes: Listener<ClassicRigNotification>[] = [];
  private sounds: Listener<ClassicRigSoundCue>[] = [];

  onEvent(fn: Listener<ClassicRigTelemetryEvent>): () => void {
    this.events.push(fn);
    return () => (this.events = this.events.filter((f) => f !== fn));
  }
  onNotification(fn: Listener<ClassicRigNotification>): () => void {
    this.notes.push(fn);
    return () => (this.notes = this.notes.filter((f) => f !== fn));
  }
  onSound(fn: Listener<ClassicRigSoundCue>): () => void {
    this.sounds.push(fn);
    return () => (this.sounds = this.sounds.filter((f) => f !== fn));
  }
  emit(ev: ClassicRigTelemetryEvent): void {
    for (const f of this.events) f(ev);
  }
  notify(text: string, timestamp: number): void {
    for (const f of this.notes) f({ text, timestamp });
  }
  sound(cue: string, timestamp: number, gain?: number): void {
    for (const f of this.sounds) f({ cue, timestamp, gain });
  }
}
