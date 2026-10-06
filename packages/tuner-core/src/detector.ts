export interface PitchDetectionResult {
  frequency: number;
  confidence: number;
  rms: number;
  timestamp: number;
}

export interface PitchDetector {
  detect(
    samples: Float32Array,
    sampleRate: number,
    targetFrequencies?: number[],
  ): PitchDetectionResult | null;
}

export const calculateRMS = (samples: Float32Array): number => {
  if (samples.length === 0) return 0;
  let mean = 0;
  for (let i = 0; i < samples.length; i++) mean += samples[i];
  mean /= samples.length;

  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    const x = samples[i] - mean;
    sum += x * x;
  }
  return Math.sqrt(sum / samples.length);
};

/**
 * Guitar-focused YIN detector.
 *
 * The important distinction from a generic chromatic tuner is that the app
 * knows the six configured open-string targets. We use those targets only to
 * disambiguate octave/harmonic candidates; the measured detuning is preserved.
 *
 * Example: if an E2 string produces a strong 3rd harmonic around 247 Hz,
 * 247 / 3 -> ~82.3 Hz. The cents error is preserved rather than snapped to
 * the nominal E2 target. A genuine B3 around 247 Hz remains B3 because its
 * direct candidate is already a configured target.
 */
export class YinDetector implements PitchDetector {
  private threshold: number;
  private minFrequency: number;
  private maxFrequency: number;
  private silenceThreshold: number;
  private yinBuffer: Float32Array | null = null;
  private yinBufferSize = 0;
  private centeredBuffer: Float32Array | null = null;

