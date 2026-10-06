/**
 * Guitar String Tension & Physical Mechanics Engine.
 *
 * Implements the wave-speed formula for strings:
 *   T = (2 * L * f)^2 * μ
 *
 * Where:
 *   T = Tension force in Newtons (N)
 *   L = Vibrating scale length in meters (m) (standard electric/acoustic scale = 0.648 m / 25.5 inches)
 *   f = Frequency of the tuned note in Hertz (Hz)
 *   μ = Linear mass density in kilograms per meter (kg/m)
 *
 * And imperial conversion:
 *   T (lbs) = T (N) / (9.80665 * 0.45359237) = T (N) / 4.4482216152605
 *   T (lbs) = (UW * (2 * L_inches * f)^2) / 386.4
 *   Where UW is unit weight in lbs/inch, and 386.4 is gravitational acceleration (in/s^2).
 */

// ─── Physical Constants ──────────────────────────────────────────────────────

/** Standard electric / acoustic vibrating scale length in meters (25.5 inches) */
export const STANDARD_SCALE_LENGTH_METERS = 0.6477; // ~0.648 m

/** Standard electric / acoustic scale length in inches */
export const STANDARD_SCALE_LENGTH_INCHES = 25.5;

/** Standard gravitational acceleration in m/s^2 */
export const GRAVITATIONAL_ACCELERATION_MPS2 = 9.80665;

/** Gravitational acceleration in in/s^2 (used in music industry imperial calculations) */
export const GRAVITATIONAL_ACCELERATION_INPS2 = 386.4;

/** Exact conversion factor: Newtons per pound-force */
export const NEWTONS_PER_POUND_FORCE = 4.4482216152605;

/** Exact conversion factor: Pounds-force per Newton */
export const POUNDS_FORCE_PER_NEWTON = 1 / NEWTONS_PER_POUND_FORCE;

// ─── Wave-Speed Tension Formulas ─────────────────────────────────────────────

/**
 * Calculates string tension in Newtons using SI wave-speed formula:
 *   T = (2 * L * f)^2 * μ
 *
 * @param scaleLengthMeters Vibrating scale length (m), default 0.6477m (25.5 in)
 * @param frequencyHz Frequency in Hz
 * @param linearMassDensityKgPerMeter Mass per unit length in kg/m
 */
export const calculateStringTensionNewtons = (
  scaleLengthMeters: number,
  frequencyHz: number,
  linearMassDensityKgPerMeter: number,
): number => {
  if (
    !Number.isFinite(scaleLengthMeters) || scaleLengthMeters <= 0 ||
    !Number.isFinite(frequencyHz) || frequencyHz <= 0 ||
    !Number.isFinite(linearMassDensityKgPerMeter) || linearMassDensityKgPerMeter <= 0
  ) {
    return 0;
  }
  const speedFactor = 2 * scaleLengthMeters * frequencyHz;
  return speedFactor * speedFactor * linearMassDensityKgPerMeter;
};

/**
 * Converts Newtons to pounds-force (lbs) — the standard unit in the music industry.
 */
export const newtonsToPoundsForce = (newtons: number): number => {
  if (!Number.isFinite(newtons) || newtons <= 0) return 0;
  return newtons / NEWTONS_PER_POUND_FORCE;
};

/**
 * Converts pounds-force (lbs) to Newtons (N).
 */
export const poundsForceToNewtons = (lbs: number): number => {
  if (!Number.isFinite(lbs) || lbs <= 0) return 0;
  return lbs * NEWTONS_PER_POUND_FORCE;
};

/**
 * Imperial string tension formula used in string tension tables:
 *   T (lbs) = (UW * (2 * L * f)^2) / 386.4
 *
 * @param scaleLengthInches Vibrating scale length in inches (e.g. 25.5)
 * @param frequencyHz Frequency in Hz
 * @param unitWeightLbsPerInch Unit weight in lbs per inch
 */
