# TuneGTR — Exact Fix Sheet

This patch is based on the current `TuneGTR-PRECISE-GUITAR-LIQUID-FIXED` source.

Important: line numbers below refer to the current source before applying the edits. After each replacement, later line numbers will move. Use the exact surrounding code blocks as anchors.

## 1. Fix the main recognition problem

### File
`packages/tuner-core/src/detector.ts`

### Problem
The current block around lines **200–275** creates a "direct candidate" for every configured string and then chooses between those candidates using a Goertzel score.

That is too aggressive for guitar audio. A harmonic/subharmonic can produce a plausible YIN valley around another guitar string, causing the detector to become biased toward one string such as D3.

### Replace

Replace the complete block beginning:

```ts
if (targetFrequencies.length > 0) {
```

at approximately line **200**

through its matching closing `}` immediately before:

```ts
const frequency = selected.frequency;
```

with:

```ts
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
```

## 2. Stop the detector from selecting a global false minimum

### File
`packages/tuner-core/src/detector.ts`

### Current lines
Approximately **175–193**.

The current code adds the global minimum as another candidate:

```ts
let bestTau = tauMin;
let bestValue = yinBuffer[tauMin];
for (let tau = tauMin + 1; tau <= tauMax; tau++) {
  if (yinBuffer[tau] < bestValue) {
    bestValue = yinBuffer[tau];
    bestTau = tau;
  }
}
...
candidates.push({ frequency: bestFrequency, value: bestValue, tau: bestTau });
```

This is a major source of octave/subharmonic instability.

### Replace the complete global-minimum section with:

```ts
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
```

Do NOT keep the old `bestTau` global scan.

## 3. Make smoothing slower and much more stable

### File
`apps/mobile/src/features/tuner/hooks/useTuner.ts`

### Current line
Around **69–71**:

```ts
const stabilityFilter = useRef(
  new StabilityFilter(5, 0.30, 250, MIN_DETECTOR_CONFIDENCE),
).current;
```

### Replace with:

```ts
const stabilityFilter = useRef(
  new StabilityFilter(
    7,      // median history
    0.18,   // slower EMA
    700,    // allow legitimate string changes
    0.42,   // reject weak pitch estimates
  ),
).current;
```

Why `700` instead of `250`: the six guitar strings are separated by roughly 300–500 cents. A string change must be allowed through the detector; otherwise the previous string can remain "sticky".

The string-selection logic below will independently protect against an adjacent-string lock.

## 4. Reduce false automatic string assignment

### File
`apps/mobile/src/features/tuner/hooks/useTuner.ts`

### Current constant
Around line **46**:

```ts
const AUTO_STRING_MAX_CENTS = 240;
```

### Replace with:

```ts
const AUTO_STRING_MAX_CENTS = 180;
```

This prevents a frequency from being confidently assigned to a guitar string when it is more than 1.5 semitones away.

## 5. Require consecutive confirmation before locking a new string

### File
`apps/mobile/src/features/tuner/hooks/useTuner.ts`

### Add after:

```ts
const lockedStringPosition = useRef<number | null>(null);
```

Add:

```ts
const candidateStringPosition = useRef<number | null>(null);
const candidateStringHits = useRef(0);
```

### In `resetTracking()`

After:

```ts
lockedStringPosition.current = null;
```

add:

```ts
candidateStringPosition.current = null;
candidateStringHits.current = 0;
```

### Replace the automatic acquisition section

Find approximately lines **288–308**:

```ts
if (!nearest) {
  const best = findNearestString(
    rawFrequency,
    adjustedStrings,
    referenceA4,
    AUTO_STRING_MAX_CENTS,
  );

  if (!best) {
    state.setTunerState("unstable");
    pendingUpdate.current = null;
    return;
  }

  nearest = best;
  frequency = rawFrequency;
  cents = best.cents;
  lockedStringPosition.current = best.position;
}
```

Replace it with:

