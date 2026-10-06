import { ThemeColors, ThemeRadius, ThemeSpacing, ThemeEffects } from './types';

// Shared base measurements with rounded aesthetic
const radius: ThemeRadius = {
  sm: 10,
  md: 18,
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
  blur: 24,
  opacity: 1,
  shadowOpacity: 0.18,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
};

// Premium Obsidian Dark Theme
export const glassDarkColors: ThemeColors = {
  background: "#070A14",
  surface: "rgba(18, 24, 40, 0.72)",
  surfaceRaised: "rgba(28, 37, 60, 0.85)",
  
  text: "#FFFFFF",
  textSecondary: "#E2E8F0",
  textMuted: "#818CF8",
  
  accent: "#6366F1", // Vibrant Indigo
  accentSoft: "rgba(99, 102, 241, 0.20)",
  success: "#10B981", // Emerald Green
  successSoft: "rgba(16, 185, 129, 0.20)",
  warning: "#F59E0B", // Warm Amber
  warningSoft: "rgba(245, 158, 11, 0.20)",
  error: "#EF4444", // Crimson Rose
  errorSoft: "rgba(239, 68, 68, 0.20)",
  
  border: "rgba(255, 255, 255, 0.16)",
  highlight: "rgba(255, 255, 255, 0.20)",
};

// Light mode glass
export const glassLightColors: ThemeColors = {
  background: "#F8FAFC",
  surface: "rgba(255, 255, 255, 0.82)",
  surfaceRaised: "rgba(255, 255, 255, 0.95)",

  text: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#64748B",

  accent: "#4F46E5",
  accentSoft: "rgba(79, 70, 229, 0.14)",
  success: "#059669",
  successSoft: "rgba(5, 150, 105, 0.14)",
  warning: "#D97706",
  warningSoft: "rgba(217, 119, 6, 0.14)",
  error: "#DC2626",
  errorSoft: "rgba(220, 38, 38, 0.14)",

  border: "rgba(79, 70, 229, 0.14)",
  highlight: "rgba(255, 255, 255, 0.95)",
};

export const getGlassTheme = (mode: 'light' | 'dark') => ({
  mode,
  base: 'glass' as const,
  colors: mode === 'light' ? glassLightColors : glassDarkColors,
  radius,
  spacing,
  effects,
});
