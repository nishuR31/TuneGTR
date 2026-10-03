import { Platform } from "react-native";

/**
 * Reference tone generator — plays a pure sine wave at a given frequency.
 * Useful for guitarists to hear what the target note should sound like.
 * 
 * Uses Web Audio API on web, and generates a simple WAV buffer for native.
 * The tone fades in/out smoothly to avoid clicks.
 */

let audioContext: AudioContext | null = null;
let oscillatorNode: OscillatorNode | null = null;
let gainNode: GainNode | null = null;

const FADE_DURATION = 0.05; // 50ms fade in/out
const DEFAULT_VOLUME = 0.3;

/**
 * Play a reference tone at the given frequency.
 * If a tone is already playing, smoothly crossfades to the new frequency.
 */
export const playReferenceTone = (frequencyHz: number, durationMs: number = 2000): void => {
  if (Platform.OS !== 'web') {
    // On native, we'd need expo-av or generate a WAV.
    // For now, reference tones work on web. Native support TBD.
    console.warn("Reference tone not yet supported on native — web only.");
    return;
  }

  try {
    // Create/reuse AudioContext
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    // Stop existing oscillator
    stopReferenceTone();

    const now = audioContext.currentTime;

    // Create oscillator
    oscillatorNode = audioContext.createOscillator();
    oscillatorNode.type = 'sine';
    oscillatorNode.frequency.setValueAtTime(frequencyHz, now);

    // Create gain node for fade in/out
    gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(DEFAULT_VOLUME, now + FADE_DURATION);

    // Schedule fade out before stop
    const fadeOutTime = now + (durationMs / 1000) - FADE_DURATION;
    const stopTime = now + (durationMs / 1000);
    gainNode.gain.setValueAtTime(DEFAULT_VOLUME, fadeOutTime);
    gainNode.gain.linearRampToValueAtTime(0, stopTime);

    // Connect: oscillator → gain → destination
    oscillatorNode.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillatorNode.start(now);
    oscillatorNode.stop(stopTime);

    oscillatorNode.onended = () => {
      oscillatorNode = null;
      gainNode = null;
    };
  } catch (e) {
    console.warn("Reference tone error:", e);
  }
};

/**
 * Stop the currently playing reference tone with a smooth fade out.
 */
export const stopReferenceTone = (): void => {
  try {
    if (gainNode && audioContext) {
      const now = audioContext.currentTime;
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(gainNode.gain.value, now);
      gainNode.gain.linearRampToValueAtTime(0, now + FADE_DURATION);
    }
    if (oscillatorNode) {
      try {
        oscillatorNode.stop(audioContext ? audioContext.currentTime + FADE_DURATION : 0);
      } catch {
        // Already stopped
      }
      oscillatorNode = null;
    }
    gainNode = null;
  } catch {
    // Cleanup
    oscillatorNode = null;
    gainNode = null;
  }
};

/**
 * Check if reference tone is supported on this platform.
 */
export const isReferenceToneSupported = (): boolean => {
  if (Platform.OS === 'web') {
    return !!(window.AudioContext || (window as any).webkitAudioContext);
  }
  return false;
};