```ts
if (!nearest) {
  const best = findNearestString(
    rawFrequency,
    adjustedStrings,
    referenceA4,
    AUTO_STRING_MAX_CENTS,
  );

  if (!best) {
    candidateStringPosition.current = null;
    candidateStringHits.current = 0;
    state.setTunerState("unstable");
    pendingUpdate.current = null;
    return;
  }

  /*
   * Require two consecutive matching analyses before changing the
   * automatically selected physical string.
   */
  if (candidateStringPosition.current === best.position) {
    candidateStringHits.current += 1;
  } else {
    candidateStringPosition.current = best.position;
    candidateStringHits.current = 1;
  }

  if (candidateStringHits.current < 2) {
    state.setTunerState("signal_detected");
    pendingUpdate.current = null;
    return;
  }

  nearest = best;
  frequency = rawFrequency;
  cents = best.cents;

  lockedStringPosition.current = best.position;
  candidateStringPosition.current = best.position;
  candidateStringHits.current = 0;
}
```

This is the important anti-jump mechanism.

## 6. Make a locked string release cleanly

### File
`apps/mobile/src/features/tuner/hooks/useTuner.ts`

Current:

```ts
const STRING_LOCK_RELEASE_CENTS = 220;
```

Replace:

```ts
const STRING_LOCK_RELEASE_CENTS = 170;
```

A locked string should not swallow a neighbouring string indefinitely.

## 7. Do not clear valid data too aggressively

### File
`apps/mobile/src/features/tuner/hooks/useTuner.ts`

Current:

```ts
if (invalidPitchCounter.current >= 3 &&
```

and:

```ts
if (invalidPitchCounter.current >= 15) {
```

Change to:

```ts
if (invalidPitchCounter.current >= 5 &&
```

and:

```ts
if (invalidPitchCounter.current >= 24) {
```

This prevents the display from repeatedly going:

```text
E → -- → E → -- → E
```

during the natural decay of a plucked string.

## 8. Keep the actual sample rate

### File
`apps/mobile/src/features/tuner/hooks/useTuner.ts`

Keep:

```ts
const actualSampleRate =
  bufferData.sampleRate > 0
    ? bufferData.sampleRate
    : DEFAULT_SAMPLE_RATE;
```

and:

```ts
processSamples(mono, actualSampleRate);
```

Do NOT replace this with a hard-coded `48000`.

The detector's frequency calculation depends directly on the actual sample rate.

## 9. Make the UI meter much less jumpy

### File
`apps/mobile/src/features/tuner/components/TuningMeter.tsx`

Current:

```ts
x.value=withTiming(active ? 50 + position : 50,{duration:110});
```

Replace with:

```ts
x.value = withTiming(
  active ? 50 + position : 50,
  {
    duration: 220,
  },
);
```

Also change:

```ts
const position = clamp(cents,-50,50);
```

to:

```ts
const position = clamp(cents, -35, 35);
```

The UI should not visually throw the marker to the extreme edge for an obviously badly tuned note.

## 10. Make the tuning meter easier to read

### File
`apps/mobile/src/features/tuner/components/TuningMeter.tsx`

Replace the style declaration at the bottom with:

```ts
const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    maxWidth: 430,
    paddingHorizontal: 2,
    marginTop: 8,
  },

  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 9,
  },

  track: {
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },

  zone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },

  center: {
    position: 'absolute',
    width: 2,
    top: 1,
    bottom: 1,
    left: '50%',
    marginLeft: -1,
  },

  marker: {
    position: 'absolute',
    width: 18,
    height: 30,
    borderRadius: 9,
    top: -5,
    marginLeft: -9,
    shadowOpacity: 0.30,
    shadowRadius: 7,
    elevation: 4,
  },

  scale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 7,
  },
});
```

## 11. Fix EADGBE string boxes overflowing/leaking

### File
`apps/mobile/src/features/tuner/components/StringSelector.tsx`

Current:

```ts
const horizontalPadding = 32;
const maxKeyWidth = layout.isTablet ? 72 : 56;
const calculatedWidth =
  (layout.contentWidth - horizontalPadding - gap * (strings.length - 1)) /
  strings.length;
```

Replace with:

```ts
const horizontalPadding = layout.isTablet ? 24 : 16;
const maxKeyWidth = layout.isTablet ? 76 : 52;

const availableWidth =
  Math.max(
    280,
    Math.min(layout.contentWidth, 430),
  ) -
  horizontalPadding -
  gap * (strings.length - 1);

const calculatedWidth = availableWidth / strings.length;

const keyWidth = Math.max(
  42,
  Math.min(maxKeyWidth, calculatedWidth),
);
```

