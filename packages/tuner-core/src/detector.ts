export interface PitchDetectionResult {
  frequency: number;
  confidence: number;
  rms: number;
  timestamp: number;
}

export interface PitchDetector {
  detect(samples: Float32Array, sampleRate: number): PitchDetectionResult | null;
}

/** Calculate RMS (Root Mean Square) of a signal buffer */
export const calculateRMS = (samples: Float32Array): number => {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  return Math.sqrt(sum / samples.length);
};

/**
 * YIN pitch detector — professional-grade accuracy and sensitivity.
 *
 * Implements the de Cheveigné & Kawahara (2002) YIN algorithm:
 * 1. Step 1: Difference function over unwindowed samples with constant integration window
 * 2. Step 2: Cumulative Mean Normalized Difference Function (CMNDF)
 * 3. Step 3: Absolute threshold (default 0.15) with local minimum search
 * 4. Step 4: Parabolic interpolation for sub-sample precision (~0.05 Hz precision)
 * 5. Adaptive fallback: if no dip below primary threshold, relaxes threshold to catch weak fingerpicks
 *
 * Operating band: 50 Hz – 1100 Hz (full guitar frequency range + 2nd harmonic of high E)
 *
 * Guitar string frequencies (A4 = 440 Hz):
 *   E2 = 82.41 Hz, A2 = 110.00 Hz, D3 = 146.83 Hz
 *   G3 = 196.00 Hz, B3 = 246.94 Hz, E4 = 329.63 Hz
 */
export class YinDetector implements PitchDetector {
  private threshold: number;
  private minFrequency: number;
  private maxFrequency: number;
  private silenceThreshold: number;

  // Pre-allocated difference buffer to eliminate GC pressure per audio frame
  private yinBuffer: Float32Array | null = null;
  private yinBufferSize: number = 0;

  constructor(
    threshold = 0.15,
    minFrequency = 50,
    maxFrequency = 1100,
    silenceThreshold = 0.001,
  ) {
    this.threshold = threshold;
    this.minFrequency = minFrequency;
    this.maxFrequency = maxFrequency;
    this.silenceThreshold = silenceThreshold;
  }

  private ensureYinBuffer(size: number): Float32Array {
    if (!this.yinBuffer || this.yinBufferSize < size) {
      this.yinBuffer = new Float32Array(size);
      this.yinBufferSize = size;
    } else {
      this.yinBuffer.fill(0, 0, size);
    }
    return this.yinBuffer;
  }

