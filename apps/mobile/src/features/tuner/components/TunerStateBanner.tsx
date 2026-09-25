import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { useTunerStore, TunerState } from "../store/tunerStore";
import { useTheme } from "../../../theme/ThemeProvider";
import { AppText } from "../../../components/common/AppText";
import { AppSurface } from "../../../components/common/AppSurface";
import Feather from '@expo/vector-icons/Feather';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";

/**
 * State banner — semantic tuning direction.
 * Tells the user whether to tune UP or DOWN with
 * clear icons + precise cent values.
 */
export const TunerStateBanner: React.FC = () => {
  const { tunerState, cents, detectedStringNote, targetFrequency, frequency } = useTunerStore();
  const theme = useTheme();

  const scale = useSharedValue(0.92);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { mass: 0.3, damping: 12, stiffness: 180 });
    opacity.value = withTiming(1, { duration: 200 });
    return () => {
      scale.value = 0.92;
      opacity.value = 0;
    };
  }, [tunerState]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const getConfig = () => {
    const clampedCents = Math.max(-50, Math.min(50, cents));
    const absCents = Math.abs(clampedCents);

    switch (tunerState) {
      case 'in_tune':
        return {
          label: "In Tune",
          sub: "Move to next string",
          color: theme.colors.success,
          bg: theme.colors.successSoft,
          icon: 'check-circle' as const,
        };

      case 'flat':
      case 'sharp':
      case 'signal_detected': {
        if (absCents <= 2) {
          return {
            label: "Nearly In Tune",
            sub: "Fine-tune very carefully",
            color: theme.colors.accent,
            bg: theme.colors.accentSoft,
            icon: 'target' as const,
          };
        }
        if (clampedCents < -20) {
          return {
            label: `Tune Up (${Math.abs(clampedCents).toFixed(0)}¢ flat)`,
            sub: "Tighten the string — turn peg away from you",
            color: theme.colors.accent,
            bg: theme.colors.accentSoft,
            icon: 'arrow-up' as const,
          };
        }
        if (clampedCents > 20) {
          return {
            label: `Tune Down (${clampedCents.toFixed(0)}¢ sharp)`,
            sub: "Loosen the string — turn peg toward you",
            color: theme.colors.error,
            bg: theme.colors.errorSoft,
            icon: 'arrow-down' as const,
          };
        }
        if (clampedCents < 0) {
          return {
            label: `Slightly Flat (${Math.abs(clampedCents).toFixed(1)}¢)`,
            sub: "Tighten gently — almost there",
            color: theme.colors.warning,
            bg: theme.colors.warningSoft,
            icon: 'chevron-up' as const,
          };
        }
        return {
          label: `Slightly Sharp (+${clampedCents.toFixed(1)}¢)`,
          sub: "Loosen gently — almost there",
          color: theme.colors.warning,
          bg: theme.colors.warningSoft,
          icon: 'chevron-down' as const,
        };
      }

      case 'unstable':
        return {
          label: "Unstable Signal",
          sub: "Pluck the string again, closer to the mic",
          color: theme.colors.textMuted,
          bg: theme.colors.surfaceRaised,
          icon: 'alert-circle' as const,
        };

      default:
        return null;
    }
  };

  const config = getConfig();
  if (!config) return null;

  return (
    <Animated.View style={animStyle}>
      <AppSurface
        level="raised"
        style={[
          styles.surface,
          { backgroundColor: config.bg },
        ]}
      >
        <View style={styles.row}>
          <Feather name={config.icon} size={18} color={config.color} />
          <AppText
            variant="heading"
            style={[styles.label, { color: config.color }]}
          >
            {config.label}
          </AppText>
        </View>
        <AppText
          variant="caption"
          color="secondary"
          style={styles.sub}
        >
          {config.sub}
        </AppText>
      </AppSurface>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  surface: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  label: {
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  sub: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    opacity: 0.85,
  },
});
