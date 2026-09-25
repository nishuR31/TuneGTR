import React, { useEffect } from "react";
import { View } from "react-native";
import { useTunerStore } from "../store/tunerStore";
import { useTheme } from "../../../theme/ThemeProvider";
import { AppText } from "../../../components/common/AppText";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import Feather from '@expo/vector-icons/Feather';

export const CentsGauge: React.FC = () => {
  const { cents, tunerState } = useTunerStore();
  const theme = useTheme();

  const isActive =
    tunerState === "in_tune" ||
    tunerState === "flat" ||
    tunerState === "sharp" ||
    tunerState === "signal_detected";

  const clampedCents = Math.max(-50, Math.min(50, cents));
  const normalizedPosition = (clampedCents + 50) / 100;

  const animatedPosition = useSharedValue(0.5);
  useEffect(() => {
    if (isActive) {
      animatedPosition.value = withSpring(normalizedPosition, {
        mass: 0.4,
        damping: 14,
        stiffness: 120,
      });
    } else {
      animatedPosition.value = withTiming(0.5);
    }
  }, [normalizedPosition, isActive]);

  let markerColor = theme.colors.accent;

  if (isActive) {
    if (tunerState === "in_tune") {
      markerColor = theme.colors.success;
    } else if (tunerState === "flat" && clampedCents < -20) {
      markerColor = theme.colors.accent;
    } else if (tunerState === "sharp" && clampedCents > 20) {
      markerColor = theme.colors.error;
    } else {
      markerColor = theme.colors.warning;
    }
  }

  const markerStyle = useAnimatedStyle(() => ({
    left: `${animatedPosition.value * 100}%`,
  }));

  const trackBg = theme.mode === 'light' ? '#DDE2EB' : '#252B3A';
  const centerBg = theme.mode === 'light' ? '#D7DCE7' : '#30374A';

  const showLeftArrow = isActive && clampedCents < -3;
  const showRightArrow = isActive && clampedCents > 3;

  // Format cent display value contextually and cleanly
  const formatCentsDisplay = () => {
    if (!isActive) return "—";
    if (tunerState === "in_tune" || Math.abs(cents) <= 2) {
      return "0.0 ¢";
    }
    if (cents < 0) {
      return `♭ ${Math.abs(cents).toFixed(1)} ¢`;
    }
    return `♯ +${cents.toFixed(1)} ¢`;
  };

  return (
    <View className="items-center w-full">
      {/* Label row with directional arrows and clear pitch difference */}
      <View className="flex-row justify-between items-center w-full mb-1 px-2">
        <View className="flex-row items-center">
          {showLeftArrow && (
            <Feather name="chevron-left" size={14} color={markerColor} className="mr-0.5" />
          )}
          <AppText variant="caption" color="secondary" className="uppercase tracking-[1px] text-[11px] font-semibold">
            ♭ FLAT
          </AppText>
        </View>

        <View 
          className="px-2.5 py-0.5 rounded-full"
          style={{ backgroundColor: isActive ? (tunerState === 'in_tune' ? theme.colors.successSoft : theme.colors.surfaceRaised) : 'transparent' }}
        >
          <AppText variant="caption" className="font-bold text-xs" style={{ color: markerColor }}>
            {formatCentsDisplay()}
          </AppText>
        </View>

        <View className="flex-row items-center">
          <AppText variant="caption" color="secondary" className="uppercase tracking-[1px] text-[11px] font-semibold">
            SHARP ♯
          </AppText>
          {showRightArrow && (
            <Feather name="chevron-right" size={14} color={markerColor} className="ml-0.5" />
          )}
        </View>
      </View>

      <View className="w-full h-3 justify-center relative rounded-full" style={{ backgroundColor: trackBg }}>
        {/* Center emphasis zone */}
        <View className="absolute left-[40%] w-[20%] h-full rounded-full" style={{ backgroundColor: centerBg }} />

        {/* Tick marks */}
        {[-40, -30, -20, -10, 0, 10, 20, 30, 40].map((tick) => (
          <View
            key={tick}
            className="absolute w-0.5 top-1/2 -translate-y-[3px] rounded-[1px]"
            style={{
              left: `${((tick + 50) / 100) * 100}%`,
              height: tick === 0 ? 14 : 6,
              backgroundColor: tick === 0 ? theme.colors.textMuted : (theme.mode === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'),
            }}
          />
        ))}

        {/* Moving marker */}
        {isActive && (
          <Animated.View className="absolute items-center justify-center -translate-x-2" style={markerStyle}>
            <View 
              className="w-4 h-4 rounded-full" 
              style={{ 
                backgroundColor: markerColor, 
                shadowColor: markerColor,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.4,
                shadowRadius: 6,
                elevation: 4,
              }} 
            />
          </Animated.View>
        )}
      </View>
    </View>
  );
};