export const calculateStringTensionLbs = (
  scaleLengthInches: number,
  frequencyHz: number,
  unitWeightLbsPerInch: number,
): number => {
  if (
    !Number.isFinite(scaleLengthInches) || scaleLengthInches <= 0 ||
    !Number.isFinite(frequencyHz) || frequencyHz <= 0 ||
    !Number.isFinite(unitWeightLbsPerInch) || unitWeightLbsPerInch <= 0
  ) {
    return 0;
  }
  const speedFactor = 2 * scaleLengthInches * frequencyHz;
  return (unitWeightLbsPerInch * speedFactor * speedFactor) / GRAVITATIONAL_ACCELERATION_INPS2;
};

/**
 * Calculates current string tension given a nominal target tension and detected frequency.
 * Since tension is strictly proportional to frequency squared (T ∝ f^2):
 *   T_current = T_target * (f_detected / f_target)^2
 */
export const calculateDynamicStringTension = (
  detectedFrequency: number,
  targetFrequency: number,
  targetTensionLbs: number,
): number => {
  if (
    !Number.isFinite(detectedFrequency) || detectedFrequency <= 0 ||
    !Number.isFinite(targetFrequency) || targetFrequency <= 0 ||
    !Number.isFinite(targetTensionLbs) || targetTensionLbs <= 0
  ) {
    return 0;
  }
  const ratio = detectedFrequency / targetFrequency;
  return targetTensionLbs * ratio * ratio;
};

// ─── Ratio Checks & Multipliers (Diagnostic Benchmarks) ──────────────────────

/**
 * Multiplier for string tension when changing tuning pitch by semitones (string unchanged).
 *   Multiplier = 2 ^ (2 * semitones / 12)
 *
 * Benchmark check ratios:
 *   - Down 1 semitone:  2^(-2/12) ≈ 0.891 (10.9% less pull)
 *   - Down 2 semitones: 2^(-4/12) ≈ 0.794 (20.6% less pull)
 *   - Up 1 octave (+12 semitones): 2^2 = 4.000 (4 times the pull)
 */
export const getSemitoneTensionMultiplier = (semitones: number): number => {
  if (!Number.isFinite(semitones)) return 1;
  return Math.pow(2, (2 * semitones) / 12);
};

/**
 * Multiplier for string tension when changing vibrating scale length (pitch unchanged).
 *   Multiplier = (newScale / baseScale) ^ 2
 *
 * Benchmark check ratio:
 *   - 25.5 in to 27 in: (27 / 25.5)^2 ≈ 1.121 (12.1% more pull)
 */
export const getScaleLengthTensionMultiplier = (
  newScaleInches: number,
  baseScaleInches: number = STANDARD_SCALE_LENGTH_INCHES,
): number => {
  if (
    !Number.isFinite(newScaleInches) || newScaleInches <= 0 ||
    !Number.isFinite(baseScaleInches) || baseScaleInches <= 0
  ) {
    return 1;
  }
  const ratio = newScaleInches / baseScaleInches;
  return ratio * ratio;
};

// ─── Ploutone Calibrated Benchmark Dataset ───────────────────────────────────

export interface PloutoneDataPoint {
  gauge: number; // inches, e.g. 0.0100
  pitch: string; // e.g. "E4"
  tensionLbs: number; // e.g. 16.2
}

/**
 * Calibrated string tension benchmark values measured at standard 25.5" scale length.
 * Source: Ploutone Hone Your Tone Guitar String Tension Guide.
 */
