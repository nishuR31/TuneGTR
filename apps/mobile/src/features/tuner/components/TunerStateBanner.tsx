import React from "react";
import { View, StyleSheet } from "react-native";
import { useTunerStore, TunerState } from "../store/tunerStore";
import { useTheme } from "../../../theme/ThemeProvider";
import { AppText } from "../../../components/common/AppText";
import Feather from '@expo/vector-icons/Feather';

/**
 * Displays semantic tuning direction — tells the user
 * whether to tune UP (tighten) or DOWN (loosen) with
 * clear arrow icons + descriptive text.
 */
export const TunerStateBanner: React.FC = () => {
  const { tunerState, cents, detectedStringNote, targetFrequency, frequency } = useTunerStore();
  const theme = useTheme();

  const getConfig = () => {
    switch (tunerState) {
      case 'in_tune': 
        return { 
          label: "In Tune ✓", 
          direction: "",
          instruction: "Perfect! Move to the next string.",
          color: theme.colors.success,
          icon: 'check-circle' as const,
          iconColor: theme.colors.success,
        };
      case 'flat': 
      case 'sharp':
      case 'signal_detected': {
        const clampedCents = Math.max(-50, Math.min(50, cents));
        
        if (clampedCents < -20) {
          return { 
            label: "Flat", 
            direction: "↑ TUNE UP",
            instruction: "Tighten the string (turn peg away from you)",
            color: theme.colors.accent, 
            icon: 'arrow-up' as const,
            iconColor: theme.colors.accent,
          };
        }
        if (clampedCents > 20) {
          return { 
            label: "Sharp", 
            direction: "↓ TUNE DOWN",
            instruction: "Loosen the string (turn peg toward you)",
            color: theme.colors.error,
            icon: 'arrow-down' as const,
            iconColor: theme.colors.error,
          };
        }
        if (clampedCents < 0) {
          return { 
            label: "Slightly Flat", 
            direction: "↑ Tune up a tiny bit",
            instruction: "Almost there — tighten gently",
            color: theme.colors.warning,
            icon: 'chevron-up' as const,
            iconColor: theme.colors.warning,
          };
        }
        return { 
          label: "Slightly Sharp", 
          direction: "↓ Tune down a tiny bit",
          instruction: "Almost there — loosen gently",
          color: theme.colors.warning,
          icon: 'chevron-down' as const,
          iconColor: theme.colors.warning,
        };
      }
      case 'unstable': 
        return { 
          label: "Unstable Signal", 
          direction: "",
          instruction: "Pluck the string again, closer to the mic",
          color: theme.colors.textMuted,
          icon: 'alert-circle' as const,
          iconColor: theme.colors.textMuted,
        };
      default: 
        return { label: "", direction: "", instruction: "", color: "transparent", icon: 'info' as const, iconColor: "transparent" };
    }
  };

  const config = getConfig();

  if (!config.label) return null;

  return (
    <View style={styles.container}>
      {/* Direction arrow + label row */}
      <View style={styles.directionRow}>
        <Feather name={config.icon} size={20} color={config.iconColor} style={{ marginRight: 6 }} />
        <AppText variant="body" style={{ color: config.color, fontWeight: '700', fontSize: 17 }}>
          {config.direction || config.label}
        </AppText>
      </View>

      {/* Instruction text */}
      <AppText variant="caption" color="muted" style={{ fontSize: 12, marginTop: 2, textAlign: 'center' }}>
        {config.instruction}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    paddingVertical: 4,
  },
  directionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
