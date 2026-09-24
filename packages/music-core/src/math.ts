/** Note names in chromatic order */
export const NOTE_NAMES = [
  "C", "C#", "D", "D#", "E", "F",
  "F#", "G", "G#", "A", "A#", "B",
] as const;

export type NoteName = (typeof NOTE_NAMES)[number];

/**
 * Convert a frequency (Hz) to the nearest MIDI note number.
 * Uses equal temperament with configurable A4 reference.
 */
export const getMidi = (frequency: number, referenceA4: number = 440): number => {
  if (frequency <= 0) return 0;
  return Math.round(69 + 12 * Math.log2(frequency / referenceA4));
};

/**
 * Convert a frequency to a precise (non-rounded) MIDI value for cents calc.
 */
export const getPreciseMidi = (frequency: number, referenceA4: number = 440): number => {
  if (frequency <= 0) return 0;
  return 69 + 12 * Math.log2(frequency / referenceA4);
};

/**
 * Convert a MIDI note number back to frequency (Hz).
 */
export const getTargetFrequency = (midi: number, referenceA4: number = 440): number => {
  return referenceA4 * Math.pow(2, (midi - 69) / 12);
};

/**
 * Calculate the cents offset between a detected frequency and a target frequency.
 * Positive = sharp, negative = flat.
 */
export const getCents = (frequency: number, targetFrequency: number): number => {
  if (targetFrequency <= 0 || frequency <= 0) return 0;
  return 1200 * Math.log2(frequency / targetFrequency);
};

/**
 * Get the note name from a MIDI number.
 */
export const getNoteName = (midi: number): string => {
  const noteIndex = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
};

/**
 * Get just the pitch class (e.g. "E") from a MIDI number.
 */
export const getPitchClass = (midi: number): string => {
  const noteIndex = ((midi % 12) + 12) % 12;
  return NOTE_NAMES[noteIndex];
};

/**
 * Find the nearest target string in a tuning for a given frequency.
 * Returns the closest string by frequency distance.
 */
export const findNearestString = (
  frequency: number,
  tuningStrings: { position: number; midi: number; note: string }[],
  referenceA4: number = 440,
): { position: number; midi: number; note: string; targetFrequency: number; cents: number } | null => {
  if (frequency <= 0 || tuningStrings.length === 0) return null;

  let closest = tuningStrings[0];
  let closestTargetFreq = getTargetFrequency(closest.midi, referenceA4);
  let closestCents = Math.abs(getCents(frequency, closestTargetFreq));

  for (let i = 1; i < tuningStrings.length; i++) {
    const s = tuningStrings[i];
    const targetFreq = getTargetFrequency(s.midi, referenceA4);
    const cents = Math.abs(getCents(frequency, targetFreq));
    if (cents < closestCents) {
      closest = s;
      closestTargetFreq = targetFreq;
      closestCents = cents;
    }
  }

  return {
    ...closest,
    targetFrequency: closestTargetFreq,
    cents: getCents(frequency, closestTargetFreq),
  };
};
