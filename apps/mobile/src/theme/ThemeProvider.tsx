import React, { createContext, useContext, useMemo } from 'react';
import { getGlassTheme } from './glass';
import { Theme, ThemeMode } from './types';

const ThemeContext = createContext<Theme | null>(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

/**
 * Full claymorphism theme provider.
 * Soft clay palette: warm whites, tactile shadows, zero blur.
 */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // TuneGTR is intentionally dark-only. The tuner depends on stable contrast
  // for the meter/status colors and the product icon is the dark asset.
  const resolvedMode: ThemeMode = 'dark';

  const theme: Theme = useMemo(() => getGlassTheme(resolvedMode), []);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};
