/** Equal-tempered music calculations used by the tuner. */
export const NOTE_NAMES = [
  "C", "C#", "D", "D#", "E", "F",
  "F#", "G", "G#", "A", "A#", "B",
] as const;

export type NoteName = (typeof NOTE_NAMES)[number];

export const MIN_A4 = 400;
export const MAX_A4 = 480;

export const getMidi = (frequency: number, referenceA4: number = 440): number => {
  if (!Number.isFinite(frequency) || frequency <= 0 || !Number.isFinite(referenceA4) || referenceA4 <= 0) return 0;
  return Math.round(69 + 12 * Math.log2(frequency / referenceA4));
};

export const getPreciseMidi = (frequency: number, referenceA4: number = 440): number => {
  if (!Number.isFinite(frequency) || frequency <= 0 || !Number.isFinite(referenceA4) || referenceA4 <= 0) return 0;
  return 69 + 12 * Math.log2(frequency / referenceA4);
};

export const getTargetFrequency = (midi: number, referenceA4: number = 440): number => {
  if (!Number.isFinite(midi) || !Number.isFinite(referenceA4) || referenceA4 <= 0) return 0;
  return referenceA4 * Math.pow(2, (midi - 69) / 12);
};

/** Positive = sharp (too high); negative = flat (too low). */
export const getCents = (frequency: number, targetFrequency: number): number => {
  if (
    !Number.isFinite(targetFrequency) ||
    !Number.isFinite(frequency) ||
    targetFrequency <= 0 ||
    frequency <= 0
  ) return 0;
  return 1200 * Math.log2(frequency / targetFrequency);
};

export type TuningAction = "tune_up" | "tune_down" | "none";

export const getTuningAction = (
  cents: number,
  inTuneCents = 5,
): TuningAction => {
  if (!Number.isFinite(cents)) return "none";
  const threshold = Math.abs(inTuneCents);
  const epsilon = 1e-9;
  if (cents < -threshold - epsilon) return "tune_up";
  if (cents > threshold + epsilon) return "tune_down";
  return "none";
};



/**
 * Transpose a configured note label by semitones while preserving its accidental
 * preference (flat tunings remain flat, sharp tunings remain sharp).
 */
export const transposeNoteName = (
  note: string,
  semitones: number,
): string => {
  const match = note.match(/^([A-G](?:#|b)?)(-?\d+)$/);
  if (!match || !Number.isInteger(semitones)) return note;

  const pitchClass = match[1];
  const octave = Number(match[2]);
  const flats = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
  const sharps = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

  const flatToSharp: Record<string, string> = {
    Db: "C#",
    Eb: "D#",
    Gb: "F#",
    Ab: "G#",
    Bb: "A#",
  };
  const normalized = flatToSharp[pitchClass] ?? pitchClass;
  const sharpIndex = sharps.indexOf(normalized);
  if (sharpIndex < 0) return note;

  const midi = (octave + 1) * 12 + sharpIndex + semitones;
  const newIndex = ((midi % 12) + 12) % 12;
  const newOctave = Math.floor(midi / 12) - 1;

  const useFlats = pitchClass.includes("b");
  return `${(useFlats ? flats : sharps)[newIndex]}${newOctave}`;
};

export const getNoteName = (midi: number): string => {
  if (!Number.isFinite(midi)) return "--";
  const rounded = Math.round(midi);
  const noteIndex = ((rounded % 12) + 12) % 12;
  const octave = Math.floor(rounded / 12) - 1;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
};

export const getPitchClass = (midi: number): string => {
  if (!Number.isFinite(midi)) return "--";
  const rounded = Math.round(midi);
  const noteIndex = ((rounded % 12) + 12) % 12;
  return NOTE_NAMES[noteIndex];
};

export interface TuningTarget {
  position: number;
  midi: number;
  note: string;
  targetFrequency: number;
  cents: number;
  absCents: number;
}

/**
 * Find a configured open-string target using musical distance (cents).
 * This function intentionally does not perform octave correction.
 */
export const findNearestString = (
  frequency: number,
  tuningStrings: { position: number; midi: number; note: string }[],
  referenceA4 = 440,
  maxCents = Infinity,
): TuningTarget | null => {
  if (!Number.isFinite(frequency) || frequency <= 0 || tuningStrings.length === 0) return null;

  let best: TuningTarget | null = null;
  for (const s of tuningStrings) {
    const targetFrequency = getTargetFrequency(s.midi, referenceA4);
    const cents = getCents(frequency, targetFrequency);
    const absCents = Math.abs(cents);

    if (!best || absCents < best.absCents) {
      best = { ...s, targetFrequency, cents, absCents };
    }
  }

  return best && best.absCents <= maxCents ? best : null;
};

/**
 * Resolve a detector octave error only when the target is already known.
 *
 * This is deliberately NOT used during automatic string acquisition:
 * a real E3 is 1200 cents above E2, and blindly halving it would falsely
 * identify it as the low E string.
 */
export const resolvePitchAgainstTarget = (
  detectedFrequency: number,
  targetFrequency: number,
  options: {
    maxDirectCents?: number;
    octaveToleranceCents?: number;
  } = {},
): { frequency: number; cents: number; octaveCorrected: boolean } | null => {
  if (
    !Number.isFinite(detectedFrequency) ||
    detectedFrequency <= 0 ||
    !Number.isFinite(targetFrequency) ||
    targetFrequency <= 0
  ) return null;

  const maxDirectCents = options.maxDirectCents ?? 250;
  const octaveToleranceCents = options.octaveToleranceCents ?? 35;
  const directCents = getCents(detectedFrequency, targetFrequency);

  if (Math.abs(directCents) <= maxDirectCents) {
    return {
      frequency: detectedFrequency,
      cents: directCents,
      octaveCorrected: false,
    };
  }

  // Manual string selection also permits harmonic recovery. Because the user
  // explicitly selected the physical string, dividing a detected 2nd/3rd/4th
  // harmonic is safe and preserves the measured cents error.
  for (let harmonic = 2; harmonic <= 4; harmonic++) {
    const recovered = detectedFrequency / harmonic;
    const recoveredCents = getCents(recovered, targetFrequency);
    if (Math.abs(recoveredCents) <= octaveToleranceCents) {
      return {
        frequency: recovered,
        cents: recoveredCents,
        octaveCorrected: true,
      };
    }
  }

  for (let multiplier = 2; multiplier <= 4; multiplier++) {
    const recovered = detectedFrequency * multiplier;
    const recoveredCents = getCents(recovered, targetFrequency);
    if (Math.abs(recoveredCents) <= octaveToleranceCents) {
      return {
        frequency: recovered,
        cents: recoveredCents,
        octaveCorrected: true,
      };
    }
  }

  return null;
};
