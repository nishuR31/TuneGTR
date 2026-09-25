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
 * Operating band: 50 Hz – 1050 Hz (full guitar + harmonics range)
 *
 * Accuracy optimizations:
 * - Pre-allocated yinBuffer to avoid GC pressure on every detection call
 * - threshold=0.15: tight enough to avoid false positives, wide enough for weak signals
 * - silenceThreshold=0.001: barely above noise floor — picks up very soft picks
 * - Relaxed fallback uses threshold+0.08 so weak harmonics still get a result
 * - Parabolic interpolation gives sub-sample frequency accuracy (~0.1Hz precision)
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
    threshold = 0.15,
    minFrequency = 50,
    maxFrequency = 1050,
    silenceThreshold = 0.001,
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
    // Optimized: only compute over a sliding window of bufferSize, not full frame
    for (let tau = tauMin; tau < bufferSize; tau++) {
      let sum = 0;
      const end = Math.min(bufferSize, samples.length - tau);
      for (let i = 0; i < end; i++) {
        const delta = samples[i] - samples[i + tau];
        sum += delta * delta;
      }
      yinBuffer[tau] = sum;
    }

    // Step 2: Cumulative Mean Normalized Difference Function (CMNDF)
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
        while (tau + 1 < bufferSize && yinBuffer[tau + 1] < yinBuffer[tau]) {
          tau++;
        }
        tauEstimate = tau;
        break;
      }
    }

    // Relaxed fallback for weak signals (soft fingerpicks, muted strings)
    if (tauEstimate === -1) {
      const relaxed = this.threshold + 0.08;
      for (let tau = tauMin; tau < bufferSize; tau++) {
        if (yinBuffer[tau] < relaxed) {
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

    // Step 4: Parabolic interpolation — sub-sample precision (~0.1 Hz at guitar freqs)
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

    // Confidence: 1 - CMNDF value at tau estimate. Higher = more confident.
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
 * Stability filter — speeds past noise, locks accurately.
 *
 * Design:
 * - confidenceThreshold=0.30: passes any result YIN is moderately sure about
 *   (YIN already hard-gates at 0.15 in useTuner, this is a secondary soft gate)
 * - historySize=2: lock-on in ≤2 audio frames (~84ms at 48kHz/2048)
 * - emaAlpha=0.65: fast attack (new strings snap in quickly)
 * - maxJumpCents=800: large jump allowed here — new-string reset is handled
 *   upstream in useTuner.ts via lastPublishedFreq tracking, so we don't need
 *   the filter to do double duty
 *
 * Result: the filter adds ~1 frame of stabilization lag (imperceptible)
 * while removing single-sample noise spikes.
 */
export class StabilityFilter {
  private history: number[] = [];
  private smoothedFrequency = 0;
  private readonly historySize: number;
  private readonly emaAlpha: number;
  private readonly maxJumpCents: number;
  private readonly confidenceThreshold: number;

  constructor(
    historySize = 2,
    emaAlpha = 0.65,
    maxJumpCents = 800,
    confidenceThreshold = 0.30,
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

    // Gate on confidence — reject truly garbage readings
    if (confidence < this.confidenceThreshold) {
      return null;
    }

    // Large jump: clear history — but don't discard; let useTuner handle via reset()
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

    // Need at least 1 reading — single sample passes through immediately
    if (this.history.length < 2) {
      this.smoothedFrequency = frequency;
      return { ...result, frequency };
    }

    // Median of short history: kills single outlier spikes
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