  constructor(
    threshold = 0.12,
    minFrequency = 55,
    maxFrequency = 700,
    silenceThreshold = 0.0015,
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
    }
    return this.yinBuffer;
  }

  private ensureCenteredBuffer(size: number): Float32Array {
    if (!this.centeredBuffer || this.centeredBuffer.length !== size) {
      this.centeredBuffer = new Float32Array(size);
    }
    return this.centeredBuffer;
  }

  private cents(a: number, b: number): number {
    return 1200 * Math.log2(a / b);
  }

  private refineTau(yin: Float32Array, tau: number): number {
    if (tau <= 0 || tau >= yin.length - 1) return tau;
    const s0 = yin[tau - 1];
    const s1 = yin[tau];
    const s2 = yin[tau + 1];
    const denominator = 2 * (2 * s1 - s2 - s0);
    if (Math.abs(denominator) < 1e-8) return tau;
    const refined = tau + (s2 - s0) / denominator;
    return Number.isFinite(refined) && refined > 0 ? refined : tau;
  }

  private harmonicEnergy(
    samples: Float32Array,
    fundamental: number,
    sampleRate: number,
  ): number {
    if (fundamental <= 0 || fundamental >= sampleRate / 2) return 0;

    // A small Goertzel bank around the fundamental and first three harmonics.
    // We normalize by N so the score is comparable across buffers/devices.
    let total = 0;
    let weight = 0;
    const harmonics = [1, 2, 3, 4];
    const weights = [1.0, 0.55, 0.35, 0.2];

    for (let h = 0; h < harmonics.length; h++) {
      const frequency = fundamental * harmonics[h];
      if (frequency <= 0 || frequency >= sampleRate / 2) continue;
      const omega = (2 * Math.PI * frequency) / sampleRate;
      const coefficient = 2 * Math.cos(omega);
      let s0 = 0;
      let s1 = 0;
      let s2 = 0;
      for (let i = 0; i < samples.length; i++) {
        s0 = samples[i] + coefficient * s1 - s2;
        s2 = s1;
        s1 = s0;
      }
      const power = Math.max(0, s1 * s1 + s2 * s2 - coefficient * s1 * s2);
      const magnitude = Math.sqrt(power) / Math.max(1, samples.length);
      total += magnitude * weights[h];
      weight += weights[h];
    }

    return weight > 0 ? total / weight : 0;
  }

  private goertzelMagnitude(
    samples: Float32Array,
    frequency: number,
    sampleRate: number,
  ): number {
    if (frequency <= 0 || frequency >= sampleRate / 2) return 0;
    const omega = (2 * Math.PI * frequency) / sampleRate;
    const coefficient = 2 * Math.cos(omega);
    let s0 = 0;
    let s1 = 0;
    let s2 = 0;
    for (let i = 0; i < samples.length; i++) {
      s0 = samples[i] + coefficient * s1 - s2;
      s2 = s1;
      s1 = s0;
    }
    const power = Math.max(0, s1 * s1 + s2 * s2 - coefficient * s1 * s2);
    return Math.sqrt(power) / Math.max(1, samples.length);
  }

  public detect(
    samples: Float32Array,
    sampleRate: number,
    targetFrequencies: number[] = [],
  ): PitchDetectionResult | null {
    if (!Number.isFinite(sampleRate) || sampleRate <= 0 || samples.length < 1024) {
      return null;
    }

    const centered = this.ensureCenteredBuffer(samples.length);
    let mean = 0;
    for (let i = 0; i < samples.length; i++) mean += samples[i];
    mean /= samples.length;

    let rmsSum = 0;
    for (let i = 0; i < samples.length; i++) {
      const x = samples[i] - mean;
      centered[i] = x;
      rmsSum += x * x;
    }
    const rms = Math.sqrt(rmsSum / samples.length);
    if (rms < this.silenceThreshold) return null;

    const N = samples.length;
    const tauMin = Math.max(2, Math.floor(sampleRate / this.maxFrequency));
    const tauMax = Math.min(
      Math.ceil(sampleRate / this.minFrequency),
      Math.floor(N / 2) - 1,
    );
    if (tauMax <= tauMin) return null;

    const yinBuffer = this.ensureYinBuffer(tauMax + 1);
    const W = N - tauMax;
    let runningSum = 0;
    yinBuffer[0] = 1;

    for (let tau = 1; tau <= tauMax; tau++) {
      let difference = 0;
      for (let i = 0; i < W; i++) {
        const delta = centered[i] - centered[i + tau];
        difference += delta * delta;
      }
      runningSum += difference;
      yinBuffer[tau] = runningSum > 0
        ? (difference * tau) / runningSum
        : 1;
    }

    // Collect several credible local minima. Looking at multiple candidates is
    // what lets the guitar path reject a harmonic when the fundamental valley
    // is weaker than the harmonic valley.
    const candidates: { frequency: number; value: number; tau: number }[] = [];
    const threshold = Math.min(0.30, Math.max(this.threshold, 0.08));

    for (let tau = tauMin + 1; tau < tauMax - 1; tau++) {
      const v = yinBuffer[tau];
      if (v > threshold) continue;
      if (v <= yinBuffer[tau - 1] && v <= yinBuffer[tau + 1]) {
        const refinedTau = this.refineTau(yinBuffer, tau);
        const frequency = sampleRate / refinedTau;
        if (frequency >= this.minFrequency && frequency <= this.maxFrequency) {
          candidates.push({ frequency, value: v, tau });
        }
      }
    }

    /*
     * YIN's first credible local minimum is generally more musically stable
     * for a guitar string than an unrestricted global minimum. A global minimum
     * can occur at 2T/3T/4T and cause octave/subharmonic jumps.
     */
    if (candidates.length === 0) {
      return null;
    }

    candidates.sort((a, b) => {
      if (a.value !== b.value) return a.value - b.value;
      return a.frequency - b.frequency;
    });

    let selected = candidates[0];

    if (targetFrequencies.length > 0) {
      /*
       * Guitar auto-detection rule:
       *
       * 1. Keep the strongest YIN candidate as the measured pitch.
       * 2. Never select a configured string merely because its target frequency
       *    has a local YIN valley.
       * 3. Only perform harmonic recovery when the measured candidate is clearly
       *    a 2x/3x/4x harmonic of a configured guitar string.
       *
       * This prevents a real B3 from being turned into E2 and, more importantly,
       * prevents weak harmonic valleys from forcing the detector onto D3/G3/etc.
       */

      let bestRecovery: typeof selected | null = null;
      let bestRecoveryScore = Infinity;

      for (const target of targetFrequencies) {
        for (let harmonic = 2; harmonic <= 4; harmonic++) {
          const expectedHarmonic = target * harmonic;

          for (const candidate of candidates) {
            const harmonicDistance = Math.abs(
              this.cents(candidate.frequency, expectedHarmonic),
            );

            if (harmonicDistance > 55) continue;

            const recoveredFrequency = candidate.frequency / harmonic;
            const recoveredCents = Math.abs(
              this.cents(recoveredFrequency, target),
            );

            if (recoveredCents > 55) continue;

            const fundamentalMagnitude = this.goertzelMagnitude(
              samples,
              target * Math.pow(2, this.cents(recoveredFrequency, target) / 1200),
              sampleRate,
            );

            const harmonicMagnitude = this.goertzelMagnitude(
              samples,
              candidate.frequency,
              sampleRate,
            );

            /*
             * Only recover when the fundamental has real measurable support.
             * This is the critical protection against interpreting a genuine
             * higher string (for example B3) as the harmonic of low E.
             */
            if (
              fundamentalMagnitude <= 0 ||
              harmonicMagnitude <= 0 ||
              fundamentalMagnitude < harmonicMagnitude * 0.025
            ) {
              continue;
            }

            const score =
              harmonicDistance +
              recoveredCents * 0.5 +
              (harmonic - 2) * 8;

            if (score < bestRecoveryScore) {
              bestRecoveryScore = score;
              bestRecovery = {
                ...candidate,
                frequency: recoveredFrequency,
              };
            }
          }
        }
      }

      /*
       * Never replace a strong direct YIN candidate merely because a configured
       * string happens to have a harmonic relationship with it.
       *
       * Harmonic recovery is only used when the recovered fundamental has
       * sufficient spectral support.
       */
      if (bestRecovery) {
        const directMagnitude = this.goertzelMagnitude(
          samples,
          selected.frequency,
          sampleRate,
        );

        const recoveredMagnitude = this.goertzelMagnitude(
          samples,
          bestRecovery.frequency,
          sampleRate,
        );

        if (
          recoveredMagnitude >= directMagnitude * 0.025
        ) {
          selected = bestRecovery;
        }
      }
    }

    const frequency = selected.frequency;
    if (!Number.isFinite(frequency) || frequency < this.minFrequency || frequency > this.maxFrequency) {
      return null;
    }

    const confidence = Math.max(0, Math.min(1, 1 - selected.value));
    if (confidence < 0.25) return null;

    return {
      frequency,
      confidence,
      rms,
      timestamp: Date.now(),
    };
  }
}

