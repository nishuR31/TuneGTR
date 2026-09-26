import { useEffect, useRef, useCallback } from "react";
import {
  requestRecordingPermissionsAsync,
  getRecordingPermissionsAsync,
  useAudioStream,
} from "expo-audio";
import { Platform } from "react-native";
import { YinDetector, StabilityFilter, RingBuffer } from "@guitar-tool/tuner-core";
import {
  getMidi,
  getCents,
  getNoteName,
  getPitchClass,
  findNearestString,
} from "@guitar-tool/music-core";
import { useTunerStore } from "../store/tunerStore";
import { playReferenceTone } from "../utils/toneGenerator";

/**
 * Buffer: 4096 samples at 48kHz = ~85.3ms of audio history.
 * Ideal for YIN on low E2 (82.41 Hz):
 *   tauMax = 48000 / 50 = 960 samples.
 *   Constant integration window W = 4096 - 960 = 3136 samples (~5 full cycles of E2).
 */
const BUFFER_SIZE = 4096;
const DEFAULT_SAMPLE_RATE = 48000;

/**
 * State update throttle — 25ms = 40 updates/sec.
 */
const STATE_UPDATE_INTERVAL_MS = 25;

/**
 * Noise gate: RMS below this is considered silence.
 * 0.003 picks up quiet fingerpicking while ignoring ambient background room noise.
 */
const NOISE_GATE_THRESHOLD = 0.003;

/**
 * Core guitar tuner hook (optimized for Android & Web).
 */
