import './global.css';
import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { MainNavigator } from './src/navigation/MainNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/theme/ThemeProvider';
import { Toaster } from 'sonner-native';
import { ErrorBoundary } from './src/components/common/ErrorBoundary';
import { SplashScreen } from './src/components/common/SplashScreen';

/**
 * TuneGTR — Main Application
 * Features ThemeProvider, ErrorBoundary, animated SplashScreen, and Sonner toast system.
 */
export default function App() {
  const [showSplash, setShowSplash] = useState(true);

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
          {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
