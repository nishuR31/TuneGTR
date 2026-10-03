# TuneGTR — final guitar-only repair

## What was repaired

1. **Calibration contamination removed**
   - Guitar mode is fixed to A440.
   - The old persisted tuner-settings key was replaced with `tunergtr-guitar-settings-v2`, so an old 432/442-style setting cannot silently survive into the repaired build.
   - Settings no longer exposes arbitrary A4 calibration.

2. **Microphone PCM path repaired**
   - Expo Audio capture now requests normalized `float32` PCM.
   - Interleaved channels are explicitly decoded and downmixed to mono.
   - The actual stream sample rate supplied by Expo is passed to the detector.

3. **String-aware pitch detection**
   - YIN remains the pitch estimator.
   - The detector receives the active guitar string targets.
   - Direct target valleys are preferred over generic global minima.
   - Spectral magnitude at the candidate fundamental is used to disambiguate octave/subharmonic valleys, especially C2/C3-style tunings.
   - Harmonic recovery is only used when there is no credible direct configured-string fundamental.
   - Measured detuning is preserved; the detector never snaps the pitch to zero cents.

4. **Manual string lock is stronger**
   - When the user selects a physical string, the target is authoritative.
   - 2x/3x/4x harmonic recovery is allowed only in this explicit manual-target mode.

5. **Signal robustness**
   - RMS gate lowered from 0.003 to 0.0015.
   - Minimum detector confidence lowered to 0.30.
   - Automatic string acceptance widened to 240 cents while remaining below the closest standard adjacent-string interval.
   - No-signal clearing waits longer, preventing the UI from blanking between valid plucks.

6. **UI/UX rebuilt for guitar only**
   - Speedometer/needle gauge removed.
   - Replaced with a direct horizontal cents meter.
   - Large detected note, detected string, measured Hz, target Hz, cents error and signal confidence are shown together.
   - Tune direction is explicit: `TUNE UP`, `IN TUNE`, or `TUNE DOWN`.
   - Original TuneGTR icon is restored in the tuner header.
   - Branding is `TuneGTR`.
   - Navigation and surfaces use the glass visual system rather than the old clay UI.
   - Unused gauge/wave/note/banner components were removed to reduce source size.

## Verification

- Standard guitar: 6 strings × 7 detunings (−50, −40, −20, 0, +20, +40, +50 cents): **42/42 passed**.
- Core `music-core` + `tuner-core` strict TypeScript compilation: **passed**.
- Manual 2x/3x/4x harmonic recovery: **passed**.
- Pure/direct B3 remains B3 in the detector regression.

## Important acoustic limitation

A microphone cannot always prove the physical identity of a pitch. For example, a strong B3 partial can coexist with a low E string's third harmonic at approximately the same frequency. TuneGTR therefore prefers a credible direct configured string and provides explicit string locking for ambiguous cases instead of claiming certainty the audio cannot support.
