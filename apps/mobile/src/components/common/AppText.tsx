import React from 'react';
import { Text, TextProps, StyleSheet, useWindowDimensions } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { typography } from '../../theme/tokens';

export interface AppTextProps extends TextProps {
  color?: 'primary' | 'secondary' | 'muted' | 'accent' | 'success' | 'warning' | 'error';
  variant?: keyof typeof typography;
}

export const AppText: React.FC<AppTextProps> = ({
  color = 'primary',
  variant = 'body',
  style,
  children,
  ...props
}) => {
  const theme = useTheme();
  const { width } = useWindowDimensions();

  // Responsive scaling factor for small screens (e.g. width < 380)
  const isSmallScreen = width < 380;
  const scale = isSmallScreen ? 0.9 : 1.0;

  // Resolve theme color
  let textColor = theme.colors.text;
  switch (color) {
    case 'secondary': textColor = theme.colors.textSecondary; break;
    case 'muted': textColor = theme.colors.textMuted; break;
    case 'accent': textColor = theme.colors.accent; break;
    case 'success': textColor = theme.colors.success; break;
    case 'warning': textColor = theme.colors.warning; break;
    case 'error': textColor = theme.colors.error; break;
  }

  const typographyStyle = typography[variant];
  const fontSize = (typographyStyle.fontSize || 16) * scale;

  return (
    <Text 
      style={[
        typographyStyle,
        { color: textColor, fontSize },
        style
      ]} 
      {...props}
    >
      {children}
    </Text>
  );
};
