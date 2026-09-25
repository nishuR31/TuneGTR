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

const NUM_POINTS = 60; // Increased points for smoother waves
const MAX_HEIGHT = 80; // Increased max height

/**
 * Audio waveform visualizer.
 * Renders an animated SVG sine-wave pattern that reacts to RMS amplitude.
 * Includes 'stroke' impact animation for visual feedback.
 */
export const WaveVisualizer: React.FC = () => {
  const { rms, isMicActive, tunerState } = useTunerStore();
  const theme = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const layout = useLayout();

  const isActive = isMicActive;
  const isInTune = tunerState === 'in_tune';

  // Phase animation — creates continuous wave motion
  const phase = useSharedValue(0);
  useEffect(() => {
    if (isActive) {
      phase.value = 0;
      phase.value = withRepeat(
        withTiming(2 * Math.PI, { duration: 1200, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      phase.value = withTiming(0, { duration: 500 });
    }
  }, [isActive, phase]);

  const previousRms = useRef(0);
  const strokeScale = useSharedValue(1);
  const amplitude = useSharedValue(0);

  // Amplitude envelope & Stroke impulse
  useEffect(() => {
    if (isActive) {
      // Detect sudden string pluck (jump in RMS)
      if (rms - previousRms.current > 0.05) {
        strokeScale.value = 1.15; // Impulse jump
        strokeScale.value = withSpring(1.0, { mass: 0.3, damping: 10, stiffness: 200 });
      }
      
      const targetAmp = Math.min(rms * 12, 1.2); 
      amplitude.value = withSpring(targetAmp, { mass: 0.2, damping: 10, stiffness: 150 });
    } else {
      amplitude.value = withTiming(0, { duration: 400 });
    }
    previousRms.current = rms;
  }, [isActive, rms, amplitude, strokeScale]);

  // Wave color based on tuner state
  const waveColor = isInTune 
    ? theme.colors.success
    : isActive 
      ? theme.colors.accent 
      : theme.colors.textMuted;

  // Responsive width for landscape
  const width = layout.isLandscape 
    ? Math.min(screenWidth * 0.7, 600) 
    : Math.min(screenWidth - 48, 400);

  const animatedProps = useAnimatedProps(() => {
    let d = `M 0 ${MAX_HEIGHT / 2}`;
    const step = width / (NUM_POINTS - 1);

    for (let i = 0; i < NUM_POINTS; i++) {
      const x = i * step;
      const barPhase = (i / (NUM_POINTS - 1)) * 2 * Math.PI;

      // Sine wave height + multiple harmonics
      const sineValue = Math.sin(barPhase * 2 + phase.value);
      const harmonic1 = Math.sin(4 * barPhase + phase.value * 1.5) * 0.4;
      const harmonic2 = Math.sin(6 * barPhase + phase.value * 2.0) * 0.2;
      const combinedWave = (sineValue + harmonic1 + harmonic2) / 1.6;

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
      strokeWidth: interpolate(amplitude.value, [0, 0.5, 1.2], [2, 3.5, 5]),
      opacity: interpolate(amplitude.value, [0, 0.5, 1.2], [0.3, 0.7, 1]),
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
