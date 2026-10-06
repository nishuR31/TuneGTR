import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, Pressable, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const opacity = useSharedValue(1);
  const scale = useSharedValue(0.92);
  const glow = useSharedValue(0.6);

  // Equalizer wave bar heights
  const bar1 = useSharedValue(12);
  const bar2 = useSharedValue(24);
  const bar3 = useSharedValue(36);
  const bar4 = useSharedValue(20);
  const bar5 = useSharedValue(14);

  useEffect(() => {
    // Logo entrance scale
    scale.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });

    // Ambient glow pulse
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800 }),
        withTiming(0.5, { duration: 800 })
      ),
      -1,
      true
    );

    // Audio equalizer bars animation
    const animateBar = (val: any, minH: number, maxH: number, dur: number) => {
      val.value = withRepeat(
        withSequence(
          withTiming(maxH, { duration: dur }),
          withTiming(minH, { duration: dur * 0.9 })
        ),
        -1,
        true
      );
    };

    animateBar(bar1, 8, 28, 380);
    animateBar(bar2, 14, 40, 420);
    animateBar(bar3, 20, 48, 350);
    animateBar(bar4, 12, 34, 450);
    animateBar(bar5, 6, 26, 400);

    // Auto-dismiss after 1.8 seconds
    const timer = setTimeout(() => {
      handleDismiss();
    }, 1800);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    opacity.value = withTiming(0, { duration: 400 }, (finished) => {
      if (finished) {
        runOnJS(onFinish)();
      }
    });
  };

  const rootStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  const bar1Style = useAnimatedStyle(() => ({ height: bar1.value }));
  const bar2Style = useAnimatedStyle(() => ({ height: bar2.value }));
  const bar3Style = useAnimatedStyle(() => ({ height: bar3.value }));
  const bar4Style = useAnimatedStyle(() => ({ height: bar4.value }));
  const bar5Style = useAnimatedStyle(() => ({ height: bar5.value }));

  return (
    <Animated.View style={[styles.container, rootStyle]}>
      <LinearGradient
        colors={['#050811', '#0B1124', '#060A17']}
        style={StyleSheet.absoluteFill}
      />

      <Pressable onPress={handleDismiss} style={styles.pressable}>
        {/* Ambient radial glow */}
        <Animated.View style={[styles.radialGlow, glowStyle]} />

        {/* Logo Card */}
        <Animated.View style={[styles.card, logoStyle]}>
          <View style={styles.imageWrap}>
            <Image
              source={require('../../../assets/icon-dark.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.title}>TuneGTR</Text>
          <Text style={styles.subtitle}>PRECISION ACOUSTIC GUITAR TUNER</Text>

          {/* Equalizer Visualizer */}
          <View style={styles.visualizerRow}>
            <Animated.View style={[styles.bar, bar1Style]} />
            <Animated.View style={[styles.bar, bar2Style]} />
            <Animated.View style={[styles.bar, bar3Style, { backgroundColor: '#10B981' }]} />
            <Animated.View style={[styles.bar, bar4Style]} />
            <Animated.View style={[styles.bar, bar5Style]} />
          </View>

          {/* Engine Calibration Chip */}
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>A440 ACOUSTIC ENGINE READY</Text>
          </View>
        </Animated.View>

        {/* Footer info */}
        <View style={styles.footer}>
          <Text style={styles.tapPrompt}>Tap anywhere to enter</Text>
          <Text style={styles.developerText}>Engineered by nishur31</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#050811',
  },
  pressable: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  radialGlow: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    ...(Platform.OS === 'web' ? { filter: 'blur(70px)' } : {}),
  },
  card: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 28,
    borderRadius: 32,
    backgroundColor: 'rgba(18, 24, 40, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 12,
  },
  imageWrap: {
    width: 104,
    height: 104,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#0B1124',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
    color: '#FFFFFF',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.2,
    color: '#94A3B8',
    marginBottom: 24,
    textAlign: 'center',
  },
  visualizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    marginBottom: 24,
  },
  bar: {
    width: 6,
    borderRadius: 4,
    backgroundColor: '#6366F1',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 99,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.30)',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#10B981',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
    gap: 6,
  },
  tapPrompt: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  developerText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
