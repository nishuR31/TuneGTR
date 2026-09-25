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

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();

  // Resolve actual mode (light/dark) handling 'system' preference
  const resolvedMode: ThemeMode = systemColorScheme === 'dark' ? 'dark' : 'light';

  const theme: Theme = useMemo(() => {
    return getClayTheme(resolvedMode);
  }, [resolvedMode]);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};
