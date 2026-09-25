import React, { useEffect, useCallback } from "react";
import { View, TouchableOpacity } from "react-native";
import { useTunerStore } from "../store/tunerStore";
import { useTheme } from "../../../theme/ThemeProvider";
import { AppSurface } from "../../../components/common/AppSurface";
import { AppText } from "../../../components/common/AppText";
import { useLayout } from "../../../hooks/useLayout";
import { getTargetFrequency } from "@guitar-tool/music-core";
import { playReferenceTone, isReferenceToneSupported } from "../utils/toneGenerator";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

const StringKey = React.memo(({ 
  isSelected, 
  note, 
  position, 
  midi,
  referenceA4,
  capoFret,
  onPress,
  onLongPress,
  width,
  height,
  isMuted,
}: { 
  isSelected: boolean;
  isMuted: boolean;
  note: string;
  position: number;
  midi: number;
  referenceA4: number;
  capoFret: number;
  onPress: () => void;
  onLongPress: () => void;
  width: number;
  height: number;
}) => {
  const theme = useTheme();
  
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withSpring(isSelected ? 1.05 : 1.0, { mass: 0.5, damping: 12, stiffness: 150 });
  }, [isSelected, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  const adjustedMidi = midi + capoFret;
  const freq = getTargetFrequency(adjustedMidi, referenceA4);

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity 
        onPress={onPress} 
        onLongPress={onLongPress}
        delayLongPress={400}
        activeOpacity={0.9}
      >
        <AppSurface
          level={isSelected ? 'raised' : 'base'}
          className="items-center justify-center rounded-[18px]"
          style={{ 
            width,
            height,
            backgroundColor: isSelected ? (theme.mode === 'light' ? theme.colors.surfaceRaised : theme.colors.accentSoft) : theme.colors.surface,
            borderColor: isSelected ? theme.colors.border : 'transparent',
            borderWidth: 1,
            opacity: isMuted ? 0.35 : 1, // Mute visual opacity if another string is locked
          }}
        >
          <AppText
            variant="body"
            color={isSelected ? (theme.mode === 'light' ? 'accent' : 'primary') : 'muted'}
            className={`text-[17px] ${isSelected ? 'font-bold' : 'font-medium'}`}
          >
            {note}
          </AppText>
          <AppText variant="caption" color={isSelected ? 'primary' : 'muted'} className="text-[10px] mt-0.5">
            {freq.toFixed(0)}Hz
          </AppText>
        </AppSurface>
      </TouchableOpacity>
    </Animated.View>
  );
});

export const StringSelector: React.FC = () => {
  const activeTuning = useTunerStore((s) => s.activeTuning);
  const detectedStringPosition = useTunerStore((s) => s.detectedStringPosition);
  const manualStringPosition = useTunerStore((s) => s.manualStringPosition);
  const setManualStringPosition = useTunerStore((s) => s.setManualStringPosition);
  const tunerState = useTunerStore((s) => s.tunerState);
  const referenceA4 = useTunerStore((s) => s.referenceA4);
  const capoFret = useTunerStore((s) => s.capoFret);
  
  const layout = useLayout();

  const isActive =
    tunerState === "in_tune" ||
    tunerState === "flat" ||
    tunerState === "sharp" ||
    tunerState === "signal_detected";

  const strings = activeTuning.stringsLowToHigh;
  const activePosition = manualStringPosition > 0 ? manualStringPosition : detectedStringPosition;

  const gap = layout.isCompact ? 6 : 8;
  const horizontalPadding = 32;
  const maxKeyWidth = layout.isTablet ? 72 : 56;
  const calculatedWidth = (layout.contentWidth - horizontalPadding - gap * (strings.length - 1)) / strings.length;
  const keyWidth = Math.min(maxKeyWidth, calculatedWidth);
  const keyHeight = layout.isShortScreen ? 52 : 60;

  const handlePress = useCallback((position: number, midi: number) => {
    if (manualStringPosition === position) {
      setManualStringPosition(-1);
    } else {
      setManualStringPosition(position);
      if (isReferenceToneSupported()) {
        const adjustedMidi = midi + capoFret;
        const freq = getTargetFrequency(adjustedMidi, referenceA4);
        playReferenceTone(freq, 1500);
      }
    }
  }, [manualStringPosition, setManualStringPosition, capoFret, referenceA4]);

  const handleLongPress = useCallback((midi: number) => {
    if (isReferenceToneSupported()) {
      const adjustedMidi = midi + capoFret;
      const freq = getTargetFrequency(adjustedMidi, referenceA4);
      playReferenceTone(freq, 1500);
    }
  }, [referenceA4, capoFret]);

  return (
    <View className="items-center">
      <View className="flex-row justify-center" style={{ gap }}>
        {strings.map((s) => {
          const isSelected = isActive && s.position === activePosition;
          const isMuted = manualStringPosition > 0 && manualStringPosition !== s.position;
          const noteLabel = s.note.replace(/[0-9]/g, "");

          return (
            <StringKey
              key={s.position}
              isSelected={isSelected}
              isMuted={isMuted}
              note={noteLabel}
              position={s.position}
              midi={s.midi}
              referenceA4={referenceA4}
              capoFret={capoFret}
              width={keyWidth}
              height={keyHeight}
              onPress={() => handlePress(s.position, s.midi)}
              onLongPress={() => handleLongPress(s.midi)}
            />
          );
        })}
      </View>
      {isReferenceToneSupported() && (
        <AppText variant="caption" color="muted" className="text-[10px] mt-1 text-center">
          Tap a string to lock and hear its reference tone
        </AppText>
      )}
    </View>
  );
};
