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
 * YIN pitch detector with parabolic interpolation.
 * Operating band: 50 Hz – 520 Hz (extended guitar range)
 *
 * Performance optimizations:
 * - Pre-allocated yinBuffer to avoid GC pressure on every detection call
 * - Lowered silence/YIN thresholds for better sensitivity
 * - Relaxed fallback pass for weak but valid signals
 */
export class YinDetector implements PitchDetector {
  private threshold: number;
  private minFrequency: number;
  private maxFrequency: number;
  private silenceThreshold: number;
  
  // Pre-allocated buffer — avoids creating new Float32Array per detection call
  private yinBuffer: Float32Array | null = null;
  private yinBufferSize: number = 0;

  constructor(
    threshold = 0.10,
    minFrequency = 50,
    maxFrequency = 520,
    silenceThreshold = 0.005,
  ) {
    this.threshold = threshold;
    this.minFrequency = minFrequency;
    this.maxFrequency = maxFrequency;
    this.silenceThreshold = silenceThreshold;
  }

  /**
   * Ensure the yinBuffer is allocated to the right size.
   * Only reallocates if the size changes (typically never after first call).
   */
  private ensureBuffer(size: number): Float32Array {
    if (!this.yinBuffer || this.yinBufferSize < size) {
      this.yinBuffer = new Float32Array(size);
      this.yinBufferSize = size;
    } else {
      // Zero out only the portion we'll use
      this.yinBuffer.fill(0, 0, size);
    }
    return this.yinBuffer;
  }

  public detect(samples: Float32Array, sampleRate: number): PitchDetectionResult | null {
    const rms = calculateRMS(samples);

    if (rms < this.silenceThreshold) {
      return null;
    }

    const tauMin = Math.floor(sampleRate / this.maxFrequency);
    const tauMax = Math.min(
      Math.ceil(sampleRate / this.minFrequency),
      Math.floor(samples.length / 2),
    );

    if (tauMax <= tauMin || tauMax >= samples.length / 2) {
      return null;
    }

    const bufferSize = tauMax + 1;
    const yinBuffer = this.ensureBuffer(bufferSize);

    // Step 1: Difference function
    for (let tau = tauMin; tau < bufferSize; tau++) {
      let sum = 0;
      for (let i = 0; i < bufferSize; i++) {
        if (i + tau < samples.length) {
          const delta = samples[i] - samples[i + tau];
          sum += delta * delta;
        }
      }
      yinBuffer[tau] = sum;
    }

    // Step 2: CMNDF
    let runningSum = 0;
    yinBuffer[0] = 1;
    for (let tau = 1; tau < bufferSize; tau++) {
      runningSum += yinBuffer[tau];
      if (runningSum === 0) {
        yinBuffer[tau] = 1;
      } else {
        yinBuffer[tau] = (yinBuffer[tau] * tau) / runningSum;
      }
    }

    // Step 3: Absolute threshold — find first dip
    let tauEstimate = -1;
    for (let tau = tauMin; tau < bufferSize; tau++) {
      if (yinBuffer[tau] < this.threshold) {
        while (tau + 1 < bufferSize && yinBuffer[tau + 1] < yinBuffer[tau]) {
          tau++;
        }
        tauEstimate = tau;
        break;
      }
    }

    // Relaxed fallback for weak signals
    if (tauEstimate === -1) {
      const relaxedThreshold = this.threshold + 0.10;
      for (let tau = tauMin; tau < bufferSize; tau++) {
        if (yinBuffer[tau] < relaxedThreshold) {
          while (tau + 1 < bufferSize && yinBuffer[tau + 1] < yinBuffer[tau]) {
            tau++;
          }
          tauEstimate = tau;
          break;
        }
      }
    }

    if (tauEstimate === -1) {
      return null;
    }

    // Step 4: Parabolic interpolation
    let betterTau = tauEstimate;
    if (tauEstimate > 0 && tauEstimate < bufferSize - 1) {
      const s0 = yinBuffer[tauEstimate - 1];
      const s1 = yinBuffer[tauEstimate];
      const s2 = yinBuffer[tauEstimate + 1];
      const denom = 2 * (2 * s1 - s2 - s0);
      if (denom !== 0) {
        betterTau += (s2 - s0) / denom;
      }
    }

    const frequency = sampleRate / betterTau;

    if (frequency < this.minFrequency || frequency > this.maxFrequency) {
      return null;
    }

    const confidence = 1.0 - yinBuffer[tauEstimate];

    return {
      frequency,
      confidence: Math.max(0, Math.min(1, confidence)),
      rms,
      timestamp: Date.now(),
    };
  }
}

/**
 * Stability filter — smooths pitch results with median + EMA.
 *
 * Performance: reduced history size and lowered confidence gate
 * for faster lock-on and fewer dropped detections.
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
    emaAlpha = 0.40,
    maxJumpCents = 150,
    confidenceThreshold = 0.65,
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

    if (this.history.length < 2) {
      this.smoothedFrequency = frequency;
      return { ...result, frequency };
    }

    const sorted = [...this.history].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    if (this.smoothedFrequency === 0) {
      this.smoothedFrequency = median;
    } else {
      this.smoothedFrequency =
        this.emaAlpha * median + (1 - this.emaAlpha) * this.smoothedFrequency;
    }

    return {
      ...result,
      frequency: this.smoothedFrequency,
    };
  }
}
