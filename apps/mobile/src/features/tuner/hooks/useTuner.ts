import { useEffect, useRef, useCallback } from "react";
import {
  requestRecordingPermissionsAsync,
  getRecordingPermissionsAsync,
  useAudioStream,
} from "expo-audio";
import { Platform } from "react-native";
import { YinDetector, StabilityFilter, RingBuffer } from "@tunergtr/tuner-core";
import {
  getMidi,
  getCents,
  getNoteName,
  transposeNoteName,
  findNearestString,
  resolvePitchAgainstTarget,
} from "@tunergtr/music-core";
import { useTunerStore } from "../store/tunerStore";

/**
 * Production tuner signal path:
 *
 * microphone
 *   -> mono PCM
 *   -> 4096-sample rolling window
 *   -> DC removal + RMS gate
 *   -> YIN F0 estimation
 *   -> confidence rejection
 *   -> median + EMA stabilization
 *   -> target selection
 *   -> cents
 *   -> tuner state
 *
 * 4096 samples at 48 kHz is ~85 ms. That gives several cycles of low E2 while
 * keeping latency low enough for a live tuner.
 */
const BUFFER_SIZE = 4096;
const DEFAULT_SAMPLE_RATE = 48000;
const STATE_UPDATE_INTERVAL_MS = 33; // ~30 UI updates/sec

// These are signal-processing thresholds, not "accuracy" claims.
const NOISE_GATE_THRESHOLD = 0.0015;
const MIN_DETECTOR_CONFIDENCE = 0.30;

// Automatic mode is intentionally conservative: never invent a string from
// an octave-transformed frequency.
const AUTO_STRING_MAX_CENTS = 240;

// Manual mode knows the exact target, so it can guide a user through a badly
// detuned string. 250¢ = 2.5 semitones.
const MANUAL_STRING_MAX_CENTS = 300;

// Once an automatic string is acquired, a sustained note may drift this far
// before the lock is released. 250¢ stays below the smallest 300¢ interval
// between configured guitar targets (G3 -> B3), so the lock cannot swallow the
// adjacent string.
const STRING_LOCK_RELEASE_CENTS = 220;