  public detect(samples: Float32Array, sampleRate: number): PitchDetectionResult | null {
    const rms = calculateRMS(samples);

    if (rms < this.silenceThreshold) {
      return null;
    }

    const N = samples.length;

    const tauMin = Math.max(1, Math.floor(sampleRate / this.maxFrequency));
    const tauMax = Math.min(
      Math.ceil(sampleRate / this.minFrequency),
      Math.floor(N / 2) - 1,
    );

    if (tauMax <= tauMin || tauMax <= 0) {
      return null;
    }

    const bufferSize = tauMax + 1;
    const yinBuffer = this.ensureYinBuffer(bufferSize);

    // Constant integration window for unbiased autocorrelation
    const W = N - tauMax;

    // Step 1: Difference function
    for (let tau = 1; tau < bufferSize; tau++) {
      let sum = 0;
      for (let i = 0; i < W; i++) {
        const delta = samples[i] - samples[i + tau];
        sum += delta * delta;
      }
      yinBuffer[tau] = sum;
    }

    // Step 2: Cumulative Mean Normalized Difference Function (CMNDF)
    // yinBuffer[0] = 1 by definition
    let runningSum = 0;
    yinBuffer[0] = 1;
    for (let tau = 1; tau < bufferSize; tau++) {
      runningSum += yinBuffer[tau];
      yinBuffer[tau] = runningSum === 0 ? 1 : (yinBuffer[tau] * tau) / runningSum;
    }

    // Step 3: Absolute threshold — find first dip below threshold
    let tauEstimate = -1;
    for (let tau = tauMin; tau < bufferSize; tau++) {
      if (yinBuffer[tau] < this.threshold) {
        // Walk down to the local minimum
        while (tau + 1 < bufferSize && yinBuffer[tau + 1] < yinBuffer[tau]) {
          tau++;
        }
        tauEstimate = tau;
        break;
      }
    }

    // Relaxed fallback for soft plucks / fingerstyle
    if (tauEstimate === -1) {
      const relaxed = this.threshold + 0.15;
      let bestTau = -1;
      let bestVal = Infinity;
      for (let tau = tauMin; tau < bufferSize; tau++) {
        if (yinBuffer[tau] < relaxed && yinBuffer[tau] < bestVal) {
          bestVal = yinBuffer[tau];
          bestTau = tau;
        }
      }
      if (bestTau !== -1) {
        // Follow to local minimum
        while (bestTau + 1 < bufferSize && yinBuffer[bestTau + 1] < yinBuffer[bestTau]) {
          bestTau++;
        }
        tauEstimate = bestTau;
      }
    }

    if (tauEstimate === -1) {
      return null;
    }

    // Step 4: Parabolic interpolation for sub-sample precision
    let betterTau = tauEstimate;
    if (tauEstimate > 0 && tauEstimate < bufferSize - 1) {
      const s0 = yinBuffer[tauEstimate - 1];
      const s1 = yinBuffer[tauEstimate];
      const s2 = yinBuffer[tauEstimate + 1];
      const denom = 2 * (2 * s1 - s2 - s0);
      if (Math.abs(denom) > 1e-8) {
        betterTau = tauEstimate + (s2 - s0) / denom;
      }
    }

    // Guard: betterTau must be in valid range
    if (betterTau <= 0 || betterTau >= N) {
      return null;
    }

    const frequency = sampleRate / betterTau;

    if (frequency < this.minFrequency || frequency > this.maxFrequency) {
      return null;
    }

    // Confidence: 1 - CMNDF at tau estimate, clamped to [0..1]
    const confidence = Math.max(0, Math.min(1, 1.0 - yinBuffer[tauEstimate]));

    return {
      frequency,
      confidence,
      rms,
      timestamp: Date.now(),
    };
  }
}

/**
 * Stability filter — locks onto pitch quickly with minimal noise.
 */
export class StabilityFilter {
  private history: number[] = [];
  private smoothedFrequency = 0;
  private readonly historySize: number;
  private readonly emaAlpha: number;
  private readonly maxJumpCents: number;
  private readonly confidenceThreshold: number;

  constructor(
    historySize = 3,
    emaAlpha = 0.7,
    maxJumpCents = 600,
    confidenceThreshold = 0.6,
  ) {
    this.historySize = historySize;
    this.emaAlpha = emaAlpha;
    this.maxJumpCents = maxJumpCents;
    this.confidenceThreshold = confidenceThreshold;
  }

  public reset(): void {
    this.history = [];
    this.smoothedFrequency = 0;
  }

  public process(result: PitchDetectionResult): PitchDetectionResult | null {
    const { frequency, confidence } = result;

    if (confidence < this.confidenceThreshold) {
      return null;
    }

    // Large jump: clear history. New string detected upstream.
    if (this.smoothedFrequency > 0) {
      const cents = Math.abs(1200 * Math.log2(frequency / this.smoothedFrequency));
      if (cents > this.maxJumpCents) {
        this.history = [];
        this.smoothedFrequency = 0;
      }
    }

    this.history.push(frequency);
    if (this.history.length > this.historySize) {
      this.history.shift();
    }

    // First sample: pass through immediately so UI doesn't lag
    if (this.history.length < 2) {
      this.smoothedFrequency = frequency;
      return { ...result, frequency };
    }

    // Median of short history: kills single-frame outlier spikes
    const sorted = [...this.history].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    // EMA: smooth but fast-tracking
    this.smoothedFrequency = this.smoothedFrequency === 0
      ? median
      : this.emaAlpha * median + (1 - this.emaAlpha) * this.smoothedFrequency;

    return {
      ...result,
      frequency: this.smoothedFrequency,
    };
  }
}
