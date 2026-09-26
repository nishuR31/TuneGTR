import './global.css';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { MainNavigator } from './src/navigation/MainNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/theme/ThemeProvider';
import { Toaster } from 'sonner-native';
import { ErrorBoundary } from './src/components/common/ErrorBoundary';

/**
 * TunerGTR — Main Application
 * Wrapped in ThemeProvider for contextual design tokens.
 * ErrorBoundary catches and recovers from render errors with cache cleanup.
 */
export default function App() {
  // Dynamically update the web favicon based on system theme
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const matcher = window.matchMedia('(prefers-color-scheme: dark)');

      const updateFavicon = (isDark: boolean) => {
        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = isDark ? '/favicon-dark.png' : '/favicon-light.png';
      };

      updateFavicon(matcher.matches);

      const listener = (e: MediaQueryListEvent) => updateFavicon(e.matches);
      matcher.addEventListener('change', listener);
      return () => matcher.removeEventListener('change', listener);
    }
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <MainNavigator />
          <Toaster />
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
