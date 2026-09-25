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

// Light mode glass is extremely rare but must be supported
export const glassLightColors: ThemeColors = {
  background: "#F8FAFC",
  surface: "rgba(0,0,0,0.04)",
  surfaceRaised: "rgba(0,0,0,0.08)",
  
  text: "#0F172A",
  textSecondary: "#334155",
  textMuted: "#64748B",
  
  accent: "#6366F1",
  accentSoft: "rgba(99,102,241,0.15)",
  success: "#10B981",
  successSoft: "rgba(16,185,129,0.15)",
  warning: "#F59E0B",
  warningSoft: "rgba(245,158,11,0.15)",
  error: "#EF4444",
  errorSoft: "rgba(239,68,68,0.15)",
  
  border: "rgba(0,0,0,0.08)",
  highlight: "rgba(255,255,255,0.6)",
};

export const getGlassTheme = (mode: 'light' | 'dark') => ({
  mode,
  base: 'glass' as const,
  colors: mode === 'light' ? glassLightColors : glassDarkColors,
  radius,
  spacing,
  effects,
});
