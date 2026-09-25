import React from "react";
import { View, Platform, StyleSheet } from "react-native";
import { useTunerStore } from "../store/tunerStore";
import { useTheme } from "../../../theme/ThemeProvider";
import { AppText } from "../../../components/common/AppText";
import { useLayout } from "../../../hooks/useLayout";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useEffect } from "react";

/**
 * Professional note display:
 * - Large note name with octave superscript
 * - Detected frequency vs target frequency
 * - Confidence indicator (dots)
 * - String label
 * - In-tune glow ring
 */
export const NoteDisplay: React.FC = React.memo(() => {
  const noteName = useTunerStore((s) => s.noteName);
  const tunerState = useTunerStore((s) => s.tunerState);
  const frequency = useTunerStore((s) => s.frequency);
  const octave = useTunerStore((s) => s.octave);
  const confidence = useTunerStore((s) => s.confidence);
  const detectedStringNote = useTunerStore((s) => s.detectedStringNote);
  const detectedStringPosition = useTunerStore((s) => s.detectedStringPosition);
  const targetFrequency = useTunerStore((s) => s.targetFrequency);
  const theme = useTheme();
  const layout = useLayout();

  const isActive = tunerState !== "idle" && tunerState !== "no_signal" && noteName !== "--";
  const isInTune = tunerState === 'in_tune';
  const isSignal = tunerState === 'signal_detected';

  // Glow/scale animation on in-tune
  const glowOpacity = useSharedValue(0);
  const noteScale = useSharedValue(1);

  useEffect(() => {
    if (isInTune) {
      glowOpacity.value = withSpring(1, { damping: 14, stiffness: 100 });
      noteScale.value = withSpring(1.04, { damping: 12, stiffness: 120 });
    } else {
      glowOpacity.value = withTiming(0, { duration: 300 });
      noteScale.value = withSpring(1, { damping: 12, stiffness: 120 });
    }
  }, [isInTune]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const noteStyle = useAnimatedStyle(() => ({
    transform: [{ scale: noteScale.value }],
  }));

  // Responsive font sizing
  const noteFontSize = layout.isCompact ? 60 : layout.isShortScreen ? 70 : 84;

  const noteColor = isInTune
    ? theme.colors.success
    : isActive
      ? theme.colors.text
      : theme.colors.textMuted;

  const glowColor = isInTune ? theme.colors.success : theme.colors.accent;

  // String label
  const stringLabel = isActive && detectedStringPosition > 0
    ? `String ${detectedStringPosition} · ${detectedStringNote.replace(/[0-9]/g, '')}`
    : null;

  // Frequency deviation in Hz
  const freqDevHz = isActive && targetFrequency > 0
    ? (frequency - targetFrequency).toFixed(2)
    : null;

  // Confidence dots (5 levels)
  const confidenceDots = isActive ? Math.max(1, Math.min(5, Math.round(confidence * 5))) : 0;

  return (
    <View style={styles.container}>
      {/* String label */}
      {stringLabel ? (
        <AppText
          variant="caption"
          color="muted"
          style={styles.stringLabel}
        >
          {stringLabel}
        </AppText>
      ) : (
        <View style={{ height: 18 }} />
      )}

      {/* In-tune glow ring behind note */}
      <View style={styles.noteWrapper}>
        <Animated.View
          style={[
            styles.glowRing,
            {
              width: noteFontSize * 1.4,
              height: noteFontSize * 1.4,
              borderRadius: noteFontSize * 0.7,
              backgroundColor: glowColor + '22',
              shadowColor: glowColor,
              shadowRadius: 24,
              shadowOpacity: 0.5,
              shadowOffset: { width: 0, height: 0 },
            },
            glowStyle,
          ]}
        />

        {/* Note name + octave */}
        <Animated.View style={[styles.noteRow, noteStyle]}>
          <AppText
            style={[
              styles.noteName,
              {
                fontSize: noteFontSize,
                color: noteColor,
                lineHeight: noteFontSize + 4,
                ...(Platform.OS === 'web'
                  ? { textShadow: isActive ? `0 0 32px ${glowColor}44` : 'none' }
                  : {
                      textShadowColor: isActive ? glowColor + '44' : 'transparent',
                      textShadowOffset: { width: 0, height: 0 },
                      textShadowRadius: 24,
                    }),
              },
            ]}
          >
            {isActive ? noteName : '—'}
          </AppText>
          {isActive && (
            <AppText
              style={[
                styles.octaveLabel,
                {
                  fontSize: noteFontSize * 0.34,
                  color: noteColor,
                  opacity: 0.7,
                  marginTop: -noteFontSize * 0.08,
                  marginLeft: 2,
                },
              ]}
            >
              {octave}
            </AppText>
          )}
        </Animated.View>
      </View>

      {/* Frequency row */}
      <View style={styles.freqRow}>
        <AppText variant="frequencyDisplay" color="muted" style={[styles.freqText, { fontSize: 15 * layout.fontScale }]}>
          {isActive ? `${frequency.toFixed(2)} Hz` : '— Hz'}
        </AppText>
        {isActive && targetFrequency > 0 && freqDevHz !== null && (
          <AppText
            variant="caption"
            style={[
              styles.freqDev,
              {
                color: isInTune
                  ? theme.colors.success
                  : parseFloat(freqDevHz) < 0
                    ? theme.colors.accent
                    : theme.colors.error,
              },
            ]}
          >
            {parseFloat(freqDevHz) >= 0 ? '+' : ''}{freqDevHz} Hz
          </AppText>
        )}
      </View>

      {/* Target frequency */}
      {isActive && targetFrequency > 0 && (
        <AppText variant="caption" color="muted" style={styles.targetFreq}>
          Target: {targetFrequency.toFixed(2)} Hz
        </AppText>
      )}

      {/* Confidence indicator */}
      {isActive && (
        <View style={styles.confidenceRow}>
          {Array.from({ length: 5 }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.confidenceDot,
                {
                  backgroundColor: i < confidenceDots
                    ? (isInTune ? theme.colors.success : theme.colors.accent)
                    : theme.colors.border,
                  opacity: i < confidenceDots ? 1 : 0.3,
                },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stringLabel: {
    fontSize: 11,
    marginBottom: 2,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  noteWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glowRing: {
    position: 'absolute',
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  noteName: {
    fontWeight: '300',
    letterSpacing: -2,
  },
  octaveLabel: {
    fontWeight: '300',
    alignSelf: 'flex-end',
  },
  freqRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
    gap: 8,
  },
  freqText: {
    fontVariant: ['tabular-nums'],
  },
  freqDev: {
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  targetFreq: {
    fontSize: 11,
    opacity: 0.5,
    marginTop: 1,
    fontVariant: ['tabular-nums'],
  },
  confidenceRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 8,
  },
  confidenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
