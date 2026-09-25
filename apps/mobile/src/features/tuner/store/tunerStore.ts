import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { TuningDefinition } from "@guitar-tool/music-core";
import { TUNINGS } from "@guitar-tool/music-core";

// ─── Tuner State Machine (Section 13 of design plan) ────────────────────────

export type TunerState =
  | "idle"
  | "permission_required"
  | "permission_denied"
  | "listening"
  | "signal_detected"
  | "flat"
  | "sharp"
  | "in_tune"
  | "unstable"
  | "no_signal"
  | "error";

export interface TunerStoreState {
  // Audio state
  tunerState: TunerState;
  isMicActive: boolean;

  // Pitch data
  frequency: number;
  cents: number;
  noteName: string;
  octave: number;
  confidence: number;
  rms: number;

  // String detection
  detectedStringPosition: number;
  detectedStringNote: string;
  targetFrequency: number;

  // Tuning selection
  activeTuning: TuningDefinition;
  referenceA4: number;

  // Manual string selection (-1 = auto)
  manualStringPosition: number;

  // Capo support — shifts all target frequencies up by this many semitones
  capoFret: number;

  // Reference tone playback state
  isPlayingTone: boolean;

  // Actions
  setTunerState: (state: TunerState) => void;
  setMicActive: (active: boolean) => void;
  setPitchData: (data: {
    frequency: number;
    cents: number;
    noteName: string;
    octave: number;
    confidence: number;
    rms: number;
    detectedStringPosition: number;
    detectedStringNote: string;
    targetFrequency: number;
  }) => void;
  clearPitchData: () => void;
  setActiveTuning: (tuning: TuningDefinition) => void;
  setReferenceA4: (hz: number) => void;
  setManualStringPosition: (pos: number) => void;
  setRms: (rms: number) => void;
  setCapoFret: (fret: number) => void;
  setIsPlayingTone: (playing: boolean) => void;
}

const IN_TUNE_THRESHOLD = 5; // cents — per design plan §14

/**
 * Zustand store for tuner state.
 * 
 * Performance: uses a single `set()` call per update to batch
 * React re-renders. Selector-based consumption in components
 * ensures only affected components re-render.
 * 
 * Persists: referenceA4, capoFret, activeTuning via AsyncStorage.
 */
export const useTunerStore = create<TunerStoreState>()(
  persist(
    (set) => ({
      tunerState: "idle",
      isMicActive: false,

      frequency: 0,
      cents: 0,
      noteName: "--",
      octave: 0,
      confidence: 0,
      rms: 0,

      detectedStringPosition: 0,
      detectedStringNote: "--",
      targetFrequency: 0,

      activeTuning: TUNINGS[0], // Standard
      referenceA4: 440,
      manualStringPosition: -1, // -1 = auto
      capoFret: 0,
      isPlayingTone: false,

      setTunerState: (tunerState) => set({ tunerState }),
      setMicActive: (isMicActive) => set({ isMicActive }),

      setPitchData: (data) => {
        const absCents = Math.abs(data.cents);
        let tunerState: TunerState;

        if (absCents <= IN_TUNE_THRESHOLD) {
          tunerState = "in_tune";
        } else if (data.cents < 0) {
          tunerState = "flat";
        } else {
          tunerState = "sharp";
        }

        set({
          ...data,
          tunerState,
        });
      },

      clearPitchData: () =>
        set({
          frequency: 0,
          cents: 0,
          noteName: "--",
          octave: 0,
          confidence: 0,
          rms: 0,
          detectedStringPosition: 0,
          detectedStringNote: "--",
          targetFrequency: 0,
          tunerState: "no_signal",
        }),

      setActiveTuning: (activeTuning) => set({ activeTuning, manualStringPosition: -1 }),
      setReferenceA4: (referenceA4) => set({ referenceA4 }),
      setManualStringPosition: (manualStringPosition) => set({ manualStringPosition }),
      setRms: (rms) => set({ rms }),
      setCapoFret: (capoFret) => set({ capoFret }),
      setIsPlayingTone: (isPlayingTone) => set({ isPlayingTone }),
    }),
    {
      name: "tuner-settings-storage",
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist settings, not live audio state
      partialize: (state) => ({
        referenceA4: state.referenceA4,
        capoFret: state.capoFret,
        activeTuning: state.activeTuning,
      }),
    },
  ),
);

// ─── Optimized Selectors ────────────────────────────────────────────────────
// Components should use these to subscribe to only the data they need,
// avoiding unnecessary re-renders from unrelated state changes.

export const usePitchData = () =>
  useTunerStore((s) => ({
    frequency: s.frequency,
    cents: s.cents,
    noteName: s.noteName,
    octave: s.octave,
    tunerState: s.tunerState,
    confidence: s.confidence,
    targetFrequency: s.targetFrequency,
    detectedStringPosition: s.detectedStringPosition,
    detectedStringNote: s.detectedStringNote,
  }));

export const useTuningConfig = () =>
  useTunerStore((s) => ({
    activeTuning: s.activeTuning,
    referenceA4: s.referenceA4,
    capoFret: s.capoFret,
    setActiveTuning: s.setActiveTuning,
    setReferenceA4: s.setReferenceA4,
    setCapoFret: s.setCapoFret,
  }));

export const useAudioState = () =>
  useTunerStore((s) => ({
    isMicActive: s.isMicActive,
    rms: s.rms,
    tunerState: s.tunerState,
  }));
