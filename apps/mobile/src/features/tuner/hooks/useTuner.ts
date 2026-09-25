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
 * This is the sweet spot between responsiveness and accuracy.
 */
const BUFFER_SIZE = 2048;
const SAMPLE_RATE = 48000;

/**
 * Throttle interval for visual state updates (ms).
 * We process every audio buffer for accuracy, but only push
 * state updates at this rate to avoid overwhelming React renders.
 */
const STATE_UPDATE_INTERVAL_MS = 50; // 20 FPS visual updates

/**
 * Noise gate threshold (RMS). Signal below this is ignored.
 */
const NOISE_GATE_THRESHOLD = 0.015;

/**
 * Core tuner hook.
 *
 * Performance optimizations:
 * - No isProcessing lock — processes every buffer for accuracy
 * - State updates throttled to 20 FPS to reduce React renders
 * - RMS updated at full speed for responsive waveform visualization
 * - Capo offset applied to target string matching
 * - Web audio: all browser processing disabled for raw signal
 */
export const useTuner = () => {
  const store = useTunerStore();
  
  // Pre-configured YIN detector for sensitivity and accuracy
  // threshold (0.15 for better noise tolerance), minFreq (50Hz), maxFreq (1000Hz to catch higher harmonics)
  const detector = useRef(new YinDetector(0.15, 50, 1000)).current;
  // Stability filter: higher history for smoother values against noise
  const stabilityFilter = useRef(new StabilityFilter(4, 0.3, 150)).current;
  const buffer = useRef(new RingBuffer(BUFFER_SIZE)).current;
  const analysisBuffer = useRef(new Float32Array(BUFFER_SIZE)).current;
  const noSignalCounter = useRef(0);
  
  // Throttle state updates
  const lastStateUpdate = useRef(0);
  const pendingUpdate = useRef<Parameters<typeof store.setPitchData>[0] | null>(null);
  
  // Web Audio Fallback state
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);

  // Flush pending state update
  const flushUpdate = useCallback(() => {
    if (pendingUpdate.current) {
      store.setPitchData(pendingUpdate.current);
      pendingUpdate.current = null;
    }
  }, []);

  // Process incoming audio data
  const processAudio = useCallback(
    (bufferData: { data: ArrayBuffer, sampleRate: number, channels: number }) => {
      if (!store.isMicActive) return;

      try {
        const frames = bufferData.data;
        if (!frames || frames.byteLength === 0) return;

        const samples = new Float32Array(frames);
        buffer.push(samples);
        buffer.get(analysisBuffer);

        // RMS: always update for responsive waveform
        let sum = 0;
        for (let i = 0; i < analysisBuffer.length; i++) {
          sum += analysisBuffer[i] * analysisBuffer[i];
        }
        const currentRms = Math.sqrt(sum / analysisBuffer.length);
        store.setRms(currentRms);

        // Apply noise gate
        if (currentRms < NOISE_GATE_THRESHOLD) {
          noSignalCounter.current++;
          if (noSignalCounter.current > 5) {
            store.clearPitchData();
          }
          return;
        }

        // Pitch detection
        const actualSampleRate = bufferData.sampleRate || SAMPLE_RATE;
        const raw = detector.detect(analysisBuffer, actualSampleRate);

        if (!raw) {
          noSignalCounter.current++;
          if (noSignalCounter.current > 5) {
            store.clearPitchData();
          }
          return;
        }

        // Wait for sufficient probability to avoid random noise jumps
        if (raw.confidence < 0.2) return;

        const stable = stabilityFilter.process(raw);
        if (!stable) return;

        noSignalCounter.current = 0;

        const { frequency, confidence } = stable;
        const referenceA4 = store.referenceA4;
        const capoFret = store.capoFret;
        const tuningStrings = store.activeTuning.stringsLowToHigh;

        // Apply capo offset: shift target MIDI notes up by capoFret semitones
        const adjustedStrings = capoFret > 0
          ? tuningStrings.map(s => ({
              ...s,
              midi: s.midi + capoFret,
              note: getNoteName(s.midi + capoFret),
            }))
          : tuningStrings;

        // If manual string selected, calculate cents against it
        const targetStrings = store.manualStringPosition > 0
          ? adjustedStrings.filter(s => s.position === store.manualStringPosition)
          : adjustedStrings;

        let nearest = findNearestString(
          frequency,
          targetStrings.length > 0 ? targetStrings : adjustedStrings,
          referenceA4,
        );

        // Fallback to auto-detect if we're in manual mode but the frequency is completely wrong (>400 cents)
        // This prevents the "2500 cents" bug when the wrong string/octave is played.
        if (nearest && store.manualStringPosition > 0 && Math.abs(nearest.cents) > 400) {
           nearest = findNearestString(frequency, adjustedStrings, referenceA4);
        }

        if (!nearest) return;

        const cents = getCents(frequency, nearest.targetFrequency);

        // Reject noise/harmonics that are wildly outside the instrument's range
        if (Math.abs(cents) > 400) {
           return;
        }

        const midi = getMidi(frequency, referenceA4);
        const noteName = getPitchClass(midi);
        const octave = Math.floor(midi / 12) - 1;

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

        // Throttle: update React state at most every STATE_UPDATE_INTERVAL_MS
        const now = Date.now();
        if (now - lastStateUpdate.current >= STATE_UPDATE_INTERVAL_MS) {
          store.setPitchData(update);
          lastStateUpdate.current = now;
          pendingUpdate.current = null;
        } else {
          // Store for next flush
          pendingUpdate.current = update;
        }
      } catch (e) {
        console.warn("Pitch processing error:", e);
      }
    },
    [store.isMicActive, store.referenceA4, store.activeTuning, store.manualStringPosition, store.capoFret],
  );

  // Flush any pending update on a timer
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
    pendingUpdate.current = null;
  }, [stream]);

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  // Haptic & Sound feedback when entering 'in_tune'
  const prevTunerState = useRef(store.tunerState);
  useEffect(() => {
    if (store.tunerState === 'in_tune' && prevTunerState.current !== 'in_tune') {
      if (store.hapticsEnabled) {
        import('expo-haptics').then(Haptics => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        });
      }
      
      if (store.soundEnabled) {
        // Play a short beep at the target frequency when tuned perfectly
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
