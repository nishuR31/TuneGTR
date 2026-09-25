export type ThemeMode = 'light' | 'dark';
export type ThemeBase = 'clay' | 'glass';
export type AppThemeMode = ThemeMode | 'system';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceRaised: string;

  text: string;
  textSecondary: string;
  textMuted: string;

  accent: string;
  accentSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  error: string;
  errorSoft: string;

  border: string;
  highlight: string;
}

export interface ThemeRadius {
  sm: number;
  md: number;
  lg: number;
  xl: number;
  round: number;
}

export interface ThemeSpacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

export interface ThemeEffects {
  blur: number;
  opacity: number;
  shadowOpacity: number;
  shadowRadius: number;
  shadowOffset: { width: number; height: number };
}

export interface Theme {
  mode: ThemeMode;
  base: ThemeBase;
  colors: ThemeColors;
  radius: ThemeRadius;
  spacing: ThemeSpacing;
  effects: ThemeEffects;
}
