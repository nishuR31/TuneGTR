import React from "react";
import { View, Platform } from "react-native";
import { useTunerStore } from "../store/tunerStore";
import { useTheme } from "../../../theme/ThemeProvider";
import { AppText } from "../../../components/common/AppText";
import { useLayout } from "../../../hooks/useLayout";

/**
 * Note display — shows the detected note name, frequency,
 * target string, and target frequency for comparison.
 * Fully responsive — scales for compact/tablet/short screens.
 */
export const NoteDisplay: React.FC = React.memo(() => {
  const { noteName, tunerState, frequency, detectedStringNote, detectedStringPosition, targetFrequency } = useTunerStore();
  const theme = useTheme();
  const layout = useLayout();

  const isActive = tunerState !== "idle" && tunerState !== "no_signal" && noteName !== "--";

  // Responsive font sizing
  const noteFontSize = layout.isCompact ? 64 : layout.isShortScreen ? 72 : 88;

  const isInTune = tunerState === 'in_tune';
  // Clay glow: use theme successSoft / accentSoft — warm and opaque-friendly
  const glowColor = isInTune
    ? theme.colors.successSoft
    : theme.colors.accentSoft;

  const noteColor = isInTune 
    ? theme.colors.success 
    : isActive 
      ? theme.colors.text 
      : theme.colors.textMuted;

  const targetLabel = isActive && detectedStringPosition > 0 
    ? `String ${detectedStringPosition} · ${detectedStringNote.replace(/[0-9]/g, '')}`
    : null;

  return (
    <View className="items-center justify-center">
      {targetLabel && (
        <AppText variant="caption" color="muted" style={{ fontSize: 12, marginBottom: 2, letterSpacing: 1.5, textTransform: 'uppercase' }}>
          {targetLabel}
        </AppText>
      )}

      <AppText 
        style={{ 
          fontSize: noteFontSize, 
          fontWeight: '300', 
          color: noteColor,
          ...(Platform.OS === 'web' ? {
            textShadow: isActive ? `0px 4px 16px ${glowColor}` : 'none'
          } : {
            textShadowColor: isActive ? glowColor : 'transparent',
            textShadowOffset: { width: 0, height: 4 },
            textShadowRadius: 16,
          }),
          lineHeight: noteFontSize + 10,
        }}
      >
        {isActive ? noteName : "--"}
      </AppText>
      
      <View className="flex-row items-baseline mt-1">
        <AppText variant="frequencyDisplay" color="muted" style={{ fontSize: 15 * layout.fontScale }}>
          {isActive ? `${frequency.toFixed(1)} Hz` : "— Hz"}
        </AppText>
        {isActive && targetFrequency > 0 && (
          <AppText variant="caption" color="muted" style={{ fontSize: 11, marginLeft: 8 }}>
            → {targetFrequency.toFixed(1)} Hz
          </AppText>
        )}
      </View>
    </View>
  );
});
