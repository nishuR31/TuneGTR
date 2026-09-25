import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
  interpolate,
  withSpring,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useTunerStore } from '../store/tunerStore';
import { useTheme } from '../../../theme/ThemeProvider';
import { useLayout } from '../../../hooks/useLayout';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Reduced points: snappier compute, still smooth
const NUM_POINTS = 40;
const MAX_HEIGHT = 72;

/**
 * Audio waveform visualizer — zero-stutter, always-fresh.
 * Uses Reanimated worklets so all animation math runs on the UI thread.
 * Amplitude tracks RMS directly with no intermediate caching.
 */
export const WaveVisualizer: React.FC = () => {
  const rms = useTunerStore((s) => s.rms);
  const isMicActive = useTunerStore((s) => s.isMicActive);
  const tunerState = useTunerStore((s) => s.tunerState);
  const theme = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const layout = useLayout();

  const isActive = isMicActive;
  const isInTune = tunerState === 'in_tune';

  // Phase animation — smooth continuous wave
  const phase = useSharedValue(0);
  useEffect(() => {
    if (isActive) {
      phase.value = withRepeat(
        withTiming(2 * Math.PI, { duration: 900, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      phase.value = withTiming(0, { duration: 300 });
    }
  }, [isActive, phase]);

  const previousRms = useRef(0);
  const strokeScale = useSharedValue(1);
  const amplitude = useSharedValue(0);

  // Amplitude envelope & stroke impulse — instant response, no lag
  useEffect(() => {
    if (isActive) {
      // String pluck detection
      const rmsDelta = rms - previousRms.current;
      if (rmsDelta > 0.03) {
        strokeScale.value = 1.18;
        strokeScale.value = withSpring(1.0, { mass: 0.2, damping: 8, stiffness: 300 });
        // Haptic on detected pluck handled by useTuner, not here
      }
      // Direct amplitude — no smoothing lag on the way up, gentle on the way down
      const targetAmp = Math.min(rms * 14, 1.3);
      amplitude.value = targetAmp > amplitude.value
        ? targetAmp  // instant on attack
        : withTiming(targetAmp, { duration: 120 }); // gentle on decay
    } else {
      amplitude.value = withTiming(0, { duration: 200 });
      strokeScale.value = withTiming(1, { duration: 150 });
    }
    previousRms.current = rms;
  }, [isActive, rms, amplitude, strokeScale]);

  const waveColor = isInTune
    ? theme.colors.success
    : isActive
      ? theme.colors.accent
      : theme.colors.textMuted;

  const width = layout.isLandscape
    ? Math.min(screenWidth * 0.7, 560)
    : Math.min(screenWidth - 48, 380);

  const animatedProps = useAnimatedProps(() => {
    let d = `M 0 ${MAX_HEIGHT / 2}`;
    const step = width / (NUM_POINTS - 1);

    for (let i = 0; i < NUM_POINTS; i++) {
      const x = i * step;
      const barPhase = (i / (NUM_POINTS - 1)) * 2 * Math.PI;

      const sine = Math.sin(barPhase * 2 + phase.value);
      const h1   = Math.sin(4 * barPhase + phase.value * 1.5) * 0.35;
      const combined = (sine + h1) / 1.35;

      // Hanning window for smooth edge taper
      const windowPos = i / (NUM_POINTS - 1);
      const win = 0.5 * (1 - Math.cos(2 * Math.PI * windowPos));

      const yOffset = interpolate(
        combined * win * amplitude.value,
        [-1, 1],
        [-MAX_HEIGHT / 2, MAX_HEIGHT / 2],
      );

      d += ` L ${x} ${MAX_HEIGHT / 2 + yOffset}`;
    }

    return {
      d,
      strokeWidth: interpolate(amplitude.value, [0, 0.5, 1.3], [1.5, 3, 4.5]),
      opacity: interpolate(amplitude.value, [0, 0.4, 1.3], [0.25, 0.75, 1]),
    };
  });

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: strokeScale.value }],
  }));

  return (
    <Animated.View style={[styles.container, { width }, containerStyle]}>
      <Svg width="100%" height={MAX_HEIGHT}>
        <AnimatedPath
          animatedProps={animatedProps}
          stroke={waveColor}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    height: MAX_HEIGHT + 8,
    overflow: 'hidden',
  },
});