export const useTuner = () => {
  // No full store subscription

  // Extract only needed values for hook return
  const isMicActive = useTunerStore((s) => s.isMicActive);
  const tunerState = useTunerStore((s) => s.tunerState);
  const hapticsEnabled = useTunerStore((s) => s.hapticsEnabled);
  const soundEnabled = useTunerStore((s) => s.soundEnabled);
  const targetFrequency = useTunerStore((s) => s.targetFrequency);

  /**
   * YIN detector:
   * - threshold = 0.15: optimal balance between harmonic rejection and sensitivity
   * - minFrequency = 50 Hz: covers drop D, drop C, 7-string B0, and 6-string low E2 (82.4 Hz)
   * - maxFrequency = 1100 Hz: covers high E4 (329.6 Hz) and harmonics up to C6
   * - silenceThreshold = 0.001: high sensitivity for soft notes
   */
  const detector = useRef(new YinDetector(0.15, 50, 1100, 0.001)).current;

  /**
   * StabilityFilter:
   * - historySize = 3: 3 audio frames before outputting (~200-300ms lock-on)
   * - emaAlpha = 0.7: responsive exponential moving average
   * - maxJumpCents = 600: allows octave transitions
   * - confidenceThreshold = 0.20: lower threshold to pass valid guitar notes
   */
  const stabilityFilter = useRef(new StabilityFilter(3, 0.7, 600, 0.20)).current;

  const buffer = useRef(new RingBuffer(BUFFER_SIZE)).current;
  const analysisBuffer = useRef(new Float32Array(BUFFER_SIZE)).current;
  const noSignalCounter = useRef(0);
  const noSignalFramesNeeded = useRef(3); // Clear note after 3 silent frames

  // Track last published frequency to detect new-string plucks
  const lastPublishedFreq = useRef(0);

  // State update throttle
  const lastStateUpdate = useRef(0);
  const pendingUpdate = useRef<Parameters<typeof useTunerStore.getState> | any>(null);

  // Web Audio fallback refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);

  // Flush pending state update to Zustand store
  const flushUpdate = useCallback(() => {
    if (pendingUpdate.current) {
      useTunerStore.getState().setPitchData(pendingUpdate.current);
      pendingUpdate.current = null;
    }
  }, []);

  /**
   * Process a Float32Array of normalized samples [-1.0, 1.0] at a given sample rate.
   */
  const processSamples = useCallback(
    (samples: Float32Array, sampleRate: number) => {
      const state = useTunerStore.getState();
      if (!state.isMicActive || samples.length === 0) return;

      const now = Date.now();

      try {
        buffer.push(samples);
        buffer.get(analysisBuffer);

        // RMS calculation for wave visualizer and noise gating
        let sum = 0;
        for (let i = 0; i < analysisBuffer.length; i++) {
          sum += analysisBuffer[i] * analysisBuffer[i];
        }
        const currentRms = Math.sqrt(sum / analysisBuffer.length);
        state.setRms(currentRms);

        // Noise gate check
        if (currentRms < NOISE_GATE_THRESHOLD) {
          noSignalCounter.current++;
          if (noSignalCounter.current >= noSignalFramesNeeded.current) {
            state.clearPitchData();
            lastPublishedFreq.current = 0;
            stabilityFilter.reset();
          }
          pendingUpdate.current = null;
          return;
        }

        noSignalCounter.current = 0;

        // Run YIN pitch detection on the analysis window
        const raw = detector.detect(analysisBuffer, sampleRate);

        if (!raw || raw.confidence < 0.15) {
          pendingUpdate.current = null;
          return;
        }

        // New-string jump detection: >80¢ jump resets filter for instant string switching
        if (lastPublishedFreq.current > 0) {
          const jumpCents = Math.abs(1200 * Math.log2(raw.frequency / lastPublishedFreq.current));
          if (jumpCents > 80) {
            stabilityFilter.reset();
            pendingUpdate.current = null;
          }
        }

        const stable = stabilityFilter.process(raw);
        if (!stable) return;

        const { frequency: rawFrequency, confidence } = stable;
        const referenceA4 = state.referenceA4;
        const capoFret = state.capoFret;
        const tuningStrings = state.activeTuning.stringsLowToHigh;

        // Apply capo offset if present
        const adjustedStrings = capoFret > 0
          ? tuningStrings.map((s) => ({
              ...s,
              midi: s.midi + capoFret,
              note: getNoteName(s.midi + capoFret),
            }))
          : tuningStrings;

        // Manual string lock filter
        const targetStrings = state.manualStringPosition > 0
          ? adjustedStrings.filter((s) => s.position === state.manualStringPosition)
          : adjustedStrings;

        const searchStrings = targetStrings.length > 0 ? targetStrings : adjustedStrings;

        // ─── Harmonic correction ──────────────────────────────────────────────
        // YIN pitch detection on wound low strings (4 = D3, 5 = A2, 6 = E2) often
        // locks onto the 2nd harmonic (2× the fundamental) instead of the fundamental.
        // This makes the tuner report the wrong pitch direction — e.g. "tune down" when
        // the string is perfectly in tune or slightly sharp.
        //
        // Fix: also test f/2 as a candidate and pick whichever frequency (f or f/2)
        // has the smallest absolute cents distance to any target guitar string.
        //
        // Safety guard: only test f/2 when it is ≥ 60 Hz (covers the lowest guitar
        // fundamental, E2 = 82.4 Hz), preventing phantom sub-bass matches.
        const candidateFreqs: number[] = [rawFrequency];
        if (rawFrequency / 2 >= 60) candidateFreqs.push(rawFrequency / 2);

        let nearest: ReturnType<typeof findNearestString> = null;
        let frequency = rawFrequency;
        let nearestAbsCents = Infinity;

        for (const f of candidateFreqs) {
          const n = findNearestString(f, searchStrings, referenceA4);
          if (n) {
            const absCents = Math.abs(getCents(f, n.targetFrequency));
            if (absCents < nearestAbsCents) {
              nearestAbsCents = absCents;
              nearest = n;
              frequency = f;
            }
          }
        }
        // ─────────────────────────────────────────────────────────────────────

        if (!nearest) return;

        const cents = getCents(frequency, nearest.targetFrequency);
        // Allow wider range when locked on (1200 cents = 1 octave) vs auto-detect (350 cents)
        const maxCentsOff = state.manualStringPosition > 0 ? 1200 : 350;
        if (Math.abs(cents) > maxCentsOff) return;

        const midi = getMidi(frequency, referenceA4);
        const noteName = getPitchClass(midi);
        const octave = Math.floor(midi / 12) - 1;

        // Track raw (pre-correction) smoothed frequency so the jump-detection
        // comparison above (raw.frequency vs lastPublishedFreq) stays consistent
        // and won't spuriously reset the stability filter on every frame.
        lastPublishedFreq.current = rawFrequency;

        // Switch to signal_detected if currently listening/idle
        if (state.tunerState === "listening" || state.tunerState === "no_signal") {
          state.setTunerState("signal_detected");
        }

        const update = {
          frequency,
          cents,
          noteName,
          octave,
          confidence,
          rms: currentRms,
          detectedStringPosition: nearest.position,
          detectedStringNote: nearest.note,
          targetFrequency: nearest.targetFrequency,
        };

        // Throttle updates to UI frame rate (40fps)
        if (now - lastStateUpdate.current >= STATE_UPDATE_INTERVAL_MS) {
          state.setPitchData(update);
          lastStateUpdate.current = now;
          pendingUpdate.current = null;
        } else {
          pendingUpdate.current = update;
        }
      } catch (e) {
        console.warn("Pitch processing error:", e);
      }
    },
    [detector, stabilityFilter, buffer, analysisBuffer],
  );

  /**
   * Process incoming buffer from expo-audio stream.
   * Android AudioRecord uses 16-bit PCM integer samples (int16).
   */
  const processNativeAudio = useCallback(
    (bufferData: { data: ArrayBuffer; sampleRate: number; channels: number; timestamp?: number }) => {
      if (!bufferData?.data || bufferData.data.byteLength === 0) return;

      const actualSampleRate = bufferData.sampleRate > 0 ? bufferData.sampleRate : DEFAULT_SAMPLE_RATE;
      const rawBytes = bufferData.data;

      // 16-bit signed PCM (2 bytes per sample) — standard for Android AudioRecord
      if (rawBytes.byteLength % 2 === 0) {
        const int16Samples = new Int16Array(rawBytes);
        const floatSamples = new Float32Array(int16Samples.length);
        for (let i = 0; i < int16Samples.length; i++) {
          floatSamples[i] = int16Samples[i] / 32768.0;
        }
        processSamples(floatSamples, actualSampleRate);
      }
    },
    [processSamples],
  );

  // Periodic flush of pending updates
  useEffect(() => {
    if (!isMicActive) return;
    const interval = setInterval(flushUpdate, STATE_UPDATE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isMicActive, flushUpdate]);

  // expo-audio stream hook: request int16 PCM for universal Android hardware support
  const { stream } = useAudioStream({
    sampleRate: DEFAULT_SAMPLE_RATE,
    channels: 1,
    encoding: "int16",
    onBuffer: processNativeAudio,
  });

  const startListening = useCallback(async () => {
    try {
      // Check and request microphone permission
      let permission = await getRecordingPermissionsAsync();
      if (!permission.granted) {
        permission = await requestRecordingPermissionsAsync();
      }

      if (!permission.granted) {
        useTunerStore.getState().setTunerState("permission_denied");
        return;
      }

      useTunerStore.getState().setMicActive(true);
      useTunerStore.getState().setTunerState("listening");
      stabilityFilter.reset();
      noSignalCounter.current = 0;
      lastStateUpdate.current = 0;
      lastPublishedFreq.current = 0;
      pendingUpdate.current = null;

      if (Platform.OS === "android") {
        if (stream && !stream.isStreaming) {
          await stream.start();
        }
      } else {
        // Web fallback using Web Audio API
        if (!navigator?.mediaDevices?.getUserMedia) {
          console.error("getUserMedia not supported");
          useTunerStore.getState().setTunerState("error");
          return;
        }

        const streamWeb = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            channelCount: 1,
            sampleRate: DEFAULT_SAMPLE_RATE,
          },
        });

        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: DEFAULT_SAMPLE_RATE,
          latencyHint: "interactive",
        });

        if (ctx.state === "suspended") {
          await ctx.resume();
        }

        const source = ctx.createMediaStreamSource(streamWeb);
        const processor = ctx.createScriptProcessor(BUFFER_SIZE, 1, 1);
        const gainNode = ctx.createGain();
        gainNode.gain.value = 0;

        processor.onaudioprocess = (e) => {
          const channelData = e.inputBuffer.getChannelData(0);
          const copy = new Float32Array(channelData);
          processSamples(copy, ctx.sampleRate);
        };

        source.connect(processor);
        processor.connect(gainNode);
        gainNode.connect(ctx.destination);

        audioContextRef.current = ctx;
        mediaStreamRef.current = streamWeb;
        sourceNodeRef.current = source;
        processorNodeRef.current = processor;
      }
    } catch (error) {
      console.error("Failed to start audio capture:", error);
      useTunerStore.getState().setTunerState("error");
    }
  }, [stream, processSamples, stabilityFilter]);

  const stopListening = useCallback(() => {
    if (Platform.OS === "android") {
      if (stream) {
        try {
          stream.stop();
        } catch (e) {
          // Already stopped
        }
      }
    } else {
      if (processorNodeRef.current) {
        processorNodeRef.current.disconnect();
        processorNodeRef.current.onaudioprocess = null;
        processorNodeRef.current = null;
      }
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
    }

    useTunerStore.getState().setMicActive(false);
    useTunerStore.getState().setTunerState("idle");
    useTunerStore.getState().clearPitchData();
    stabilityFilter.reset();
    noSignalCounter.current = 0;
    lastStateUpdate.current = 0;
    lastPublishedFreq.current = 0;
    pendingUpdate.current = null;
  }, [stream, stabilityFilter]);

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  // Haptic feedback & reference tone on in-tune state
  const prevTunerState = useRef(tunerState);
  useEffect(() => {
    if (tunerState !== prevTunerState.current) {
      if (hapticsEnabled) {
        import("expo-haptics")
          .then((Haptics) => {
            if (tunerState === "in_tune") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            } else if (tunerState === "flat" || tunerState === "sharp") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            } else if (tunerState === "listening" || tunerState === "signal_detected") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
            }
          })
          .catch(() => {});
      }

      if (soundEnabled && tunerState === "in_tune") {
        try {
          playReferenceTone(targetFrequency || 440, 200);
        } catch (e) {
          // ignore
        }
      }
    }
    prevTunerState.current = tunerState;
  }, [tunerState, hapticsEnabled, soundEnabled, targetFrequency]);

  return {
    startListening,
    stopListening,
    isListening: isMicActive,
  };
};