export const useTuner = () => {
  const isMicActive = useTunerStore((s) => s.isMicActive);
  const tunerState = useTunerStore((s) => s.tunerState);
  const hapticsEnabled = useTunerStore((s) => s.hapticsEnabled);
  const soundEnabled = useTunerStore((s) => s.soundEnabled);
  const targetFrequency = useTunerStore((s) => s.targetFrequency);

  const detector = useRef(
    new YinDetector(0.12, 55, 700, NOISE_GATE_THRESHOLD),
  ).current;

  const stabilityFilter = useRef(
    new StabilityFilter(5, 0.30, 250, MIN_DETECTOR_CONFIDENCE),
  ).current;

  const buffer = useRef(new RingBuffer(BUFFER_SIZE)).current;
  const analysisBuffer = useRef(new Float32Array(BUFFER_SIZE)).current;

  const invalidPitchCounter = useRef(0);

  // Automatic mode lock. This prevents a sustained note from jumping between
  // nearby targets as harmonics change during decay.
  const lockedStringPosition = useRef<number | null>(null);
  const lastPublishedFreq = useRef(0);
  const lastConfigKey = useRef("");

  const lastStateUpdate = useRef(0);
  const pendingUpdate = useRef<any>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);

  const flushUpdate = useCallback(() => {
    if (pendingUpdate.current) {
      useTunerStore.getState().setPitchData(pendingUpdate.current);
      pendingUpdate.current = null;
    }
  }, []);

  const resetTracking = useCallback(() => {
    stabilityFilter.reset();
    buffer.clear();
    lockedStringPosition.current = null;
    lastPublishedFreq.current = 0;
    invalidPitchCounter.current = 0;
    lastStateUpdate.current = 0;
    pendingUpdate.current = null;
  }, [buffer, stabilityFilter]);

  const processSamples = useCallback(
    (samples: Float32Array, sampleRate: number) => {
      const state = useTunerStore.getState();
      if (!state.isMicActive || samples.length === 0) return;

      const now = Date.now();

      try {
        const configKey =
          `${state.activeTuning.id}:${state.referenceA4}:` +
          `${state.capoFret}:${state.manualStringPosition}`;

        if (lastConfigKey.current !== configKey) {
          lastConfigKey.current = configKey;
          stabilityFilter.reset();
          lockedStringPosition.current = null;
          lastPublishedFreq.current = 0;
          pendingUpdate.current = null;
        }

        buffer.push(samples);
        if (!buffer.isReady) return;

        buffer.get(analysisBuffer);

        // YIN performs the authoritative DC removal/RMS calculation. We only
        // publish the RMS here for the visualizer.
        const adjustedStringsForDetection = state.activeTuning.stringsLowToHigh.map((s) => ({
          midi: s.midi + state.capoFret,
        }));
        const targetFrequenciesForDetection = adjustedStringsForDetection.map((s) =>
          440 * Math.pow(2, (s.midi - 69) / 12),
        );

        const raw = detector.detect(
          analysisBuffer,
          sampleRate,
          targetFrequenciesForDetection,
        );

        if (!raw || raw.confidence < MIN_DETECTOR_CONFIDENCE) {
          invalidPitchCounter.current++;

          if (
            invalidPitchCounter.current >= 3 &&
            state.tunerState !== "no_signal"
          ) {
            state.setTunerState("unstable");
          }

          if (invalidPitchCounter.current >= 15) {
            state.clearPitchData();
            resetTracking();
          }

          pendingUpdate.current = null;
          return;
        }

        invalidPitchCounter.current = 0;
        state.setRms(raw.rms);

        // Reject an isolated large detector jump before it enters the smoothing
        // history. A real new string will be reacquired after the filter reset.
        if (lastPublishedFreq.current > 0) {
          const jumpCents = Math.abs(
            getCents(raw.frequency, lastPublishedFreq.current),
          );

          if (jumpCents > 250) {
            stabilityFilter.reset();
            lockedStringPosition.current = null;
          }
        }

        const stable = stabilityFilter.process(raw);
        if (!stable) return;

        const rawFrequency = stable.frequency;
        const confidence = stable.confidence;
        const referenceA4 = state.referenceA4;
        const capoFret = state.capoFret;

        const adjustedStrings = capoFret > 0
          ? state.activeTuning.stringsLowToHigh.map((s) => ({
              ...s,
              midi: s.midi + capoFret,
              note: transposeNoteName(s.note, capoFret),
            }))
          : state.activeTuning.stringsLowToHigh;

        const manualString =
          state.manualStringPosition > 0
            ? adjustedStrings.find(
                (s) => s.position === state.manualStringPosition,
              ) ?? null
            : null;

        let nearest: ReturnType<typeof findNearestString> = null;
        let frequency = rawFrequency;
        let cents = 0;

        if (manualString) {
          // Manual selection is deterministic. The selected string is the only
          // target. Octave recovery is safe here because the user supplied the
          // target explicitly.
          const targetFrequency =
            referenceA4 *
            Math.pow(2, (manualString.midi - 69) / 12);

          const resolved = resolvePitchAgainstTarget(
            rawFrequency,
            targetFrequency,
            {
              maxDirectCents: MANUAL_STRING_MAX_CENTS,
              octaveToleranceCents: 35,
            },
          );

          if (!resolved) {
            if (
              lockedStringPosition.current === manualString.position
            ) {
              lockedStringPosition.current = null;
            }
            return;
          }

          frequency = resolved.frequency;
          cents = resolved.cents;
          nearest = {
            ...manualString,
            targetFrequency,
            cents,
            absCents: Math.abs(cents),
          };

          lockedStringPosition.current = manualString.position;
        } else {
          // IMPORTANT:
          // Automatic acquisition uses the detector's actual fundamental only.
          // We do NOT test f/2 or 2f here. Otherwise a real E3 can be silently
          // converted to E2 and a correctly tuned string can be assigned the
          // wrong target. This is preferable to displaying a confident lie.
          const locked =
            lockedStringPosition.current !== null
              ? adjustedStrings.find(
                  (s) =>
                    s.position === lockedStringPosition.current,
                ) ?? null
              : null;

          if (locked) {
            const targetFrequency =
              referenceA4 *
              Math.pow(2, (locked.midi - 69) / 12);

            const directCents = getCents(
              rawFrequency,
              targetFrequency,
            );

            if (
              Math.abs(directCents) <=
              STRING_LOCK_RELEASE_CENTS
            ) {
              nearest = {
                ...locked,
                targetFrequency,
                cents: directCents,
                absCents: Math.abs(directCents),
              };
              frequency = rawFrequency;
              cents = directCents;
            } else {
              lockedStringPosition.current = null;
            }
          }

          if (!nearest) {
            const best = findNearestString(
              rawFrequency,
              adjustedStrings,
              referenceA4,
              AUTO_STRING_MAX_CENTS,
            );

            if (!best) {
              // The pitch is valid, but it does not correspond closely enough
              // to any configured open string. Do not invent a target.
              state.setTunerState("unstable");
              pendingUpdate.current = null;
              return;
            }

            nearest = best;
            frequency = rawFrequency;
            cents = best.cents;
            lockedStringPosition.current = best.position;
          }
        }

        if (
          !nearest ||
          !Number.isFinite(frequency) ||
          !Number.isFinite(cents)
        ) {
          return;
        }

        const midi = getMidi(frequency, referenceA4);
        const noteName = getNoteName(midi);
        const octave = Math.floor(midi / 12) - 1;

        lastPublishedFreq.current = rawFrequency;

        const update = {
          frequency,
          cents,
          noteName,
          octave,
          confidence,
          rms: raw.rms,
          detectedStringPosition: nearest.position,
          detectedStringNote: nearest.note,
          targetFrequency: nearest.targetFrequency,
        };

        if (
          now - lastStateUpdate.current >=
          STATE_UPDATE_INTERVAL_MS
        ) {
          state.setPitchData(update);
          lastStateUpdate.current = now;
          pendingUpdate.current = null;
        } else {
          pendingUpdate.current = update;
        }
      } catch (error) {
        console.warn("Pitch processing error:", error);
      }
    },
    [analysisBuffer, buffer, detector, resetTracking, stabilityFilter],
  );

  const processNativeAudio = useCallback(
    (bufferData: {
      data: ArrayBuffer;
      sampleRate: number;
      channels: number;
      timestamp?: number;
    }) => {
      if (
        !bufferData?.data ||
        bufferData.data.byteLength === 0
      ) {
        return;
      }

      const actualSampleRate =
        bufferData.sampleRate > 0
          ? bufferData.sampleRate
          : DEFAULT_SAMPLE_RATE;

      const channels = Math.max(
        1,
        Math.floor(bufferData.channels || 1),
      );

      // expo-audio float32 PCM is normalized to [-1, 1]. Decode explicitly as
      // little-endian float32 and downmix interleaved channels to mono. Using
      // one representation end-to-end avoids an int16/float32 mismatch that can
      // destroy pitch detection while still producing plausible-looking data.
      const bytes = bufferData.data;
      const frameBytes = channels * 4;
      if (bytes.byteLength < frameBytes) return;

      const frameCount = Math.floor(bytes.byteLength / frameBytes);
      const mono = new Float32Array(frameCount);
      const view = new DataView(bytes);

      for (let frame = 0; frame < frameCount; frame++) {
        let sum = 0;
        const base = frame * frameBytes;
        for (let channel = 0; channel < channels; channel++) {
          sum += view.getFloat32(base + channel * 4, true);
        }
        mono[frame] = sum / channels;
      }

      processSamples(mono, actualSampleRate);
    },
    [processSamples],
  );

  useEffect(() => {
    if (!isMicActive) return;

    const interval = setInterval(
      flushUpdate,
      STATE_UPDATE_INTERVAL_MS,
    );

    return () => clearInterval(interval);
  }, [flushUpdate, isMicActive]);

  const { stream } = useAudioStream({
    sampleRate: DEFAULT_SAMPLE_RATE,
    channels: 1,
    encoding: "float32",
    onBuffer: processNativeAudio,
  });

  const startListening = useCallback(async () => {
    try {
      let permission = await getRecordingPermissionsAsync();

      if (!permission.granted) {
        permission = await requestRecordingPermissionsAsync();
      }

      if (!permission.granted) {
        useTunerStore
          .getState()
          .setTunerState("permission_denied");
        return;
      }

      useTunerStore.getState().setMicActive(true);
      useTunerStore.getState().setTunerState("listening");

      resetTracking();
      lastConfigKey.current = "";

      if (Platform.OS === "android") {
        if (stream && !stream.isStreaming) {
          await stream.start();
        }
        return;
      }

      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        useTunerStore.getState().setTunerState("error");
        return;
      }

      const streamWeb =
        await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            channelCount: 1,
            sampleRate: DEFAULT_SAMPLE_RATE,
          },
        });

      const AudioContextCtor =
        window.AudioContext ||
        (window as any).webkitAudioContext;

      if (!AudioContextCtor) {
        streamWeb.getTracks().forEach((track) => track.stop());
        useTunerStore.getState().setTunerState("error");
        return;
      }

      const ctx = new AudioContextCtor({
        sampleRate: DEFAULT_SAMPLE_RATE,
        latencyHint: "interactive",
      });

      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      const source = ctx.createMediaStreamSource(streamWeb);
      const processor = ctx.createScriptProcessor(
        BUFFER_SIZE,
        1,
        1,
      );

      // Keep the processor alive without feeding microphone audio back to the
      // user. A zero-gain node is used instead of connecting to destination
      // directly, avoiding acoustic feedback.
      const silentOutput = ctx.createGain();
      silentOutput.gain.value = 0;

      processor.onaudioprocess = (event) => {
        const channelData =
          event.inputBuffer.getChannelData(0);
        processSamples(
          new Float32Array(channelData),
          event.inputBuffer.sampleRate,
        );
      };

      source.connect(processor);
      processor.connect(silentOutput);
      silentOutput.connect(ctx.destination);

      audioContextRef.current = ctx;
      mediaStreamRef.current = streamWeb;
      sourceNodeRef.current = source;
      processorNodeRef.current = processor;
    } catch (error) {
      console.error("Failed to start audio capture:", error);
      useTunerStore.getState().setTunerState("error");
      useTunerStore.getState().setMicActive(false);
    }
  }, [processSamples, resetTracking, stabilityFilter, stream]);

  const stopListening = useCallback(() => {
    if (Platform.OS === "android") {
      try {
        stream?.stop();
      } catch {
        // Already stopped.
      }
    } else {
      if (processorNodeRef.current) {
        processorNodeRef.current.disconnect();
        processorNodeRef.current.onaudioprocess = null;
        processorNodeRef.current = null;
      }

      sourceNodeRef.current?.disconnect();
      sourceNodeRef.current = null;

      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }

      mediaStreamRef.current
        ?.getTracks()
        .forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    useTunerStore.getState().setMicActive(false);
    useTunerStore.getState().setTunerState("idle");
    useTunerStore.getState().clearPitchData();

    resetTracking();
    lastConfigKey.current = "";
  }, [resetTracking, stream]);

  useEffect(() => {
    return () => stopListening();
  }, [stopListening]);

  // Haptics are intentionally only fired on the transition into "in tune".
  // Do not play an audible reference tone automatically: the phone speaker can
  // be picked up by the microphone and create a feedback loop or a false pitch.
  const prevTunerState = useRef(tunerState);

  useEffect(() => {
    if (
      tunerState !== prevTunerState.current &&
      tunerState === "in_tune" &&
      hapticsEnabled
    ) {
      import("expo-haptics")
        .then((Haptics) => {
          Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          ).catch(() => {});
        })
        .catch(() => {});
    }

    prevTunerState.current = tunerState;
  }, [hapticsEnabled, tunerState]);

  return {
    startListening,
    stopListening,
    isListening: isMicActive,
  };
};
