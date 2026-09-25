import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppThemeMode, ThemeBase } from './types';

interface ThemeState {
  mode: AppThemeMode;
  base: ThemeBase;
  setMode: (mode: AppThemeMode) => void;
  setBase: (base: ThemeBase) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'system', // uses device system theme
      base: 'clay', // professionally designed claymorphism
      setMode: (mode) => set({ mode }),
      setBase: (base) => set({ base }),
    }),
    {
      name: 'theme-storage', // unique name
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
