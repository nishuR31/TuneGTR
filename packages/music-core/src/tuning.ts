export interface TuningString {
  position: number;
  midi: number;
  note: string;
  gauge?: number;
  frequency?: number;
  nominalTensionLbs?: number;
}

export interface TuningDefinition {
  id: string;
  name: string;
  instrument: "guitar" | "bass" | "ukulele";
  stringsLowToHigh: TuningString[];
  category: string;
  aliases?: string[];
}

// ─── MVP Tuning Catalog (Section 11 of design plan) ─────────────────────────

export const TUNINGS: TuningDefinition[] = [
  {
    id: "standard",
    name: "Standard",
    instrument: "guitar",
    category: "Standard",
    aliases: ["E Standard", "EADGBE"],
    stringsLowToHigh: [
      { position: 6, midi: 40, note: "E2", gauge: 0.046, frequency: 82.41, nominalTensionLbs: 16.8 },
      { position: 5, midi: 45, note: "A2", gauge: 0.036, frequency: 110.00, nominalTensionLbs: 19.1 },
      { position: 4, midi: 50, note: "D3", gauge: 0.026, frequency: 146.83, nominalTensionLbs: 18.4 },
      { position: 3, midi: 55, note: "G3", gauge: 0.017, frequency: 196.00, nominalTensionLbs: 16.6 },
      { position: 2, midi: 59, note: "B3", gauge: 0.013, frequency: 246.94, nominalTensionLbs: 15.4 },
      { position: 1, midi: 64, note: "E4", gauge: 0.010, frequency: 329.63, nominalTensionLbs: 16.2 },
    ],
  },
  {
    id: "half-step-down",
    name: "Half Step Down",
    instrument: "guitar",
    category: "Flat",
    aliases: ["Eb Standard", "Eb Ab Db Gb Bb Eb"],
    stringsLowToHigh: [
      { position: 6, midi: 39, note: "Eb2" },
      { position: 5, midi: 44, note: "Ab2" },
      { position: 4, midi: 49, note: "Db3" },
      { position: 3, midi: 54, note: "Gb3" },
      { position: 2, midi: 58, note: "Bb3" },
      { position: 1, midi: 63, note: "Eb4" },
    ],
  },
  {
    id: "whole-step-down",
    name: "Whole Step Down",
    instrument: "guitar",
    category: "Flat",
    aliases: ["D Standard", "D G C F A D"],
    stringsLowToHigh: [
      { position: 6, midi: 38, note: "D2" },
      { position: 5, midi: 43, note: "G2" },
      { position: 4, midi: 48, note: "C3" },
      { position: 3, midi: 53, note: "F3" },
      { position: 2, midi: 57, note: "A3" },
      { position: 1, midi: 62, note: "D4" },
    ],
  },
  {
    id: "drop-d",
    name: "Drop D",
    instrument: "guitar",
    category: "Drop",
    aliases: ["DADGBE"],
    stringsLowToHigh: [
      { position: 6, midi: 38, note: "D2" },
      { position: 5, midi: 45, note: "A2" },
      { position: 4, midi: 50, note: "D3" },
      { position: 3, midi: 55, note: "G3" },
      { position: 2, midi: 59, note: "B3" },
      { position: 1, midi: 64, note: "E4" },
    ],
  },
  {
    id: "drop-c",
    name: "Drop C",
    instrument: "guitar",
    category: "Drop",
    aliases: ["CGCFAD"],
    stringsLowToHigh: [
      { position: 6, midi: 36, note: "C2" },
      { position: 5, midi: 43, note: "G2" },
      { position: 4, midi: 48, note: "C3" },
      { position: 3, midi: 53, note: "F3" },
      { position: 2, midi: 57, note: "A3" },
      { position: 1, midi: 62, note: "D4" },
    ],
  },
  {
    id: "dadgad",
    name: "DADGAD",
    instrument: "guitar",
    category: "Alternate",
    aliases: ["Celtic Tuning"],
    stringsLowToHigh: [
      { position: 6, midi: 38, note: "D2" },
      { position: 5, midi: 45, note: "A2" },
      { position: 4, midi: 50, note: "D3" },
      { position: 3, midi: 55, note: "G3" },
      { position: 2, midi: 57, note: "A3" },
      { position: 1, midi: 62, note: "D4" },
    ],
  },
  {
    id: "open-g",
    name: "Open G",
    instrument: "guitar",
    category: "Open",
    aliases: ["DGDGBD", "Keith Richards"],
    stringsLowToHigh: [
      { position: 6, midi: 38, note: "D2" },
      { position: 5, midi: 43, note: "G2" },
      { position: 4, midi: 50, note: "D3" },
      { position: 3, midi: 55, note: "G3" },
      { position: 2, midi: 59, note: "B3" },
      { position: 1, midi: 62, note: "D4" },
    ],
  },
  {
    id: "open-d",
    name: "Open D",
    instrument: "guitar",
    category: "Open",
    aliases: ["DADF#AD"],
    stringsLowToHigh: [
      { position: 6, midi: 38, note: "D2" },
      { position: 5, midi: 45, note: "A2" },
      { position: 4, midi: 50, note: "D3" },
      { position: 3, midi: 54, note: "F#3" },
      { position: 2, midi: 57, note: "A3" },
      { position: 1, midi: 62, note: "D4" },
    ],
  },
  {
    id: "open-e",
    name: "Open E",
    instrument: "guitar",
    category: "Open",
    aliases: ["EBEG#BE"],
    stringsLowToHigh: [
      { position: 6, midi: 40, note: "E2" },
      { position: 5, midi: 47, note: "B2" },
      { position: 4, midi: 52, note: "E3" },
      { position: 3, midi: 56, note: "G#3" },
      { position: 2, midi: 59, note: "B3" },
      { position: 1, midi: 64, note: "E4" },
    ],
  },
  {
    id: "open-a",
    name: "Open A",
    instrument: "guitar",
    category: "Open",
    aliases: ["EAC#EAC#"],
    stringsLowToHigh: [
      { position: 6, midi: 40, note: "E2" },
      { position: 5, midi: 45, note: "A2" },
      { position: 4, midi: 49, note: "C#3" },
      { position: 3, midi: 52, note: "E3" },
      { position: 2, midi: 57, note: "A3" },
      { position: 1, midi: 61, note: "C#4" },
    ],
  },
];

/** Convenience export for default tuning */
export const StandardGuitarTuning = TUNINGS[0];