Then change:

```tsx
<View className="flex-row justify-center" style={{ gap }}>
```

to:

```tsx
<View
  className="flex-row justify-center"
  style={{
    gap,
    width: '100%',
    paddingHorizontal: horizontalPadding / 2,
  }}
>
```

This keeps all six E-A-D-G-B-E boxes inside the card.

## 12. Make the string cards visually clean

### File
`apps/mobile/src/features/tuner/components/StringSelector.tsx`

Current selected surface has:

```ts
backgroundColor: isSelected
  ? (theme.mode === 'light'
      ? theme.colors.surfaceRaised
      : theme.colors.accentSoft)
  : theme.colors.surface,
borderColor: isSelected ? theme.colors.border : 'transparent',
borderWidth: 1,
```

Replace with:

```ts
backgroundColor: isSelected
  ? theme.colors.accentSoft
  : theme.colors.surface,

borderColor: isSelected
  ? theme.colors.accent
  : theme.colors.border,

borderWidth: 1,

shadowColor: '#000',
shadowOpacity: isSelected ? 0.20 : 0.08,
shadowRadius: isSelected ? 10 : 5,
shadowOffset: { width: 0, height: 4 },
elevation: isSelected ? 5 : 2,
```

## 13. Stop dimming the other strings too aggressively

Current:

```ts
opacity: isMuted ? 0.35 : 1,
```

Replace:

```ts
opacity: isMuted ? 0.72 : 1,
```

The other five strings should remain readable.

## 14. Increase text visibility

### File
`apps/mobile/src/theme/glass.ts`

Replace:

```ts
textSecondary: "#CBD5E1",
textMuted: "#94A3B8",
```

with:

```ts
textSecondary: "#E2E8F0",
textMuted: "#B8C4D6",
```

For the dark theme also change:

```ts
border: "rgba(255,255,255,0.12)",
highlight: "rgba(255,255,255,0.16)",
```

to:

```ts
border: "rgba(255,255,255,0.16)",
highlight: "rgba(255,255,255,0.20)",
```

## 15. Fix text being visually clipped inside the hero

### File
`apps/mobile/src/screens/TunerScreen.tsx`

Current:

```ts
hero:{padding:18,alignItems:'center',overflow:'hidden'}
```

Replace with:

```ts
hero:{
  paddingHorizontal:18,
  paddingTop:18,
  paddingBottom:20,
  alignItems:'center',
  overflow:'visible',
}
```

This is important because the current `overflow:'hidden'` can clip shadows, pills, large note text, and animated elements.

## 16. Make the main note readable

Current:

```ts
note:{fontSize:92,fontWeight:'300',letterSpacing:-5,lineHeight:100}
```

Replace:

```ts
note:{
  fontSize:84,
  fontWeight:'700',
  letterSpacing:-2,
  lineHeight:94,
}
```

And replace:

```ts
octave:{fontSize:28,fontWeight:'500',marginBottom:17,marginLeft:3}
```

with:

```ts
octave:{
  fontSize:24,
  fontWeight:'700',
  marginBottom:16,
  marginLeft:4,
}
```

## 17. Make the hero metrics readable

Current:

```ts
metricValue:{fontSize:14,fontWeight:'800',fontVariant:['tabular-nums'],textAlign:'center'},
metricLabel:{fontSize:8,fontWeight:'700',letterSpacing:1.1,textAlign:'center',marginTop:3},
```

Replace:

```ts
metricValue:{
  fontSize:15,
  fontWeight:'800',
  fontVariant:['tabular-nums'],
  textAlign:'center',
},

metricLabel:{
  fontSize:10,
  fontWeight:'800',
  letterSpacing:1,
  textAlign:'center',
  marginTop:4,
},
```

## 18. Do not let the six strings become a skeleton/loading-looking row

### File
`apps/mobile/src/features/tuner/components/StringSelector.tsx`

Replace:

```tsx
<AppText variant="caption" color="muted" className="text-[10px] mt-1 text-center">
  Tap a string to lock; sound reference is available on web
</AppText>
```

with:

```tsx
<AppText
  variant="caption"
  color="secondary"
  className="text-[10px] mt-2 text-center"
>
  Tap a string to lock detection
</AppText>
```

## 19. Make Standard tuning explicitly EADGBE