export const PLOUTONE_BENCHMARK_TABLE: readonly PloutoneDataPoint[] = [
  // 1st String (High E4)
  { gauge: 0.0080, pitch: "E4", tensionLbs: 10.4 },
  { gauge: 0.0085, pitch: "E4", tensionLbs: 11.7 },
  { gauge: 0.0090, pitch: "E4", tensionLbs: 13.1 },
  { gauge: 0.0095, pitch: "E4", tensionLbs: 14.6 },
  { gauge: 0.0100, pitch: "E4", tensionLbs: 16.2 },
  { gauge: 0.0105, pitch: "E4", tensionLbs: 17.9 },

  // 2nd String (B3)
  { gauge: 0.0110, pitch: "B3", tensionLbs: 19.5 },
  { gauge: 0.0115, pitch: "B3", tensionLbs: 12.1 },
  { gauge: 0.0120, pitch: "B3", tensionLbs: 13.1 },
  { gauge: 0.0125, pitch: "B3", tensionLbs: 14.3 },
  { gauge: 0.0130, pitch: "B3", tensionLbs: 15.4 },
  { gauge: 0.0135, pitch: "B3", tensionLbs: 16.5 },

  // 3rd String (G3)
  { gauge: 0.0140, pitch: "G3", tensionLbs: 11.3 },
  { gauge: 0.0150, pitch: "G3", tensionLbs: 12.8 },
  { gauge: 0.0160, pitch: "G3", tensionLbs: 14.7 },
  { gauge: 0.0170, pitch: "G3", tensionLbs: 16.6 },
  { gauge: 0.0180, pitch: "G3", tensionLbs: 18.6 },

  // 4th String (D3)
  { gauge: 0.0190, pitch: "D3", tensionLbs: 11.6 },
  { gauge: 0.0200, pitch: "D3", tensionLbs: 12.4 },
  { gauge: 0.0220, pitch: "D3", tensionLbs: 13.2 },
  { gauge: 0.0240, pitch: "D3", tensionLbs: 15.7 },
  { gauge: 0.0260, pitch: "D3", tensionLbs: 18.4 },
  { gauge: 0.0280, pitch: "D3", tensionLbs: 21.2 },
  { gauge: 0.0300, pitch: "D3", tensionLbs: 24.8 },

  // 5th String (A2)
  { gauge: 0.0320, pitch: "A2", tensionLbs: 15.5 },
  { gauge: 0.0340, pitch: "A2", tensionLbs: 17.2 },
  { gauge: 0.0360, pitch: "A2", tensionLbs: 19.1 },
  { gauge: 0.0380, pitch: "A2", tensionLbs: 20.2 },
  { gauge: 0.0400, pitch: "A2", tensionLbs: 22.3 },

  // 6th String (Low E2)
  { gauge: 0.0420, pitch: "E2", tensionLbs: 14.4 },
  { gauge: 0.0440, pitch: "E2", tensionLbs: 15.6 },
  { gauge: 0.0460, pitch: "E2", tensionLbs: 16.8 },
  { gauge: 0.0480, pitch: "E2", tensionLbs: 18.3 },
  { gauge: 0.0500, pitch: "E2", tensionLbs: 19.7 },
  { gauge: 0.0520, pitch: "E2", tensionLbs: 21.2 },
  { gauge: 0.0540, pitch: "E2", tensionLbs: 23.6 },
  { gauge: 0.0560, pitch: "E2", tensionLbs: 25.2 },
  { gauge: 0.0580, pitch: "E2", tensionLbs: 28.3 },
  { gauge: 0.0600, pitch: "E2", tensionLbs: 30.8 },
  { gauge: 0.0620, pitch: "E2", tensionLbs: 32.6 },

  // 7th String (Low B1)
  { gauge: 0.0640, pitch: "B1", tensionLbs: 19.9 },
  { gauge: 0.0660, pitch: "B1", tensionLbs: 20.6 },
  { gauge: 0.0680, pitch: "B1", tensionLbs: 21.8 },
  { gauge: 0.0700, pitch: "B1", tensionLbs: 30.1 },
  { gauge: 0.0720, pitch: "B1", tensionLbs: 24.2 },
] as const;

/**
 * Retrieves calibrated tension in lbs for a string given gauge and pitch note,
 * optionally scaled to a different scale length.
 */
