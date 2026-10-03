import { ThemeColors, ThemeRadius, ThemeSpacing, ThemeEffects } from './types';

// Claymorphism relies on shadows, not blur or transparency
const radius: ThemeRadius = {
  sm: 10,
  md: 18,
  lg: 26,
  xl: 36,
  round: 999,
};

const spacing: ThemeSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

const effects: ThemeEffects = {
  blur: 0,           // zero blur — clay is opaque
  opacity: 1,
  shadowOpacity: 0.14,
  shadowRadius: 18,
  shadowOffset: { width: 4, height: 6 },
};

/**
 * Soft Clay Light — warm off-white base, periwinkle accents,
 * tactile surfaces that feel pillowy and touchable.
 */
export const clayLightColors: ThemeColors = {
  background: "#F0F2F8",
  surface: "#F7F8FC",
  surfaceRaised: "#EAECF4",

  text: "#252B3A",
  textSecondary: "#6B7491",
  textMuted: "#9BA5BD",

  accent: "#7178D4",
  accentSoft: "#DCDFFE",
  success: "#5BB893",
  successSoft: "#D4EFE3",
  warning: "#D4A24E",
  warningSoft: "#F4E8CA",
  error: "#D47A7A",
  errorSoft: "#F4DADA",

  border: "rgba(113,120,212,0.08)",
  highlight: "rgba(255,255,255,0.92)",
};

/**
 * Soft Clay Dark — deep navy-indigo base, glowing accents.
 */
export const clayDarkColors: ThemeColors = {
  background: "#10131F",
  surface: "#171B2C",
  surfaceRaised: "#1E2336",

  text: "#EEF0FA",
  textSecondary: "#A8B0CC",
  textMuted: "#68738F",

  accent: "#9298FF",
  accentSoft: "#353A72",
  success: "#72C49E",
  successSoft: "#28453A",
  warning: "#D9B468",
  warningSoft: "#483E24",
  error: "#D98080",
  errorSoft: "#4A2B2B",

  border: "rgba(255,255,255,0.04)",
  highlight: "rgba(255,255,255,0.07)",
};

export const getClayTheme = (mode: 'light' | 'dark') => ({
  mode,
  base: 'clay' as const,
  colors: mode === 'light' ? clayLightColors : clayDarkColors,
  radius,
  spacing,
  effects,
});
