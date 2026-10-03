# TuneGTR production pitch-engine audit

## Reference model

The tuner uses 12-tone equal temperament with a configurable A4 reference. The
default is A4 = 440 Hz.

For MIDI note `m`:

`frequency = A4 * 2^((m - 69) / 12)`

For measured frequency `f` and target `t`:

`cents = 1200 * log2(f / t)`

Therefore:

- negative cents = measured pitch is too low = **tune up / tighten**
- positive cents = measured pitch is too high = **tune down / loosen**
- 0 cents = exact target

The direction is derived directly from the signed cents value. No UI-specific
logic reverses it.

## Standard guitar targets at A440

| String | Note | MIDI | Hz |
|---|---|---:|---:|
| 6 | E2 | 40 | 82.406889 |
| 5 | A2 | 45 | 110.000000 |
| 4 | D3 | 50 | 146.832384 |
| 3 | G3 | 55 | 195.997718 |
| 2 | B3 | 59 | 246.941651 |
| 1 | E4 | 64 | 329.627557 |

These are generated from MIDI rather than hard-coded rounded frequencies.

## Signal-processing model

`microphone -> mono PCM -> rolling 4096-sample window -> DC removal/RMS ->
YIN F0 -> confidence rejection -> median + EMA -> target selection -> cents ->
state machine -> UI`

4096 samples at 48 kHz represent approximately 85.3 ms. The detector uses the
actual sample rate supplied by the audio stream, because the requested rate is
not guaranteed to be the hardware's actual rate.

Expo's audio stream documentation specifies that stream data includes the actual
sample rate and that int16 data is little-endian PCM. The native adapter therefore
uses the supplied sample rate and explicitly decodes little-endian int16 data.
Unexpected multi-channel input is downmixed to mono before pitch detection.

## Target selection

### Automatic mode

Automatic mode uses only the detected fundamental as reported by YIN.

It does **not** globally test:

`f`, `f/2`, `2f`

and choose whichever happens to be nearest a guitar string.

This is critical. E2 = 82.406889 Hz and E3 = 164.813778 Hz are both real pitches.
Blindly halving E3 can turn a valid E3 detection into a false E2 string match.

Automatic acquisition accepts a configured string only within ±150 cents. If
nothing is close enough, the tuner reports an unclear/unstable pitch instead of
inventing a target.

### Manual string mode

When the user taps a string, the target is known. Only that target is evaluated.

Manual mode allows ±250 cents of direct deviation so a badly detuned string can
still be guided toward its target. A detector octave error may be corrected only
against that explicit target when the octave-transformed frequency is within
±35 cents.

## String locking

Once automatic mode acquires a string, it stays on that string while the
measured pitch remains within ±250 cents. This is below the smallest 300-cent
interval between configured guitar targets, so a locked G3 cannot absorb a real B3.

If the pitch leaves that range, the lock is released and the next valid open-string
candidate can be acquired.

Manual selection always takes precedence over automatic detection.

## Stability

Current production defaults:

- YIN threshold: `0.12`
- YIN search range: `55–700 Hz`
- RMS/silence threshold: `0.003` AC RMS
- stability history: `5`
- EMA alpha: `0.30`
- pitch jump reset: `250¢`
- detector confidence threshold: `0.45`
- automatic string acquisition: `±150¢`
- manual direct range: `±250¢`
- automatic lock release: `±250¢`
- UI/state entry to in-tune: `±5¢`
- state exit hysteresis: `±6¢`
- in-tune confidence requirement: `0.55`

These are engineering defaults, not claims that every phone microphone has
sub-cent physical accuracy.

## DC removal

Phone microphone paths can contain a small DC component. RMS and YIN now operate
on a mean-centered analysis buffer. This prevents DC bias from being interpreted
as useful guitar energy.

## Audio-channel handling

The Expo stream can report actual channel count. If more than one channel arrives,
the adapter averages the channels to mono. Feeding interleaved L/R samples directly
to a single-channel pitch detector would create a false period.

## UI correctness

The UI no longer hides a measured non-zero cents value as `0.0¢` merely because
the state machine is inside its hysteresis band.

Direction wording is physical and orientation-independent:

- **Tune Up / tighten**
- **Tune Down / loosen**

It does not say "turn the peg toward/away from you", because peg rotation direction
depends on the guitar/headstock geometry.

The primary note shown by the tuner is the selected target note. The actual detected
note is shown separately. This prevents a detuned E string from being visually
presented as if it were already exactly the target note.

## Beginner workflow

The tuner UI instructs the user to:

1. Select the intended tuning.
2. Pluck one open string at a time.
3. Mute the other strings.
4. Let the string ring for the detector to settle.
5. If automatic detection is ambiguous, tap the intended string to lock the target.
6. If flat, tighten/tune up.
7. If sharp, loosen/tune down.
8. Aim for the center / within approximately ±5 cents.
9. Recheck the strings after tuning the full set because changing string tension
   can shift previously tuned strings.

For a badly sharp string, a good physical tuning procedure is to go slightly below
the target and then approach the target from below. The app reports the instantaneous
pitch; it cannot compensate for mechanical hysteresis, string friction, nut friction,
or tuning-peg backlash.

## Reference tone

The automatic in-tune event no longer plays an audible reference tone. Doing so
while the microphone is listening can feed the phone speaker back into the microphone
and create a false pitch.

Reference tone playback remains an explicit user action on supported platforms.

## Production limitations

A phone microphone tuner is not a laboratory frequency standard. Real guitar
signals contain attack transients, harmonics, room noise, sympathetic strings,
pickup/microphone coloration, and pitch drift during sustain.

The correct production behavior is therefore to reject ambiguous measurements rather
than display a confident but wrong string/direction.

The core uses YIN, a published fundamental-frequency estimator designed for speech
and music, with confidence rejection and temporal stabilization.

Full native Expo/Android build verification still requires installing the repository's
dependency graph and running the project on a physical device. Synthetic deterministic
tests cannot prove microphone behavior on every handset.
