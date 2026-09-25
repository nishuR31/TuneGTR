import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMemo } from "react";

export type ScreenCategory = "compact" | "medium" | "expanded";

export interface LayoutMetrics {
  /** Screen width in dp */
  width: number;
  /** Screen height in dp */
  height: number;
  /** Usable height after safe area insets */
  usableHeight: number;
  /** Device category based on width */
  category: ScreenCategory;
  /** True if width < 380dp */
  isCompact: boolean;
  /** True if width >= 600dp (tablet) */
  isTablet: boolean;
  /** True if height < 680dp (very short screens) */
  isShortScreen: boolean;
  /** True if width > height (landscape orientation) */
  isLandscape: boolean;
  /** Scale factor for font sizes (0.85 – 1.0) */
  fontScale: number;
  /** Scale factor for spacing (0.75 – 1.0) */
  spacingScale: number;
  /** Maximum content width (caps at 480dp for tablets) */
  contentWidth: number;
  /** Safe area insets */
  insets: { top: number; bottom: number; left: number; right: number };
}

/**
 * Responsive layout hook.
 * Provides scale factors and breakpoint flags for adaptive UI.
 * All tuner screen components should use this instead of
 * hardcoded dimensions.
 */
export const useLayout = (): LayoutMetrics => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return useMemo(() => {
    const usableHeight = height - insets.top - insets.bottom;
    const isCompact = width < 380;
    const isTablet = width >= 600;
    const isShortScreen = usableHeight < 580;
    const isLandscape = width > height;

    let category: ScreenCategory;
    if (width < 380) category = "compact";
    else if (width >= 600) category = "expanded";
    else category = "medium";

    // Font scale: compact screens get 85%, tablets stay at 100%
    const fontScale = isCompact ? 0.85 : 1.0;

    // Spacing scale: short screens get tighter spacing
    const spacingScale = isShortScreen ? 0.7 : isCompact ? 0.85 : 1.0;

    // Content width: cap at 480dp on tablets for optimal reading
    const contentWidth = Math.min(width, 480);

    return {
      width,
      height,
      usableHeight,
      category,
      isCompact,
      isTablet,
      isShortScreen,
      isLandscape,
      fontScale,
      spacingScale,
      contentWidth,
      insets,
    };
  }, [width, height, insets.top, insets.bottom, insets.left, insets.right]);
};