export const getCalibratedStringTension = (
  gauge: number,
  pitch: string,
  scaleLengthInches: number = STANDARD_SCALE_LENGTH_INCHES,
): number | null => {
  const match = PLOUTONE_BENCHMARK_TABLE.find(
    (row) => Math.abs(row.gauge - gauge) < 0.0001 && row.pitch.toUpperCase() === pitch.toUpperCase(),
  );

  if (!match) return null;
  const scaleMultiplier = getScaleLengthTensionMultiplier(scaleLengthInches, STANDARD_SCALE_LENGTH_INCHES);
  return Number((match.tensionLbs * scaleMultiplier).toFixed(2));
};

// ─── Standard Guitar String Sets & Physical Specs ────────────────────────────

export interface GuitarStringSpec {
  position: number;
  note: string;
  midi: number;
  frequency: number;
  gaugeInches: number;
  gaugeMm: number;
  nominalTensionLbs: number;
  nominalTensionNewtons: number;
  type: "plain" | "wound";
}

/**
 * Standard Electric Light (10–46) Physical Calibration Profile.
 * Standard vibrating scale length: 25.5 in (0.648 m), A440 reference.
 */
export const STANDARD_ELECTRIC_LIGHT_10_46: readonly GuitarStringSpec[] = [
  {
    position: 6,
    note: "E2",
    midi: 40,
    frequency: 82.41,
    gaugeInches: 0.046,
    gaugeMm: 1.17,
    nominalTensionLbs: 16.8,
    nominalTensionNewtons: 16.8 * NEWTONS_PER_POUND_FORCE,
    type: "wound",
  },
  {
    position: 5,
    note: "A2",
    midi: 45,
    frequency: 110.00,
    gaugeInches: 0.036,
    gaugeMm: 0.91,
    nominalTensionLbs: 19.1,
    nominalTensionNewtons: 19.1 * NEWTONS_PER_POUND_FORCE,
    type: "wound",
  },
  {
    position: 4,
    note: "D3",
    midi: 50,
    frequency: 146.83,
    gaugeInches: 0.026,
    gaugeMm: 0.66,
    nominalTensionLbs: 18.4,
    nominalTensionNewtons: 18.4 * NEWTONS_PER_POUND_FORCE,
    type: "wound",
  },
  {
    position: 3,
    note: "G3",
    midi: 55,
    frequency: 196.00,
    gaugeInches: 0.017,
    gaugeMm: 0.43,
    nominalTensionLbs: 16.6,
    nominalTensionNewtons: 16.6 * NEWTONS_PER_POUND_FORCE,
    type: "plain",
  },
  {
    position: 2,
    note: "B3",
    midi: 59,
    frequency: 246.94,
    gaugeInches: 0.013,
    gaugeMm: 0.33,
    nominalTensionLbs: 15.4,
    nominalTensionNewtons: 15.4 * NEWTONS_PER_POUND_FORCE,
    type: "plain",
  },
  {
    position: 1,
    note: "E4",
    midi: 64,
    frequency: 329.63,
    gaugeInches: 0.010,
    gaugeMm: 0.25,
    nominalTensionLbs: 16.2,
    nominalTensionNewtons: 16.2 * NEWTONS_PER_POUND_FORCE,
    type: "plain",
  },
] as const;

/** Total nominal neck tension for standard 10–46 set: 102.5 lbs */
export const TOTAL_LIGHT_SET_TENSION_LBS = STANDARD_ELECTRIC_LIGHT_10_46.reduce(
  (sum, s) => sum + s.nominalTensionLbs,
  0,
);

/** Total nominal neck tension in Newtons: ~456.0 N */
export const TOTAL_LIGHT_SET_TENSION_NEWTONS = TOTAL_LIGHT_SET_TENSION_LBS * NEWTONS_PER_POUND_FORCE;
