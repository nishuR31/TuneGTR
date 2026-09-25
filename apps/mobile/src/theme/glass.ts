import { ThemeColors, ThemeRadius, ThemeSpacing, ThemeEffects } from './types';

// Shared base measurements (same as clay for consistency)
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

// Glassmorphism relies on blur, translucent surfaces, and subtle highlights
const effects: ThemeEffects = {
  blur: 20, // Moderate blur
  opacity: 1, // Will be used on glass backgrounds in AppSurface
  shadowOpacity: 0.1, // Very subtle shadow
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
};

// Colors based on Requirement 18 (Liquid Glass)
export const glassDarkColors: ThemeColors = {
  background: "#090E1A",
  surface: "rgba(255,255,255,0.06)",
  surfaceRaised: "rgba(255,255,255,0.10)",
  
  text: "#F8FAFC",
  textSecondary: "#CBD5E1",
  textMuted: "#94A3B8",
  
  accent: "#8796E8",
  accentSoft: "rgba(135,150,232,0.2)",
  success: "#78D6A5",
  successSoft: "rgba(120,214,165,0.2)",
  warning: "#D3AA5D", // Matching warm tone
  warningSoft: "rgba(211,170,93,0.2)",
  error: "#D77C7C",
  errorSoft: "rgba(215,124,124,0.2)",
  
  border: "rgba(255,255,255,0.12)",
  highlight: "rgba(255,255,255,0.16)",
};

// Light mode glass: pure soft white with translucent gloss surfaces
export const glassLightColors: ThemeColors = {
  background: "#FFFFFF",
  surface: "rgba(255,255,255,0.72)",
  surfaceRaised: "rgba(255,255,255,0.90)",

  text: "#1A1A2E",
  textSecondary: "#4A4E69",
  textMuted: "#8E9AAF",

  accent: "#5C6BC0",
  accentSoft: "rgba(92,107,192,0.14)",
  success: "#2EB87E",
  successSoft: "rgba(46,184,126,0.14)",
  warning: "#E8A838",
  warningSoft: "rgba(232,168,56,0.14)",
  error: "#E05260",
  errorSoft: "rgba(224,82,96,0.14)",

  border: "rgba(92,107,192,0.15)",
  highlight: "rgba(255,255,255,0.9)",
};

export const getGlassTheme = (mode: 'light' | 'dark') => ({
  mode,
  base: 'glass' as const,
  colors: mode === 'light' ? glassLightColors : glassDarkColors,
  radius,
  spacing,
  effects,
});
