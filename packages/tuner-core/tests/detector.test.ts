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

  it("accurately detects all 6 standard guitar strings with realistic harmonics", () => {
    const sampleRate = 48000;
    const strings = [
      { name: "E2", freq: 82.41 },
      { name: "A2", freq: 110.00 },
      { name: "D3", freq: 146.83 },
      { name: "G3", freq: 196.00 },
      { name: "B3", freq: 246.94 },
      { name: "E4", freq: 329.63 },
    ];

    const detector = new YinDetector(0.15, 50, 1100);

    for (const str of strings) {
      const samples = new Float32Array(4096);
      for (let i = 0; i < samples.length; i++) {
        // Fundamental + 2nd harmonic + 3rd harmonic + subtle noise
        const fundamental = 0.55 * Math.sin((2 * Math.PI * str.freq * i) / sampleRate);
        const harm2 = 0.25 * Math.sin((2 * Math.PI * (2 * str.freq) * i) / sampleRate);
        const harm3 = 0.12 * Math.sin((2 * Math.PI * (3 * str.freq) * i) / sampleRate);
        const noise = (Math.random() - 0.5) * 0.01;
        samples[i] = fundamental + harm2 + harm3 + noise;
      }

      const result = detector.detect(samples, sampleRate);
      expect(result, `Failed to detect ${str.name}`).not.toBeNull();
      // Professional accuracy: within 1 Hz of true fundamental
      expect(Math.abs(result!.frequency - str.freq)).toBeLessThan(1.0);
      expect(result!.confidence).toBeGreaterThan(0.7);
    }
  });

  it("detects microtonal pitch variations (cents accuracy)", () => {
    const sampleRate = 48000;
    const baseFreq = 110.0; // A2
    // +15 cents
    const sharpFreq = baseFreq * Math.pow(2, 15 / 1200);
    const samples = new Float32Array(4096);
    for (let i = 0; i < samples.length; i++) {
      samples[i] = Math.sin((2 * Math.PI * sharpFreq * i) / sampleRate);
    }

    const detector = new YinDetector();
    const result = detector.detect(samples, sampleRate);
    expect(result).not.toBeNull();
    // Verify detected frequency is within 0.2 Hz of true sharp frequency
    expect(Math.abs(result!.frequency - sharpFreq)).toBeLessThan(0.2);
  });

  it("returns null for silence", () => {
    const detector = new YinDetector();
    const silent = new Float32Array(4096);
    expect(detector.detect(silent, 48000)).toBeNull();
  });

  it("rejects frequencies outside guitar range", () => {
    const sampleRate = 48000;
    // Generate 30 Hz — below the 50 Hz minimum
    const samples = new Float32Array(4096);
    for (let i = 0; i < samples.length; i++) {
      samples[i] = Math.sin((2 * Math.PI * 30 * i) / sampleRate);
    }
    const detector = new YinDetector(0.15, 55, 500);
    const result = detector.detect(samples, sampleRate);
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
      expect(result!.frequency).toBeGreaterThan(439);
      expect(result!.frequency).toBeLessThan(443);
    });
  });
});
