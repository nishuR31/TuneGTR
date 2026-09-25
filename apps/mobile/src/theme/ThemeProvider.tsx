import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { getClayTheme } from './clay';
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
  const systemColorScheme = useColorScheme();
  const resolvedMode: ThemeMode = systemColorScheme === 'dark' ? 'dark' : 'light';

  const theme: Theme = useMemo(() => getClayTheme(resolvedMode), [resolvedMode]);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};
