import { describe, it, expect } from "vitest";
import {
  getMidi,
  getTargetFrequency,
  getCents,
  getNoteName,
  getPitchClass,
  getTuningAction,
  findNearestString,
  resolvePitchAgainstTarget,
} from "../src/math";
import { StandardGuitarTuning } from "../src/tuning";

describe("Music Core Math", () => {
  it("uses the standard A440 equal-temperament targets", () => {
    const expected = [
      [40, 82.406889],
      [45, 110],
      [50, 146.832384],
      [55, 195.997718],
      [59, 246.941651],
      [64, 329.627557],
    ] as const;

    for (const [midi, frequency] of expected) {
      expect(getTargetFrequency(midi, 440)).toBeCloseTo(frequency, 4);
    }
  });

  it("converts frequency to MIDI", () => {
    expect(getMidi(440)).toBe(69);
    expect(getMidi(82.406889)).toBe(40);
    expect(getMidi(329.627557)).toBe(64);
  });

  it("calculates cents with the correct sign", () => {
    expect(getCents(440, 440)).toBeCloseTo(0, 8);
    expect(getCents(440 * Math.pow(2, 10 / 1200), 440)).toBeCloseTo(10, 6);
    expect(getCents(440 * Math.pow(2, -15 / 1200), 440)).toBeCloseTo(-15, 6);
  });

  it("maps negative cents to tune-up and positive cents to tune-down", () => {
    expect(getTuningAction(-12)).toBe("tune_up");
    expect(getTuningAction(12)).toBe("tune_down");
    expect(getTuningAction(4.9)).toBe("none");
    expect(getTuningAction(-5)).toBe("none");
  });

  it("gets note names and pitch classes", () => {
    expect(getNoteName(69)).toBe("A4");
    expect(getNoteName(40)).toBe("E2");
    expect(getNoteName(64)).toBe("E4");
    expect(getPitchClass(59)).toBe("B");
  });

  it("keeps A4 reference changes mathematically consistent", () => {
    expect(getMidi(432, 432)).toBe(69);
    expect(getTargetFrequency(69, 432)).toBe(432);
    expect(getTargetFrequency(40, 432)).toBeCloseTo(80.908, 2);
  });

  it("finds only an actually nearby configured string", () => {
    const exact = findNearestString(
      82.406889,
      StandardGuitarTuning.stringsLowToHigh,
      440,
      5,
    );
    expect(exact?.position).toBe(6);
    expect(exact?.absCents).toBeLessThan(0.01);

    // E3 is a real musical pitch, but it is NOT an open-string target in
    // standard guitar tuning. Automatic acquisition must not turn it into E2.
    const realE3 = findNearestString(
      164.813778,
      StandardGuitarTuning.stringsLowToHigh,
      440,
      150,
    );
    expect(realE3).toBeNull();
  });

  it("does not perform octave correction during string acquisition", () => {
    const e2 = getTargetFrequency(40);
    const result = findNearestString(
      e2 * 2,
      StandardGuitarTuning.stringsLowToHigh,
      440,
      150,
    );
    expect(result).toBeNull();
  });

  it("allows octave recovery only after a target is explicitly known", () => {
    const target = getTargetFrequency(40);
    const result = resolvePitchAgainstTarget(
      target * 2,
      target,
      {
        maxDirectCents: 250,
        octaveToleranceCents: 35,
      },
    );

    expect(result?.octaveCorrected).toBe(true);
    expect(result?.frequency).toBeCloseTo(target, 6);
    expect(result?.cents).toBeCloseTo(0, 6);
  });

  it("recovers a selected string from a 3rd harmonic", () => {
    const e2 = getTargetFrequency(40);
    const result = resolvePitchAgainstTarget(e2 * 3, e2, {
      maxDirectCents: 250,
      octaveToleranceCents: 35,
    });
    expect(result?.octaveCorrected).toBe(true);
    expect(result?.frequency).toBeCloseTo(e2, 6);
    expect(result?.cents).toBeCloseTo(0, 6);
  });

  it("does not convert an unrelated note into a selected target", () => {
    const e2 = getTargetFrequency(40);
    const a2 = getTargetFrequency(45);

    const result = resolvePitchAgainstTarget(
      a2,
      e2,
      {
        maxDirectCents: 250,
        octaveToleranceCents: 35,
      },
    );

    expect(result).toBeNull();
  });
});
