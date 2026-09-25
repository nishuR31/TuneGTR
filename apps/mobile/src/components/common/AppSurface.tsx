import React from 'react';
import { View, ViewProps, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import Animated from 'react-native-reanimated';

export interface AppSurfaceProps extends ViewProps {
  level?: 'base' | 'elevated' | 'raised';
  isCard?: boolean;
  animated?: boolean;
}

/**
 * Themeable surface component.
 * 
 * Renders with claymorphism or glass style depending on theme.
 * 
 * Size optimization: Removed expo-blur dependency (~2-3MB savings).
 * Glass theme now uses opacity-layered backgrounds instead of native blur,
 * which is visually similar and much lighter.
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
  
  // Resolve background and border based on theme base & level
  const backgroundColor = (level === 'elevated' || level === 'raised') ? theme.colors.surfaceRaised : theme.colors.surface;
  const borderColor = theme.colors.border;
  
  // Base style configuration
  const baseStyle: StyleProp<ViewStyle> = {
    backgroundColor,
    borderColor,
    borderWidth: 1,
    borderRadius: isCard ? theme.radius.lg : theme.radius.md,
  };

  // Add clay specific shadows if theme is clay
  if (theme.base === 'clay') {
    const isRaised = level === 'elevated' || level === 'raised';
    const shadowSize = isRaised ? 20 : 12;
    const innerShadowSize = isRaised ? 6 : 4;
    
    const ambientShadow = theme.mode === 'light' 
      ? `rgba(37, 43, 58, 0.15)`
      : `rgba(0, 0, 0, 0.4)`;
      
    const highlightShadow = theme.mode === 'light'
      ? `rgba(255, 255, 255, 0.8)`
      : `rgba(255, 255, 255, 0.08)`;

    Object.assign(baseStyle, {
      elevation: isRaised ? 8 : 4,
      boxShadow: `inset 1px 1px ${innerShadowSize}px ${highlightShadow}, inset -1px -1px ${innerShadowSize}px rgba(0, 0, 0, 0.05), ${theme.effects.shadowOffset.width}px ${theme.effects.shadowOffset.height}px ${shadowSize}px ${ambientShadow}`
    } as any);
  }

  // Handle Glass mode — opacity-based approach (no expo-blur needed)
  if (theme.base === 'glass') {
    const isRaised = level === 'elevated' || level === 'raised';
    const glassOpacity = isRaised ? 0.12 : 0.08;
    const glassBorderOpacity = isRaised ? 0.16 : 0.10;
    const glassHighlight = theme.mode === 'dark' 
      ? `rgba(255,255,255,${glassBorderOpacity})`
      : `rgba(0,0,0,${glassBorderOpacity * 0.5})`;

    return (
      <View 
        style={[
          baseStyle, 
          { 
            backgroundColor: theme.mode === 'dark' 
              ? `rgba(255,255,255,${glassOpacity})` 
              : `rgba(0,0,0,${glassOpacity * 0.5})`,
            borderColor: glassHighlight,
            overflow: 'hidden',
          }, 
          style,
        ]} 
        {...props}
      >
        {children}
      </View>
    );
  }

  // Clay or fallback mode
  if (animated) {
    return (
      <Animated.View style={[baseStyle, style]} {...props}>
        {children}
      </Animated.View>
    );
  }

  return (
    <View style={[baseStyle, style]} {...props}>
      {children}
    </View>
  );
});
