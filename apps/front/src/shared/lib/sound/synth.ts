// Lightweight 8-bit style sound synthesizer using the Web Audio API.
// No audio files needed — every sound is a short oscillator envelope.
//
// Usage: play('levelUp')
//   or: const play = useSound(); play('toast')
//
// The module is side-effect-free until `play()` is first invoked (which
// lazily opens an AudioContext — browsers require a user gesture).

export type SoundKind =
  | 'toast'          // neutral ping for a passive toast
  | 'questAccept'    // ember soft blip
  | 'duelInvite'     // ominous drop
  | 'submitPass'     // triumphant rising triad
  | 'submitFail'     // short descending tone
  | 'levelUp'        // 4-note fanfare
  | 'seasonComplete' // bigger fanfare
  | 'streakBreak'    // low minor triad
  | 'streakShield'   // shimmer tone
  | 'click'          // generic UI tick
  | 'hover'          // quiet hover tick
  | 'error'          // buzzer

// Persisted opt-out. Honor prefers-reduced-motion as a proxy for "reduced
// UX noise" too — screens with motion off should not be loud either.
const STORAGE_KEY = 'druz9.sound.enabled.v1'

let audioCtx: AudioContext | null = null
let masterGain: GainNode | null = null

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw === '0') return false
  if (raw === '1') return true
  // Default: on unless the user prefers reduced motion.
  return !prefersReducedMotion()
}

export function setSoundEnabled(enabled: boolean): void {
  localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0')
  if (masterGain && audioCtx) {
    masterGain.gain.setValueAtTime(enabled ? 0.25 : 0, audioCtx.currentTime)
  }
}

function ensureContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (audioCtx) return audioCtx
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  audioCtx = new Ctor()
  masterGain = audioCtx.createGain()
  masterGain.gain.value = isSoundEnabled() ? 0.25 : 0
  masterGain.connect(audioCtx.destination)
  return audioCtx
}

// --------- primitives ---------

type Wave = 'sine' | 'square' | 'triangle' | 'sawtooth'

interface Note {
  freq: number
  start: number   // offset from t0, seconds
  dur: number     // seconds
  gain?: number
  wave?: Wave
}

function playNotes(notes: Note[]): void {
  const ctx = ensureContext()
  if (!ctx || !masterGain) return

  const t0 = ctx.currentTime
  for (const n of notes) {
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = n.wave ?? 'square'
    osc.frequency.setValueAtTime(n.freq, t0 + n.start)

    const peak = n.gain ?? 0.5
    // Very short attack + exponential decay for a crisp 8-bit pluck.
    g.gain.setValueAtTime(0, t0 + n.start)
    g.gain.linearRampToValueAtTime(peak, t0 + n.start + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + n.start + n.dur)

    osc.connect(g)
    g.connect(masterGain)
    osc.start(t0 + n.start)
    osc.stop(t0 + n.start + n.dur + 0.02)
  }
}

// Frequencies for a few notes (equal temperament, 4th octave baseline).
const N = {
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0,  A4: 440.0,
  B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99,
  A5: 880.0, B5: 987.77, C6: 1046.5,
  E3: 164.81, G3: 196.0, A3: 220.0, C3: 130.81,
}

// --------- library ---------

