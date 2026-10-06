import { describe, it, expect } from "vitest";
import {
  YinDetector,
  StabilityFilter,
  RingBuffer,
  calculateRMS,
} from "../src";

function sine(
  frequency: number,
  sampleRate = 48000,
  length = 4096,
  amplitude = 0.6,
): Float32Array {
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    samples[i] =
      amplitude *
      Math.sin((2 * Math.PI * frequency * i) / sampleRate);
  }
  return samples;
}

function guitarTone(
  fundamental: number,
  sampleRate = 48000,
): Float32Array {
  const samples = new Float32Array(4096);

  for (let i = 0; i < samples.length; i++) {
    const t = i / sampleRate;
    const attack = Math.min(1, i / 400);
    const decay = Math.exp(-t * 1.1);

    samples[i] =
      attack *
      decay *
      (
        0.55 * Math.sin(2 * Math.PI * fundamental * t) +
        0.25 * Math.sin(2 * Math.PI * fundamental * 2 * t) +
        0.12 * Math.sin(2 * Math.PI * fundamental * 3 * t)
      );
  }

  return samples;
}

describe("Tuner Core", () => {
  it("calculates AC RMS correctly", () => {
    const samples = new Float32Array([1, 1.5, 0.5, 1]);
    // Centered values: 0, +0.5, -0.5, 0.
    expect(calculateRMS(samples)).toBeCloseTo(0.35355, 4);
  });

  it("does not let a DC offset create false signal energy", () => {
    const samples = new Float32Array(4096);
    samples.fill(0.1);
    expect(calculateRMS(samples)).toBeCloseTo(0, 6);
  });

  it("detects the six standard open strings", () => {
    const detector = new YinDetector();

    const strings = [
      82.406889,
      110,
      146.832384,
      195.997718,
      246.941651,
      329.627557,
    ];

    for (const frequency of strings) {
      const result = detector.detect(
        guitarTone(frequency),
        48000,
      );

      expect(result).not.toBeNull();
      expect(
        Math.abs(result!.frequency - frequency),
      ).toBeLessThan(0.5);
      expect(result!.confidence).toBeGreaterThan(0.65);
    }
  });

  it("uses configured guitar targets to reject octave/subharmonic mistakes", () => {
    const detector = new YinDetector();
    const targets = [82.406889, 110, 146.832384, 195.997718, 246.941651, 329.627557];
    for (const frequency of targets) {
      const result = detector.detect(guitarTone(frequency), 48000, targets);
      expect(result).not.toBeNull();
      expect(Math.abs(result!.frequency - frequency)).toBeLessThan(0.8);
    }
  });

  it("detects a clean 440 Hz tone", () => {
    const result = new YinDetector().detect(
      sine(440),
      48000,
    );

    expect(result).not.toBeNull();
    expect(result!.frequency).toBeCloseTo(440, 0);
    expect(result!.confidence).toBeGreaterThan(0.9);
  });

  it("handles a non-48k sample rate", () => {
    const result = new YinDetector().detect(
      sine(110, 44100, 4096),
      44100,
    );

    expect(result).not.toBeNull();
    expect(result!.frequency).toBeCloseTo(110, 0);
  });

  it("rejects silence", () => {
    expect(
      new YinDetector().detect(
        new Float32Array(4096),
        48000,
      ),
    ).toBeNull();
  });

  it("does not manufacture a pitch from a low-frequency signal outside range", () => {
    const result = new YinDetector(0.12, 55, 700).detect(
      sine(30),
      48000,
    );

    expect(result).toBeNull();
  });

  it("RingBuffer stores and retrieves the newest samples", () => {
    const buf = new RingBuffer(4);
    buf.push(new Float32Array([1, 2]));

    const out = new Float32Array(4);
    buf.get(out);
    expect(Array.from(out)).toEqual([0, 0, 1, 2]);

    buf.push(new Float32Array([3, 4, 5]));
    buf.get(out);
    expect(Array.from(out)).toEqual([2, 3, 4, 5]);
  });

  describe("StabilityFilter", () => {
    it("rejects low-confidence detections", () => {
      const filter = new StabilityFilter();
      expect(
        filter.process({
          frequency: 440,
          confidence: 0.2,
          rms: 0.1,
          timestamp: 0,
        }),
      ).toBeNull();
    });

    it("smooths consecutive readings without changing their sign", () => {
      const filter = new StabilityFilter(3, 0.5);

      filter.process({
        frequency: 440,
        confidence: 0.95,
        rms: 0.1,
        timestamp: 0,
      });

      filter.process({
        frequency: 442,
        confidence: 0.95,
        rms: 0.1,
        timestamp: 1,
      });

      const result = filter.process({
        frequency: 441,
        confidence: 0.95,
        rms: 0.1,
        timestamp: 2,
      });

      expect(result).not.toBeNull();
      expect(result!.frequency).toBeGreaterThan(439);
      expect(result!.frequency).toBeLessThan(443);
    });
  });
});
