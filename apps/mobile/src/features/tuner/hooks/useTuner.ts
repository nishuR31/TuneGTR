import { useEffect, useRef, useCallback } from "react";
import { requestRecordingPermissionsAsync, useAudioStream } from "expo-audio";
import { Platform } from "react-native";
import { YinDetector, StabilityFilter, RingBuffer } from "@guitar-tool/tuner-core";
import {
  getMidi,
  getTargetFrequency,
  getCents,
  getNoteName,
  getPitchClass,
  findNearestString,
} from "@guitar-tool/music-core";
import { useTunerStore } from "../store/tunerStore";
import { playReferenceTone } from "../utils/toneGenerator";

/**
 * Buffer size: 2048 samples at 48kHz = ~42ms latency.
 */
const BUFFER_SIZE = 2048;
const SAMPLE_RATE = 48000;

/**
 * State update throttle — 25ms = 40fps.
 * Fast enough to feel instant, avoids React render storms.
 */
const STATE_UPDATE_INTERVAL_MS = 25;

/**
 * Noise gate threshold (RMS). Signal below this is ignored.
 * 0.004 = very sensitive, picks up soft fingerpicks.
 */
const NOISE_GATE_THRESHOLD = 0.004;

/**
 * Core tuner hook.
 *
 * Audio pipeline philosophy: ALWAYS discard stale queued frames.
 * "Latest frame wins" — when a new string is plucked, we never
 * show results from a previous string. We use a frame-age guard:
 * if a buffer arrives but its wall-clock timestamp is older than
 * MAX_FRAME_AGE_MS, it is dropped immediately, preventing the
 * "ghost processing after stop" bug.
 *
 * Stability filter is reset on every large frequency jump (new string),
 * so lock-on to the new string happens in ≤2 frames.
 */
