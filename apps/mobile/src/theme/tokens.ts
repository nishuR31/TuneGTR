import { StyleSheet } from "react-native";

// ─── Design Tokens (Section 16 of design plan) ─────────────────────────────

export const colors = {
  // Backgrounds
  background: "#0F1023",
  surface: "#1A1B2E",
  surfaceElevated: "#242640",
  surfacePressed: "#1E1F35",

  // Text
  textPrimary: "#FFFFFF",
  textSecondary: "#A0A3BD",
  textTertiary: "#6B6E8A",

  // Borders
  border: "rgba(255, 255, 255, 0.06)",
  borderLight: "rgba(255, 255, 255, 0.10)",

  // Accent
  accent: "#7B61FF",
  accentSoft: "rgba(123, 97, 255, 0.15)",

  // Tuner states
  inTune: "#00E676",
  inTuneSoft: "rgba(0, 230, 118, 0.12)",
  flat: "#FF9100",
  flatSoft: "rgba(255, 145, 0, 0.12)",
  sharp: "#FF5252",
  sharpSoft: "rgba(255, 82, 82, 0.12)",
  noSignal: "#6B6E8A",

  // Claymorphism
  clayHighlight: "rgba(255, 255, 255, 0.07)",
  clayShadowDark: "rgba(0, 0, 0, 0.40)",
  clayShadowLight: "rgba(255, 255, 255, 0.03)",

  // Mic indicator
  micActive: "#00E676",
  micInactive: "#6B6E8A",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  round: 999,
} as const;

export const typography = {
  noteDisplay: {
    fontSize: 96,
    fontWeight: "700" as const,
    letterSpacing: -2,
  },
  centsDisplay: {
    fontSize: 28,
    fontWeight: "600" as const,
  },
  frequencyDisplay: {
    fontSize: 18,
    fontWeight: "400" as const,
  },
  heading: {
    fontSize: 20,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
  },
  caption: {
    fontSize: 13,
    fontWeight: "500" as const,
    letterSpacing: 1.5,
  },
  label: {
    fontSize: 14,
    fontWeight: "500" as const,
  },
} as const;

// ─── Claymorphism Shadow Helper ─────────────────────────────────────────────

/**
 * Claymorphism: soft tactile surfaces with controlled elevation.
 * Per design plan §15: "large but controlled corner radii, subtle elevation,
 * high text contrast, strong spacing rhythm, restrained highlights"
 */
export const claySurface = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.clayHighlight,
    boxShadow: "inset 2px 2px 4px rgba(255, 255, 255, 0.07), inset -2px -2px 4px rgba(0, 0, 0, 0.40), 4px 4px 12px rgba(0, 0, 0, 0.25)",
  },
  elevated: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.clayHighlight,
    boxShadow: "inset 2px 2px 4px rgba(255, 255, 255, 0.07), inset -2px -2px 4px rgba(0, 0, 0, 0.40), 8px 8px 20px rgba(0, 0, 0, 0.35)",
  },
  pressed: {
    backgroundColor: colors.surfacePressed,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.03)",
    boxShadow: "inset 2px 2px 6px rgba(0, 0, 0, 0.50), inset -2px -2px 6px rgba(255, 255, 255, 0.03)",
  },
});
