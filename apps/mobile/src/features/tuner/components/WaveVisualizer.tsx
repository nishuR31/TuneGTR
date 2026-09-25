import React, { useEffect } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedProps, 
  withTiming, 
  withRepeat,
  Easing,
  interpolate,
  withSpring,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useTunerStore } from '../store/tunerStore';
import { useTheme } from '../../../theme/ThemeProvider';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const NUM_POINTS = 50;
const MAX_HEIGHT = 60;
const MIN_HEIGHT = 2;

/**
 * Audio waveform visualizer.
 * Renders an animated SVG sine-wave pattern that reacts to RMS amplitude.
 */
export const WaveVisualizer: React.FC = () => {
  const { rms, isMicActive, tunerState } = useTunerStore();
  const theme = useTheme();
  const { width: screenWidth } = useWindowDimensions();

  const isActive = isMicActive;
  const isInTune = tunerState === 'in_tune';

  // Phase animation — creates continuous wave motion
  const phase = useSharedValue(0);
  useEffect(() => {
    if (isActive) {
      phase.value = 0;
      phase.value = withRepeat(
        withTiming(2 * Math.PI, { duration: 2000, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      phase.value = withTiming(0, { duration: 500 });
    }
  }, [isActive, phase]);

  // Amplitude envelope — reacts to RMS
  const amplitude = useSharedValue(0);
  useEffect(() => {
    if (isActive) {
      const targetAmp = Math.min(rms * 8, 1);
      amplitude.value = withSpring(targetAmp, { mass: 0.4, damping: 12, stiffness: 120 });
    } else {
      amplitude.value = withTiming(0, { duration: 400 });
    }
  }, [isActive, rms, amplitude]);

  // Wave color based on tuner state
  const waveColor = isInTune 
    ? theme.colors.success
    : isActive 
      ? theme.colors.accent 
      : theme.colors.textMuted;

  const width = Math.min(screenWidth - 48, 400);

  const animatedProps = useAnimatedProps(() => {
    let d = `M 0 ${MAX_HEIGHT / 2}`;
    const step = width / (NUM_POINTS - 1);

    for (let i = 0; i < NUM_POINTS; i++) {
      const x = i * step;
      const barPhase = (i / (NUM_POINTS - 1)) * 2 * Math.PI;

      // Sine wave height — sin(barPhase + phase)
      const sineValue = Math.sin(barPhase * 2 + phase.value);
      // Second harmonic for richness
      const harmonic = Math.sin(4 * barPhase + phase.value * 1.5) * 0.3;
      const combinedWave = (sineValue + harmonic) / 1.3;

      // Window function — taper edges for smooth falloff
      const windowPos = i / (NUM_POINTS - 1);
      const window = Math.sin(windowPos * Math.PI);

      const normalizedHeight = combinedWave * window;
      const yOffset = interpolate(
        normalizedHeight * amplitude.value,
        [-1, 1],
        [-MAX_HEIGHT / 2, MAX_HEIGHT / 2],
      );

      const y = (MAX_HEIGHT / 2) + yOffset;
      d += ` L ${x} ${y}`;
    }
    
    return {
      d,
      strokeWidth: interpolate(amplitude.value, [0, 0.3, 1], [2, 3, 4]),
      opacity: interpolate(amplitude.value, [0, 0.3, 1], [0.3, 0.6, 1]),
    };
  });

  return (
    <View style={[styles.container, { width }]}>
      <Svg width="100%" height={MAX_HEIGHT}>
        <AnimatedPath
          animatedProps={animatedProps}
          stroke={waveColor}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
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