### File
`apps/mobile/src/screens/TunerScreen.tsx`

Current line around 71:

```tsx
<Text style={[styles.brandSub,{color:theme.colors.textMuted}]}>
  GUITAR TUNER · A440
</Text>
```

Replace:

```tsx
<Text style={[styles.brandSub,{color:theme.colors.textMuted}]}>
  GUITAR TUNER · E A D G B E · A440
</Text>
```

## 20. Use a guitar-specific tuning instruction

### File
`apps/mobile/src/screens/TunerScreen.tsx`

Replace the tip around line 125:

```tsx
For accurate detection, mute the other strings and pluck near the sound hole or bridge.
```

with:

```tsx
Pluck one open string at a time. Let it ring naturally and keep the other strings quiet.
```

## 21. IMPORTANT: do not change the Standard frequencies

### File
`packages/music-core/src/tuning.ts`

The Standard tuning block is already correct:

```ts
{ position: 6, midi: 40, note: "E2" },
{ position: 5, midi: 45, note: "A2" },
{ position: 4, midi: 50, note: "D3" },
{ position: 3, midi: 55, note: "G3" },
{ position: 2, midi: 59, note: "B3" },
{ position: 1, midi: 64, note: "E4" },
```

Do NOT modify these.

They correspond to:

```text
6th E2 = 82.4069 Hz
5th A2 = 110.0000 Hz
4th D3 = 146.8324 Hz
3rd G3 = 195.9977 Hz
2nd B3 = 246.9417 Hz
1st E4 = 329.6276 Hz
```

## 22. Keep A440 deterministic

### File
`apps/mobile/src/features/tuner/store/tunerStore.ts`

Keep:

```ts
referenceA4: 440,
```

and:

```ts
setReferenceA4: () => set({ referenceA4: 440 }),
```

Do not restore user calibration into the pitch path.

## 23. Increase in-tune hysteresis

### File
`apps/mobile/src/features/tuner/store/tunerStore.ts`

Current:

```ts
const ENTER_IN_TUNE_CENTS = 5;
const EXIT_IN_TUNE_CENTS = 6;
```

Replace:

```ts
const ENTER_IN_TUNE_CENTS = 5;
const EXIT_IN_TUNE_CENTS = 9;
```

This prevents the state from rapidly switching between:

```text
IN TUNE
TUNE UP
IN TUNE
TUNE UP
```

when microphone pitch jitter is only a few cents.

## 24. Final tuning behavior after these edits

The intended behavior is:

```text
Pluck E string
      ↓
YIN detects E2
      ↓
7-frame median
      ↓
slow EMA
      ↓
string candidate confirmed twice
      ↓
E2 locked
      ↓
cents calculated against 82.4069 Hz
      ↓
< -5¢       → TUNE UP
-5…+5¢      → IN TUNE
> +5¢       → TUNE DOWN
```

If you move directly from E → A → D → G → B → E, the detector must release the old lock and acquire the new string rather than visually interpolating between them.

## 25. Required test procedure

After applying the changes:

1. Clear the app's persisted storage once.
2. Start with Standard / A440 / capo OFF.
3. Start microphone.
4. Do NOT strum a chord.
5. Pluck only the 6th string.
6. Wait for E2 to stabilize.
7. Repeat for A2, D3, G3, B3, E4.
8. Repeat while intentionally detuning each string by approximately:
   - −40¢
   - −20¢
   - 0¢
   - +20¢
   - +40¢
9. Change strings directly without stopping the microphone.
10. Verify that the previous string does not remain locked.
11. Verify that the displayed cents value does not slowly drift toward zero.
12. Verify that a genuine B3 is not classified as E2.

Expected Standard targets:

```text
STRING 6 → E2 → 82.4069 Hz
STRING 5 → A2 → 110.0000 Hz
STRING 4 → D3 → 146.8324 Hz
STRING 3 → G3 → 195.9977 Hz
STRING 2 → B3 → 246.9417 Hz
STRING 1 → E4 → 329.6276 Hz
```

## 26. Do not tune using the UI state alone

The tuner should report:

```text
frequency = measured pitch
target    = configured string target
cents     = 1200 * log2(measured / target)
```

Never replace `frequency` with the nominal target just because a string was recognized.

That would make a bad string appear perfectly tuned.

