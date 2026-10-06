import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Clears all stale/build cache keys from AsyncStorage.
 * Called automatically by ErrorBoundary on crash-reset,
 * and available from Settings screen.
 */
export const clearStaleCache = async (): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    // Remove any cache or temp keys that could be stale
    const staleKeys = keys.filter(
      (k) =>
        k.includes("cache") ||
        k.includes("build") ||
        k.includes("metro") ||
        k.includes("expo-") ||
        k.includes("__expo")
    );
    if (staleKeys.length > 0) {
      await AsyncStorage.multiRemove(staleKeys);
    }
  } catch (e) {
    // Silent — never let cache cleanup crash the app
    console.warn("clearStaleCache error:", e);
  }
};