export class StabilityFilter {
  private history: number[] = [];
  private smoothedFrequency = 0;

  private readonly historySize: number;
  private readonly emaAlpha: number;
  private readonly maxJumpCents: number;
  private readonly confidenceThreshold: number;

  constructor(
    historySize = 3,
    emaAlpha = 0.45,
    maxJumpCents = 300,
    confidenceThreshold = 0.35,
  ) {
    this.historySize = Math.max(1, historySize);
    this.emaAlpha = Math.max(0.01, Math.min(1, emaAlpha));
    this.maxJumpCents = Math.max(1, maxJumpCents);
    this.confidenceThreshold = Math.max(0, Math.min(1, confidenceThreshold));
  }

  public reset(): void {
    this.history = [];
    this.smoothedFrequency = 0;
  }

  public process(result: PitchDetectionResult): PitchDetectionResult | null {
    if (
      !Number.isFinite(result.frequency) ||
      result.frequency <= 0 ||
      !Number.isFinite(result.confidence) ||
      result.confidence < this.confidenceThreshold
    ) return null;

    if (this.smoothedFrequency > 0) {
      const jumpCents = Math.abs(
        1200 * Math.log2(result.frequency / this.smoothedFrequency),
      );
      if (jumpCents > this.maxJumpCents) {
        this.history = [];
        this.smoothedFrequency = 0;
      }
    }

    this.history.push(result.frequency);
    if (this.history.length > this.historySize) this.history.shift();

    const sorted = [...this.history].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    this.smoothedFrequency = this.smoothedFrequency === 0
      ? median
      : this.emaAlpha * median + (1 - this.emaAlpha) * this.smoothedFrequency;

    return { ...result, frequency: this.smoothedFrequency };
  }
}
