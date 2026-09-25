import React, { useEffect } from "react";
import {
  View,
  Pressable,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { NoteDisplay } from "../features/tuner/components/NoteDisplay";
import { CentsGauge } from "../features/tuner/components/CentsGauge";
import { StringSelector } from "../features/tuner/components/StringSelector";
import { TunerStateBanner } from "../features/tuner/components/TunerStateBanner";
import { TuningPicker } from "../features/tuner/components/TuningPicker";
import { PermissionPrompt } from "../features/tuner/components/PermissionPrompt";
import { WaveVisualizer } from "../features/tuner/components/WaveVisualizer";
import { useTuner } from "../features/tuner/hooks/useTuner";
import { useTunerStore } from "../features/tuner/store/tunerStore";
import { useTheme } from "../theme/ThemeProvider";
import { useLayout } from "../hooks/useLayout";
import { AppSurface } from "../components/common/AppSurface";
import { AppText } from "../components/common/AppText";
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, withSequence, withSpring } from 'react-native-reanimated';

export function TunerScreen() {
  const { startListening, stopListening, isListening } = useTuner();
  const { tunerState, detectedStringPosition, capoFret } = useTunerStore();
  const theme = useTheme();
  const layout = useLayout();

  // Breathing mic indicator animation
  const breatheScale = useSharedValue(1);
  useEffect(() => {
    if (isListening) {
      breatheScale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      breatheScale.value = withSpring(1);
    }
  }, [isListening, breatheScale]);

  const animatedMicStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breatheScale.value }]
  }));
  
  // Start button scale animation
  const buttonScale = useSharedValue(1);
  const handlePressIn = () => { buttonScale.value = withSpring(0.97); };
  const handlePressOut = () => { buttonScale.value = withSpring(1.0); };
  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }]
  }));

  if (tunerState === "permission_required" || tunerState === "permission_denied") {
    return (
      <View className="flex-1" style={{ backgroundColor: theme.colors.background, paddingTop: layout.insets.top }}>
        <PermissionPrompt
          state={tunerState}
          onRequestPermission={startListening}
        />
      </View>
    );
  }

  const auroraColors = theme.mode === 'light' 
    ? ["#E6E6FA30", "#EEF1F7", "#EEF1F7", "#DCE2F030"] 
    : ["#0B122A30", "#111522", "#111522", "#0A0B1430"];

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <LinearGradient 
        colors={auroraColors as any} 
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      <View className={`flex-1 ${layout.isLandscape ? 'flex-row' : 'flex-col'}`}>
        
        {/* Top/Left Section */}
        <View className={`${layout.isLandscape ? 'flex-1' : 'flex-[1.5]'}`}>
          {/* ── Header ── */}
          <View 
            className="z-10 flex-row justify-between items-center px-4"
            style={{ paddingTop: layout.isLandscape ? 24 : layout.insets.top + 16 }}
          >
            <View className="flex-1 items-start">
              <TuningPicker />
            </View>

            {capoFret > 0 && (
              <View className="px-3 py-1 rounded-full mr-3" style={{ backgroundColor: theme.colors.warningSoft }}>
                <AppText variant="caption" color="warning" className="text-[11px] font-semibold">
                  Capo {capoFret}
                </AppText>
              </View>
            )}

            <View className="flex-row items-center gap-1.5">
              <Animated.View
                style={[
                  { 
                    backgroundColor: isListening ? theme.colors.error : theme.colors.textMuted,
                    borderWidth: isListening ? 0 : 1,
                    borderColor: theme.colors.textMuted,
                    width: isListening ? 8 : 6,
                    height: isListening ? 8 : 6,
                    borderRadius: 4,
                  },
                  animatedMicStyle
                ]}
              />
              <AppText variant="caption" color="muted">
                {isListening ? "Listening" : "Microphone"}
              </AppText>
            </View>
          </View>

          {/* ── Center Stage: Note + Waveform ── */}
          <View className="flex-1 items-center justify-center min-h-[100px] px-4 pb-4">
            <View className={layout.isShortScreen ? "mb-1" : "mb-2"}>
              <WaveVisualizer />
            </View>
            <NoteDisplay />
          </View>
        </View>

        {/* Bottom/Right Section */}
        <View 
          className="flex-1"
          style={{ 
            justifyContent: layout.isLandscape ? 'center' : 'flex-end',
            paddingBottom: layout.isLandscape ? 0 : layout.insets.bottom + 110,
            paddingTop: layout.isLandscape ? layout.insets.top + 24 : 0,
          }}
        >
          
          {/* ── State Banner ── */}
          <View className="justify-center items-center" style={{ minHeight: layout.isShortScreen ? 40 : 48 }}>
            {isListening && detectedStringPosition > 0 && (
              <TunerStateBanner />
            )}
          </View>

          {/* ── Cents Gauge ── */}
          <View className="flex-1 shrink justify-center min-h-[50px] px-6">
            <CentsGauge />
          </View>

          {/* ── String Selector ── */}
          <View className="py-1.5 px-4">
            <StringSelector />
          </View>

          {/* ── Start/Stop Button ── */}
          <View 
            className="items-center px-6 pt-2"
            style={{ paddingBottom: layout.isLandscape ? 24 : 0 }}
          >
            <Animated.View style={[{ width: '100%', alignItems: 'center' }, animatedButtonStyle]}>
              <Pressable
                className="w-full items-center"
                onPress={isListening ? stopListening : startListening}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
              >
                <AppSurface 
                  level={isListening ? 'base' : 'raised'} 
                  className={`min-w-[200px] items-center rounded-full border-0 ${isListening ? 'bg-transparent' : ''}`}
                  style={{ 
                    paddingVertical: 16 * layout.spacingScale, 
                    paddingHorizontal: 32, 
                    backgroundColor: isListening ? theme.colors.surface : theme.colors.accentSoft,
                  }}
                >
                  <AppText variant="body" className="font-semibold" style={{ 
                    color: isListening ? theme.colors.textSecondary : theme.colors.accent, 
                    fontSize: 17 * layout.fontScale,
                  }}>
                    {isListening ? "Stop Tuning" : "Start Tuning"}
                  </AppText>
                </AppSurface>
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </View>
    </View>
  );
}
