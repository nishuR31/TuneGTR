import './global.css';
import React, { useState } from 'react';
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