const LIBRARY: Record<SoundKind, Note[]> = {
  click: [
    { freq: N.A5, start: 0, dur: 0.03, gain: 0.3, wave: 'square' },
  ],
  hover: [
    { freq: N.E5, start: 0, dur: 0.02, gain: 0.15, wave: 'triangle' },
  ],
  toast: [
    { freq: N.E5, start: 0,    dur: 0.08, gain: 0.35, wave: 'triangle' },
    { freq: N.G5, start: 0.06, dur: 0.1,  gain: 0.3,  wave: 'triangle' },
  ],
  questAccept: [
    { freq: N.C5, start: 0,    dur: 0.08, wave: 'square' },
    { freq: N.E5, start: 0.07, dur: 0.08, wave: 'square' },
    { freq: N.G5, start: 0.14, dur: 0.14, wave: 'square' },
  ],
  duelInvite: [
    { freq: N.A4, start: 0,    dur: 0.12, gain: 0.5, wave: 'sawtooth' },
    { freq: N.E4, start: 0.1,  dur: 0.2,  gain: 0.55, wave: 'sawtooth' },
  ],
  submitPass: [
    { freq: N.C5, start: 0,    dur: 0.08, wave: 'square' },
    { freq: N.E5, start: 0.08, dur: 0.08, wave: 'square' },
    { freq: N.G5, start: 0.16, dur: 0.08, wave: 'square' },
    { freq: N.C6, start: 0.24, dur: 0.2,  wave: 'square' },
  ],
  submitFail: [
    { freq: N.E4, start: 0,    dur: 0.12, gain: 0.5, wave: 'sawtooth' },
    { freq: N.C4, start: 0.1,  dur: 0.18, gain: 0.55, wave: 'sawtooth' },
  ],
  levelUp: [
    { freq: N.C5, start: 0,    dur: 0.1,  wave: 'square' },
    { freq: N.E5, start: 0.1,  dur: 0.1,  wave: 'square' },
    { freq: N.G5, start: 0.2,  dur: 0.1,  wave: 'square' },
    { freq: N.C6, start: 0.3,  dur: 0.3,  wave: 'square' },
    // second-voice sparkle
    { freq: N.E5, start: 0,    dur: 0.1,  gain: 0.25, wave: 'triangle' },
    { freq: N.G5, start: 0.1,  dur: 0.1,  gain: 0.25, wave: 'triangle' },
    { freq: N.B5, start: 0.2,  dur: 0.1,  gain: 0.25, wave: 'triangle' },
    { freq: N.E5, start: 0.3,  dur: 0.3,  gain: 0.3, wave: 'triangle' },
  ],
  seasonComplete: [
    { freq: N.C5, start: 0,    dur: 0.14, wave: 'square' },
    { freq: N.G5, start: 0.12, dur: 0.14, wave: 'square' },
    { freq: N.E5, start: 0.24, dur: 0.14, wave: 'square' },
    { freq: N.C6, start: 0.36, dur: 0.5,  wave: 'square' },
    { freq: N.G5, start: 0.36, dur: 0.5,  gain: 0.3, wave: 'triangle' },
    { freq: N.E5, start: 0.36, dur: 0.5,  gain: 0.25, wave: 'triangle' },
  ],
  streakBreak: [
    { freq: N.A3, start: 0,    dur: 0.15, gain: 0.55, wave: 'sawtooth' },
    { freq: N.E3, start: 0.12, dur: 0.15, gain: 0.5,  wave: 'sawtooth' },
    { freq: N.C3, start: 0.24, dur: 0.25, gain: 0.5,  wave: 'sawtooth' },
  ],
  streakShield: [
    { freq: N.G5, start: 0,    dur: 0.06, wave: 'triangle' },
    { freq: N.B5, start: 0.04, dur: 0.06, wave: 'triangle' },
    { freq: N.E5, start: 0.08, dur: 0.06, wave: 'triangle' },
    { freq: N.G5, start: 0.12, dur: 0.2,  wave: 'triangle' },
  ],
  error: [
    { freq: N.C4, start: 0, dur: 0.08, gain: 0.5, wave: 'sawtooth' },
    { freq: N.C4, start: 0.08, dur: 0.08, gain: 0.5, wave: 'sawtooth' },
  ],
}

/**
 * play — fire-and-forget sound by kind. Silent no-op when sound is disabled,
 * before first user gesture, or when Web Audio is unavailable.
 */
export function play(kind: SoundKind): void {
  if (!isSoundEnabled()) return
  const notes = LIBRARY[kind]
  if (!notes || notes.length === 0) return
  try {
    playNotes(notes)
  } catch {
    // Swallow — audio is never critical to the UX.
  }
}
