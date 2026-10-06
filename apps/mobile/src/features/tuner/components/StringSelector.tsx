import React, { useEffect, useCallback } from "react";
import { View, TouchableOpacity } from "react-native";
import { useTunerStore } from "../store/tunerStore";
import { useTheme } from "../../../theme/ThemeProvider";
import { AppSurface } from "../../../components/common/AppSurface";
import { AppText } from "../../../components/common/AppText";
import { useLayout } from "../../../hooks/useLayout";
import { getTargetFrequency } from "@tunergtr/music-core";
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
        accessibilityRole="button"
        accessibilityLabel={`String ${position}, note ${note}`}
        accessibilityHint="Tap to lock this string target"
      >
        <AppSurface
          level={isSelected ? 'raised' : 'base'}
          style={{ 
            width,
            height,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 18,
            backgroundColor: isSelected
              ? theme.colors.accentSoft
              : theme.colors.surface,
            borderColor: isSelected
              ? theme.colors.accent
              : theme.colors.border,
            borderWidth: 1,
            shadowColor: '#000',
            shadowOpacity: isSelected ? 0.20 : 0.08,
            shadowRadius: isSelected ? 10 : 5,
            shadowOffset: { width: 0, height: 4 },
            elevation: isSelected ? 5 : 2,
            opacity: isMuted ? 0.72 : 1,
            overflow: 'hidden',
          }}
        >
          <AppText
            variant="body"
            color={isSelected ? 'primary' : 'muted'}
            style={{
              fontSize: 17,
              fontWeight: isSelected ? '700' : '500',
            }}
          >
            {note}
          </AppText>
          <AppText
            variant="caption"
            color={isSelected ? 'accent' : 'muted'}
            style={{
              fontSize: 10,
              fontWeight: '700',
              marginTop: 1,
              letterSpacing: 0.5,
              opacity: isSelected ? 1 : 0.75,
            }}
          >
            {`${position}${position === 1 ? 'st' : position === 2 ? 'nd' : position === 3 ? 'rd' : 'th'}`}
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
  const soundEnabled = useTunerStore((s) => s.soundEnabled);
  
  const layout = useLayout();

  const isActive =
    tunerState === "in_tune" ||
    tunerState === "flat" ||
    tunerState === "sharp" ||
    tunerState === "signal_detected";

  const strings = activeTuning.stringsLowToHigh;
  const activePosition = manualStringPosition > 0 ? manualStringPosition : detectedStringPosition;

  const gap = layout.isCompact ? 6 : 8;
  const horizontalPadding = layout.isTablet ? 24 : 16;
  const maxKeyWidth = layout.isTablet ? 76 : 52;

  const availableWidth =
    Math.max(
      280,
      Math.min(layout.contentWidth, 430),
    ) -
    horizontalPadding -
    gap * (strings.length - 1);

  const calculatedWidth = availableWidth / strings.length;

  const keyWidth = Math.max(
    42,
    Math.min(maxKeyWidth, calculatedWidth),
  );
  const keyHeight = layout.isShortScreen ? 52 : 60;

  const handlePress = useCallback((position: number, midi: number) => {
    if (manualStringPosition === position) {
      setManualStringPosition(-1);
    } else {
      setManualStringPosition(position);
      if (soundEnabled && isReferenceToneSupported()) {
        const adjustedMidi = midi + capoFret;
        const freq = getTargetFrequency(adjustedMidi, referenceA4);
        playReferenceTone(freq, 1500);
      }
    }
  }, [manualStringPosition, setManualStringPosition, capoFret, referenceA4, soundEnabled]);

  const handleLongPress = useCallback((midi: number) => {
    if (soundEnabled && isReferenceToneSupported()) {
      const adjustedMidi = midi + capoFret;
      const freq = getTargetFrequency(adjustedMidi, referenceA4);
      playReferenceTone(freq, 1500);
    }
  }, [referenceA4, capoFret, soundEnabled]);

  return (
    <View style={{ alignItems: 'center', width: '100%' }}>
      <View
        className="flex-row justify-center"
        style={{
          gap,
          width: '100%',
          paddingHorizontal: horizontalPadding / 2,
        }}
      >
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
        <AppText
          variant="caption"
          color="secondary"
          style={{ fontSize: 10, marginTop: 8, textAlign: 'center' }}
        >
          Tap a string to lock detection
        </AppText>
      )}
    </View>
  );
};
