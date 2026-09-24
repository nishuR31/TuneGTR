import { describe, it, expect } from "vitest";
import { YinDetector, StabilityFilter, RingBuffer, calculateRMS } from "../src";

describe("Tuner Core", () => {
  it("calculates RMS correctly", () => {
    const samples = new Float32Array([0, 0.5, -0.5, 0]);
    expect(calculateRMS(samples)).toBeCloseTo(0.35355, 4);
  });

  it("detects frequency of 440 Hz sine wave", () => {
    const sampleRate = 48000;
    const frequency = 440;
    const samples = new Float32Array(4096);
    for (let i = 0; i < samples.length; i++) {
      samples[i] = Math.sin((2 * Math.PI * frequency * i) / sampleRate);
    }

    const detector = new YinDetector();
    const result = detector.detect(samples, sampleRate);

    expect(result).not.toBeNull();
    expect(result!.frequency).toBeCloseTo(440, 0);
    expect(result!.confidence).toBeGreaterThan(0.9);
  });

  it("detects low E2 (82.41 Hz)", () => {
    const sampleRate = 48000;
    const frequency = 82.41;
    const samples = new Float32Array(4096);
    for (let i = 0; i < samples.length; i++) {
      samples[i] = Math.sin((2 * Math.PI * frequency * i) / sampleRate);
    }

    const detector = new YinDetector();
    const result = detector.detect(samples, sampleRate);

    expect(result).not.toBeNull();
    expect(result!.frequency).toBeCloseTo(82.41, 0);
  });

  it("detects high E4 (329.63 Hz)", () => {
    const sampleRate = 48000;
    const frequency = 329.63;
    const samples = new Float32Array(4096);
    for (let i = 0; i < samples.length; i++) {
      samples[i] = Math.sin((2 * Math.PI * frequency * i) / sampleRate);
    }

    const detector = new YinDetector();
    const result = detector.detect(samples, sampleRate);

    expect(result).not.toBeNull();
    expect(result!.frequency).toBeCloseTo(329.63, 0);
  });

  it("returns null for silence", () => {
    const detector = new YinDetector();
    const silent = new Float32Array(4096);
    expect(detector.detect(silent, 48000)).toBeNull();
  });

  it("rejects frequencies outside guitar range", () => {
    const sampleRate = 48000;
    // Generate 30 Hz — below the 55 Hz minimum
    const samples = new Float32Array(4096);
    for (let i = 0; i < samples.length; i++) {
      samples[i] = Math.sin((2 * Math.PI * 30 * i) / sampleRate);
    }
    const detector = new YinDetector(0.15, 55, 500);
    const result = detector.detect(samples, sampleRate);
    // Either null or the detected frequency should be outside [55, 500]
    if (result !== null) {
      expect(result.frequency < 55 || result.frequency > 500).toBe(true);
    }
  });

  it("RingBuffer stores and retrieves data correctly", () => {
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
    it("passes through high-confidence results", () => {
      const filter = new StabilityFilter(3, 0.5);
      const result1 = filter.process({ frequency: 440, confidence: 0.95, rms: 0.1, timestamp: 0 });
      expect(result1).not.toBeNull();
      expect(result1!.frequency).toBeCloseTo(440, 0);
    });

    it("rejects low-confidence results", () => {
      const filter = new StabilityFilter();
      const result = filter.process({ frequency: 440, confidence: 0.5, rms: 0.1, timestamp: 0 });
      expect(result).toBeNull();
    });

    it("smooths consecutive readings", () => {
      const filter = new StabilityFilter(3, 0.5);
      filter.process({ frequency: 440, confidence: 0.95, rms: 0.1, timestamp: 0 });
      filter.process({ frequency: 442, confidence: 0.95, rms: 0.1, timestamp: 1 });
      const result = filter.process({ frequency: 441, confidence: 0.95, rms: 0.1, timestamp: 2 });
      expect(result).not.toBeNull();
      // Should be somewhere near 441, smoothed
      expect(result!.frequency).toBeGreaterThan(439);
      expect(result!.frequency).toBeLessThan(443);
    });
  });
});
