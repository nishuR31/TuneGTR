import { ThemeColors, ThemeRadius, ThemeSpacing, ThemeEffects } from './types';

// Shared base measurements
const radius: ThemeRadius = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
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

// Claymorphism relies on shadows, not heavy borders or blur
const effects: ThemeEffects = {
  blur: 0,
  opacity: 1,
  shadowOpacity: 0.25,
  shadowRadius: 16,
  shadowOffset: { width: 4, height: 4 },
};

// Colors based on Soft Clay Specification
export const clayLightColors: ThemeColors = {
  background: "#EEF1F7",
  surface: "#F4F6FA",
  surfaceRaised: "#E8ECF3",
  
  text: "#252B3A",
  textSecondary: "#727B90",
  textMuted: "#9AA3B5",
  
  accent: "#7C83D9",
  accentSoft: "#D9DCFA",
  success: "#70B996",
  successSoft: "#D8EFE2",
  warning: "#D5A85C",
  warningSoft: "#F3E7C8",
  error: "#D98282",
  errorSoft: "#F3D9D9",
  
  border: "rgba(0,0,0,0.03)",
  highlight: "rgba(255,255,255,0.8)",
};

export const clayDarkColors: ThemeColors = {
  background: "#111522",
  surface: "#181D2C",
  surfaceRaised: "#202638",
  
  text: "#F1F3FA",
  textSecondary: "#AAB2C5",
  textMuted: "#70798F",
  
  accent: "#969BFF",
  accentSoft: "#363B6A",
  success: "#78C7A0",
  successSoft: "#294A3B",
  warning: "#D9B76D",
  warningSoft: "#4A4027",
  error: "#DD8585",
  errorSoft: "#4A2E32",
  
  border: "rgba(255,255,255,0.03)",
  highlight: "rgba(255,255,255,0.06)",
};

export const getClayTheme = (mode: 'light' | 'dark') => ({
  mode,
  base: 'clay' as const,
  colors: mode === 'light' ? clayLightColors : clayDarkColors,
  radius,
  spacing,
  effects,
});
