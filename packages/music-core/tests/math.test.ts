import { describe, it, expect } from "vitest";
import { getMidi, getTargetFrequency, getCents, getNoteName, getPitchClass, findNearestString } from "../src/math";
import { StandardGuitarTuning } from "../src/tuning";

describe("Music Core Math", () => {
  it("converts frequency to midi", () => {
    expect(getMidi(440)).toBe(69); // A4
    expect(getMidi(82.41)).toBe(40); // E2
    expect(getMidi(329.63)).toBe(64); // E4
  });

  it("converts midi to target frequency", () => {
    expect(getTargetFrequency(69)).toBe(440);
    expect(getTargetFrequency(40)).toBeCloseTo(82.4069, 2);
  });

  it("calculates cents", () => {
    const target = 440;
    const higher = target * Math.pow(2, 10 / 1200); // 10 cents sharp
    expect(getCents(higher, target)).toBeCloseTo(10, 1);

    const lower = target * Math.pow(2, -15 / 1200); // 15 cents flat
    expect(getCents(lower, target)).toBeCloseTo(-15, 1);
  });

  it("gets note name from MIDI", () => {
    expect(getNoteName(69)).toBe("A4");
    expect(getNoteName(60)).toBe("C4");
    expect(getNoteName(40)).toBe("E2");
    expect(getNoteName(64)).toBe("E4");
  });

  it("gets pitch class from MIDI", () => {
    expect(getPitchClass(69)).toBe("A");
    expect(getPitchClass(40)).toBe("E");
    expect(getPitchClass(59)).toBe("B");
  });

  it("respects reference A4 for MIDI conversion", () => {
    // A4 = 432 Hz → should still map to MIDI 69
    expect(getMidi(432, 432)).toBe(69);
    // The standard 440 Hz at ref=432 should be slightly above MIDI 69
    expect(getMidi(440, 432)).toBe(69); // still rounds to 69 (~+32 cents)
  });

  it("finds nearest string in standard tuning", () => {
    const result = findNearestString(83, StandardGuitarTuning.stringsLowToHigh);
    expect(result).not.toBeNull();
    expect(result!.position).toBe(6); // E2
    expect(result!.note).toBe("E2");
    expect(result!.cents).toBeCloseTo(getCents(83, getTargetFrequency(40)), 1);
  });
});
