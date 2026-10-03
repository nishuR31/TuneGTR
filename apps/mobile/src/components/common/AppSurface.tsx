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
 * Lightweight liquid-glass surface.
 * Employs backdrop blur on web and translucent layered surfaces with subtle rim borders.
 */
export const AppSurface: React.FC<AppSurfaceProps> = React.memo(
  ({ level = 'base', isCard = false, animated = false, style, children, ...props }) => {
    const theme = useTheme();
    const raised = level !== 'base';
    const surface = raised ? theme.colors.surfaceRaised : theme.colors.surface;
    const radius = isCard ? theme.radius.lg : theme.radius.md;

    const glassStyle: StyleProp<ViewStyle> = {
      backgroundColor: surface,
      borderColor: theme.colors.border,
      borderWidth: 1,
      borderRadius: radius,
      shadowColor: theme.mode === 'dark' ? '#000000' : '#64748B',
      shadowOffset: { width: 0, height: raised ? 8 : 4 },
      shadowOpacity: theme.effects.shadowOpacity,
      shadowRadius: raised ? 18 : 10,
      elevation: raised ? 6 : 2,
      ...(Platform.OS === 'web'
        ? ({
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: `0 8px 24px rgba(0,0,0,${raised ? 0.22 : 0.10}), inset 0 1px 0 rgba(255,255,255,0.12)`,
          } as any)
        : {}),
    };

    const content = <>{children}</>;
    return animated ? (
      <Animated.View style={[glassStyle, style]} {...props}>
        {content}
      </Animated.View>
    ) : (
      <View style={[glassStyle, style]} {...props}>
        {content}
      </View>
    );
  }
);