export const useTuner = () => {
  const store = useTunerStore();

  // YIN: threshold=0.15, silence=0.001 — matches updated detector.ts defaults
  // maxFreq=1050Hz covers guitar harmonics that aid fundamental detection
  const detector = useRef(new YinDetector(0.15, 50, 1050, 0.001)).current;
  // StabilityFilter: 2-frame history, EMA=0.65, confidenceThreshold=0.30
  // New-string reset handled upstream via lastPublishedFreq jump detection
  const stabilityFilter = useRef(new StabilityFilter(2, 0.65, 800, 0.30)).current;
  const buffer = useRef(new RingBuffer(BUFFER_SIZE)).current;
  const analysisBuffer = useRef(new Float32Array(BUFFER_SIZE)).current;
  const noSignalCounter = useRef(0);

  // Frame-age guard: drop frames that are too old (stale queue flush)
  const lastFrameReceivedAt = useRef(0);
  const MAX_FRAME_AGE_MS = 60; // frames older than 60ms are stale — drop them

  // Minimum gap between processed frames to prevent JS thread backlog
  const lastProcessTime = useRef(0);
  const MIN_FRAME_GAP_MS = 15; // process at most ~66fps, enough for 40fps UI

  // State update throttle
  const lastStateUpdate = useRef(0);
  const pendingUpdate = useRef<Parameters<typeof store.setPitchData>[0] | null>(null);

  // Track last published frequency to detect new-string plucks
  const lastPublishedFreq = useRef(0);

  // Web Audio Fallback refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);

  // Flush pending state update on timer
  const flushUpdate = useCallback(() => {
    if (pendingUpdate.current) {
      store.setPitchData(pendingUpdate.current);
      pendingUpdate.current = null;
    }
  }, []);

  // Process incoming audio frame
  const processAudio = useCallback(
    (bufferData: { data: ArrayBuffer; sampleRate: number; channels: number }) => {
      if (!store.isMicActive) return;

      const now = Date.now();

      // ── STALE FRAME DROP ──
      // If this frame arrived long after the previous one, the JS event loop
      // was backlogged (e.g. after rapid plucking). Drop it so we only process
      // the CURRENT moment's audio, never old queued audio.
      const frameAge = now - lastFrameReceivedAt.current;
      if (lastFrameReceivedAt.current > 0 && frameAge > MAX_FRAME_AGE_MS) {
        // Queue was flushing stale audio — reset state so nothing stale shows
        lastFrameReceivedAt.current = now;
        pendingUpdate.current = null;
        // Don't reset noSignalCounter here — let the real next frame decide
        return;
      }
      lastFrameReceivedAt.current = now;

      // ── RATE LIMIT ── prevent multiple frames in the same JS tick
      if (now - lastProcessTime.current < MIN_FRAME_GAP_MS) return;
      lastProcessTime.current = now;

      try {
        const frames = bufferData.data;
        if (!frames || frames.byteLength === 0) return;

        const samples = new Float32Array(frames);
        buffer.push(samples);
        buffer.get(analysisBuffer);

        // RMS — always update immediately for waveform responsiveness
        let sum = 0;
        for (let i = 0; i < analysisBuffer.length; i++) {
          sum += analysisBuffer[i] * analysisBuffer[i];
        }
        const currentRms = Math.sqrt(sum / analysisBuffer.length);
        store.setRms(currentRms);

        // Noise gate — fast clear (2 frames)
        if (currentRms < NOISE_GATE_THRESHOLD) {
          noSignalCounter.current++;
          if (noSignalCounter.current >= 2) {
            store.clearPitchData();
            lastPublishedFreq.current = 0;
            stabilityFilter.reset();
          }
          pendingUpdate.current = null;
          return;
        }

        noSignalCounter.current = 0;

        // Pitch detection
        const actualSampleRate = bufferData.sampleRate || SAMPLE_RATE;
        const raw = detector.detect(analysisBuffer, actualSampleRate);

        if (!raw) {
          // No pitch — but keep waveform active
          pendingUpdate.current = null;
          return;
        }

        // Minimum confidence gate — YIN at 0.12 is reliable for guitar
        if (raw.confidence < 0.12) return;

        // ── NEW-STRING DETECTION ──
        // >100¢ jump = new string plucked. Instant reset so old-string EMA can't bleed.
        if (lastPublishedFreq.current > 0) {
          const jumpCents = Math.abs(1200 * Math.log2(raw.frequency / lastPublishedFreq.current));
          if (jumpCents > 100) {
            stabilityFilter.reset();
            pendingUpdate.current = null;
          }
        }

        const stable = stabilityFilter.process(raw);
        if (!stable) return;

        const { frequency, confidence } = stable;
        const referenceA4 = store.referenceA4;
        const capoFret = store.capoFret;
        const tuningStrings = store.activeTuning.stringsLowToHigh;

        // Apply capo offset
        const adjustedStrings = capoFret > 0
          ? tuningStrings.map(s => ({
            ...s,
            midi: s.midi + capoFret,
            note: getNoteName(s.midi + capoFret),
          }))
          : tuningStrings;

        // Manual string lock filtering
        const targetStrings = store.manualStringPosition > 0
          ? adjustedStrings.filter(s => s.position === store.manualStringPosition)
          : adjustedStrings;

        let nearest = findNearestString(
          frequency,
          targetStrings.length > 0 ? targetStrings : adjustedStrings,
          referenceA4,
        );

        // Fallback: if manual lock but freq is way off, auto-detect
        if (nearest && store.manualStringPosition > 0 && Math.abs(nearest.cents) > 400) {
          nearest = findNearestString(frequency, adjustedStrings, referenceA4);
        }

        if (!nearest) return;

        const cents = getCents(frequency, nearest.targetFrequency);
        if (Math.abs(cents) > 400) return;

        const midi = getMidi(frequency, referenceA4);
        const noteName = getPitchClass(midi);
        const octave = Math.floor(midi / 12) - 1;

        lastPublishedFreq.current = frequency;

        // Mark signal_detected before full pitch data (makes state banner appear sooner)
        if (store.tunerState === 'listening' || store.tunerState === 'no_signal') {
          store.setTunerState('signal_detected');
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

        // Throttle React state writes to STATE_UPDATE_INTERVAL_MS
        if (now - lastStateUpdate.current >= STATE_UPDATE_INTERVAL_MS) {
          store.setPitchData(update);
          lastStateUpdate.current = now;
          pendingUpdate.current = null;
        } else {
          pendingUpdate.current = update;
        }
      } catch (e) {
        console.warn("Pitch processing error:", e);
      }
    },
    [store.isMicActive, store.referenceA4, store.activeTuning, store.manualStringPosition, store.capoFret],
  );

  // Flush any pending update at the state update rate
  useEffect(() => {
    if (!store.isMicActive) return;
    const interval = setInterval(flushUpdate, STATE_UPDATE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [store.isMicActive, flushUpdate]);

  const { stream } = useAudioStream({
    sampleRate: SAMPLE_RATE,
    channels: 1,
    encoding: 'float32',
    onBuffer: processAudio
  });

  const startListening = useCallback(async () => {
    try {
      const permissionResult = await requestRecordingPermissionsAsync();

      if (!permissionResult.granted) {
        store.setTunerState("permission_denied");
        return;
      }

      store.setMicActive(true);
      store.setTunerState("listening");
      stabilityFilter.reset();
      noSignalCounter.current = 0;
      lastStateUpdate.current = 0;
      lastProcessTime.current = 0;
      lastFrameReceivedAt.current = 0;
      lastPublishedFreq.current = 0;
      pendingUpdate.current = null;

      if (Platform.OS === 'web' || !stream) {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.error("Web Audio API not supported");
          store.setTunerState("error");
          return;
        }

        const streamWeb = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          }
        });
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: SAMPLE_RATE,
        });

        if (ctx.state === 'suspended') {
          await ctx.resume();
        }

        const source = ctx.createMediaStreamSource(streamWeb);
        const processor = ctx.createScriptProcessor(BUFFER_SIZE, 1, 1);
        const gainNode = ctx.createGain();
        gainNode.gain.value = 0;

        processor.onaudioprocess = (e) => {
          const channelData = e.inputBuffer.getChannelData(0);
          processAudio({
            data: channelData.buffer,
            sampleRate: ctx.sampleRate,
            channels: 1
          });
        };

        source.connect(processor);
        processor.connect(gainNode);
        gainNode.connect(ctx.destination);

        audioContextRef.current = ctx;
        mediaStreamRef.current = streamWeb;
        sourceNodeRef.current = source;
        processorNodeRef.current = processor;
      } else {
        await stream.start();
      }
    } catch (error) {
      console.error("Failed to start audio:", error);
      store.setTunerState("error");
    }
  }, [stream]);

  const stopListening = useCallback(() => {
    if (Platform.OS === 'web' || !stream) {
      if (processorNodeRef.current) {
        processorNodeRef.current.disconnect();
        processorNodeRef.current = null;
      }
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
    } else {
      try {
        stream.stop();
      } catch (e) {
        // Already stopped
      }
    }

    store.setMicActive(false);
    store.setTunerState("idle");
    store.clearPitchData();
    stabilityFilter.reset();
    noSignalCounter.current = 0;
    lastProcessTime.current = 0;
    lastFrameReceivedAt.current = 0;
    lastPublishedFreq.current = 0;
    pendingUpdate.current = null;
  }, [stream]);

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  // Haptic & Sound feedback on tuner state transitions
  const prevTunerState = useRef(store.tunerState);
  useEffect(() => {
    if (store.tunerState !== prevTunerState.current) {
      if (store.hapticsEnabled) {
        import('expo-haptics').then(Haptics => {
          if (store.tunerState === 'in_tune') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
          } else if (store.tunerState === 'flat' || store.tunerState === 'sharp') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
          } else if (store.tunerState === 'listening' || store.tunerState === 'signal_detected') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => { });
          }
        });
      }

      if (store.soundEnabled && store.tunerState === 'in_tune') {
        try {
          playReferenceTone(store.targetFrequency || 440, 200);
        } catch (e) {
          // ignore
        }
      }
    }
    prevTunerState.current = store.tunerState;
  }, [store.tunerState, store.hapticsEnabled, store.soundEnabled, store.targetFrequency]);

  return {
    startListening,
    stopListening,
    isListening: store.isMicActive,
  };
};
