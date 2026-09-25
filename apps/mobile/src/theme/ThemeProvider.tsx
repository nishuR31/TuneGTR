import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useThemeStore } from './themeStore';
import { getClayTheme } from './clay';
import { getGlassTheme } from './glass';
import { Theme, ThemeMode } from './types';
import Animated, { useSharedValue, withTiming, useAnimatedStyle, interpolateColor } from 'react-native-reanimated';

const ThemeContext = createContext<Theme | null>(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { mode: storedMode, base } = useThemeStore();
  const systemColorScheme = useColorScheme();

  // Resolve actual mode (light/dark) handling 'system' preference
  const resolvedMode: ThemeMode = 
    storedMode === 'system' 
      ? (systemColorScheme === 'dark' ? 'dark' : 'light') 
      : storedMode;

  const theme: Theme = useMemo(() => {
    return base === 'clay' ? getClayTheme(resolvedMode) : getGlassTheme(resolvedMode);
  }, [base, resolvedMode]);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};
