import React from 'react';
import { View, ViewProps, StyleSheet, StyleProp, ViewStyle, Platform } from 'react-native';
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
  
  const isRaised = level === 'elevated' || level === 'raised';
  const backgroundColor = isRaised ? theme.colors.surfaceRaised : theme.colors.surface;
  const borderColor = theme.colors.border;
  
  // Base style configuration
  const baseStyle: StyleProp<ViewStyle> = {
    backgroundColor,
    borderColor,
    borderWidth: 1,
    borderRadius: isCard ? theme.radius.lg : theme.radius.md,
  };

  // Claymorphism: tactile soft 3D feel with outer elevation and inner specular highlights
  if (theme.base === 'clay') {
    const shadowSize = isRaised ? 20 : 12;
    const innerShadowSize = isRaised ? 6 : 4;
    
    const ambientShadow = theme.mode === 'light' 
      ? `rgba(37, 43, 58, 0.12)`
      : `rgba(0, 0, 0, 0.45)`;
      
    const highlightShadow = theme.mode === 'light'
      ? `rgba(255, 255, 255, 0.85)`
      : `rgba(255, 255, 255, 0.08)`;

    Object.assign(baseStyle, {
      elevation: isRaised ? 6 : 3,
      shadowColor: theme.mode === 'light' ? '#252B3A' : '#000000',
      shadowOffset: { width: 0, height: isRaised ? 4 : 2 },
      shadowOpacity: theme.mode === 'light' ? 0.08 : 0.35,
      shadowRadius: isRaised ? 12 : 6,
      ...(Platform.OS === 'web' ? {
        boxShadow: `inset 1px 1px ${innerShadowSize}px ${highlightShadow}, inset -1px -1px ${innerShadowSize}px rgba(0, 0, 0, 0.05), ${theme.effects.shadowOffset.width}px ${theme.effects.shadowOffset.height}px ${shadowSize}px ${ambientShadow}`
      } : {})
    });
  }

  // Liquid Glass: translucent sheen, blurred backdrop effect, and specular rim borders
  if (theme.base === 'glass') {
    const glassOpacity = isRaised ? 0.15 : 0.08;
    const glassBorderOpacity = isRaised ? 0.22 : 0.14;
    const glassHighlight = theme.mode === 'dark' 
      ? `rgba(255,255,255,${glassBorderOpacity})` 
      : `rgba(0,0,0,${glassBorderOpacity * 0.5})`;

    const glassBg = theme.mode === 'dark' 
      ? `rgba(255,255,255,${glassOpacity})` 
      : `rgba(255,255,255,0.75)`;

    const glassStyle: ViewStyle = {
      ...baseStyle,
      backgroundColor: glassBg,
      borderColor: glassHighlight,
      overflow: 'hidden',
      ...(Platform.OS === 'web' ? {
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        boxShadow: isRaised 
          ? '0 12px 36px 0 rgba(0, 0, 0, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.2)' 
          : '0 6px 20px 0 rgba(0, 0, 0, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      } : {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: isRaised ? 6 : 3 },
        shadowOpacity: isRaised ? 0.15 : 0.08,
        shadowRadius: isRaised ? 16 : 8,
        elevation: isRaised ? 5 : 2,
      })
    };

    if (animated) {
      return (
        <Animated.View style={[glassStyle, style]} {...props}>
          {children}
        </Animated.View>
      );
    }

    return (
      <View style={[glassStyle, style]} {...props}>
        {children}
      </View>
    );
  }

  // Clay or default mode
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
