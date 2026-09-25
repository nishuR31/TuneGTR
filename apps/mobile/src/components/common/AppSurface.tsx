import React from 'react';
import { View, ViewProps, StyleProp, ViewStyle, Platform } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import Animated from 'react-native-reanimated';

export interface AppSurfaceProps extends ViewProps {
  level?: 'base' | 'elevated' | 'raised';
  isCard?: boolean;
  animated?: boolean;
}

/**
 * Pure Claymorphism surface component.
 *
 * Tactile soft 3D feel: outer ambient shadow + inner specular highlight.
 * No blur, no glass — opaque, warm, and fast.
 */
export const AppSurface: React.FC<AppSurfaceProps> = React.memo(({
  level = 'base',
  isCard = false,
  animated = false,
  style,
  children,
  ...props
}) => {
  const theme = useTheme();

  const isRaised = level === 'elevated' || level === 'raised';
  const backgroundColor = isRaised ? theme.colors.surfaceRaised : theme.colors.surface;
  const borderColor = theme.colors.border;

  const shadowSize = isRaised ? 18 : 10;
  const innerShadowSize = isRaised ? 5 : 3;

  const ambientShadow = theme.mode === 'light'
    ? 'rgba(37, 43, 58, 0.10)'
    : 'rgba(0, 0, 0, 0.45)';

  const highlightShadow = theme.mode === 'light'
    ? 'rgba(255, 255, 255, 0.90)'
    : 'rgba(255, 255, 255, 0.06)';

  const clayStyle: StyleProp<ViewStyle> = {
    backgroundColor,
    borderColor,
    borderWidth: 1,
    borderRadius: isCard ? theme.radius.lg : theme.radius.md,
    // Native shadow (iOS / Android elevation)
    elevation: isRaised ? 6 : 3,
    shadowColor: theme.mode === 'light' ? '#252B3A' : '#000000',
    shadowOffset: { width: 0, height: isRaised ? 5 : 3 },
    shadowOpacity: theme.mode === 'light' ? 0.09 : 0.38,
    shadowRadius: isRaised ? 14 : 7,
    // Web: full claymorphism inset + drop shadow
    ...(Platform.OS === 'web' ? {
      boxShadow: [
        `inset 1px 1px ${innerShadowSize}px ${highlightShadow}`,
        `inset -1px -1px ${innerShadowSize}px rgba(0,0,0,0.04)`,
        `4px ${isRaised ? 6 : 4}px ${shadowSize}px ${ambientShadow}`,
      ].join(', '),
    } : {}),
  };

  if (animated) {
    return (
      <Animated.View style={[clayStyle, style]} {...props}>
        {children}
      </Animated.View>
    );
  }

  return (
    <View style={[clayStyle, style]} {...props}>
      {children}
    </View>
  );
});
