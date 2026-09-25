import React, { useEffect, useCallback } from "react";
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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  withSequence,
  withSpring,
} from "react-native-reanimated";

export function TunerScreen() {
  const { startListening, stopListening, isListening } = useTuner();
  const {
    tunerState,
    detectedStringPosition,
    capoFret,
    manualStringPosition,
    setManualStringPosition,
    hapticsEnabled,
  } = useTunerStore();
  const theme = useTheme();
  const layout = useLayout();

  // ── Lock-on string: tap badge or detected string to lock ──
  const handleLockOnToggle = useCallback(() => {
    if (detectedStringPosition > 0) {
      const next = manualStringPosition === detectedStringPosition ? -1 : detectedStringPosition;
      setManualStringPosition(next);
      if (hapticsEnabled) {
        import("expo-haptics").then((Haptics) => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
        });
      }
    }
  }, [detectedStringPosition, manualStringPosition, setManualStringPosition, hapticsEnabled]);

  const isLockedOn = manualStringPosition > 0;
  const isActive =
    tunerState === "in_tune" ||
    tunerState === "flat" ||
    tunerState === "sharp" ||
    tunerState === "signal_detected";

  // Breathing mic dot animation
  const breatheScale = useSharedValue(1);
  useEffect(() => {
    if (isListening) {
      breatheScale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      breatheScale.value = withSpring(1);
    }
  }, [isListening, breatheScale]);

  const animatedMicStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breatheScale.value }],
  }));

  // Button press tactile animation
  const buttonScale = useSharedValue(1);
  const handlePressIn = () => { buttonScale.value = withSpring(0.95, { mass: 0.25, stiffness: 280 }); };
  const handlePressOut = () => { buttonScale.value = withSpring(1.0, { mass: 0.25, stiffness: 280 }); };
  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  if (tunerState === "permission_required" || tunerState === "permission_denied") {
    return (
      <View className="flex-1" style={{ backgroundColor: theme.colors.background, paddingTop: layout.insets.top }}>
        <PermissionPrompt state={tunerState} onRequestPermission={startListening} />
      </View>
    );
  }

  // Clay background gradient — warm soft light, deep cool dark
  const bgGradient = theme.mode === "light"
    ? (["#EDF0F8", "#F4F6FC", "#F4F6FC", "#E8EBF5"] as const)
    : (["#0C0F1C", "#141828", "#141828", "#0A0D1A"] as const);

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <LinearGradient
        colors={bgGradient as any}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View className={`flex-1 ${layout.isLandscape ? "flex-row" : "flex-col"}`}>

        {/* ── Top / Left ── */}
        <View className={`${layout.isLandscape ? "flex-1" : "flex-[1.5]"}`}>

          {/* Header */}
          <View
            className="z-10 flex-row justify-between items-center px-4"
            style={{ paddingTop: layout.isLandscape ? 24 : layout.insets.top + 16 }}
          >
            <View className="flex-1 items-start">
              <TuningPicker />
            </View>

            {capoFret > 0 && (
              <View
                className="px-3 py-1 rounded-full mr-2"
                style={{ backgroundColor: theme.colors.warningSoft }}
              >
                <AppText variant="caption" color="warning" className="text-[11px] font-semibold">
                  Capo {capoFret}
                </AppText>
              </View>
            )}

            {/* Lock-on badge — tap to unlock */}
            {isLockedOn && (
              <Pressable
                onPress={handleLockOnToggle}
                style={{
                  backgroundColor: theme.colors.accentSoft,
                  borderRadius: theme.radius.round,
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  marginRight: 8,
                  borderWidth: 1.5,
                  borderColor: theme.colors.accent,
                  shadowColor: theme.colors.accent,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 6,
                  elevation: 3,
                }}
              >
                <AppText style={{ color: theme.colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>
                  🔒 LOCKED
                </AppText>
              </Pressable>
            )}

            <View className="flex-row items-center gap-1.5">
              <Animated.View
                style={[
                  {
                    backgroundColor: isListening ? theme.colors.error : theme.colors.textMuted,
                    width: isListening ? 9 : 7,
                    height: isListening ? 9 : 7,
                    borderRadius: 5,
                  },
                  animatedMicStyle,
                ]}
              />
              <AppText variant="caption" color="muted">
                {isListening ? "Listening" : "Microphone"}
              </AppText>
            </View>
          </View>

          {/* Center: Waveform + Note */}
          <View className="flex-1 items-center justify-center min-h-[100px] px-4 pb-4">
            <View className={layout.isShortScreen ? "mb-1" : "mb-3"}>
              <WaveVisualizer />
            </View>
            <NoteDisplay />
          </View>
        </View>

        {/* ── Bottom / Right ── */}
        <View
          className="flex-1"
          style={{
            justifyContent: layout.isLandscape ? "center" : "flex-end",
            paddingBottom: layout.isLandscape ? 0 : layout.insets.bottom + 110,
            paddingTop: layout.isLandscape ? layout.insets.top + 24 : 0,
          }}
        >

          {/* State Banner */}
          <View className="justify-center items-center min-h-[76px]">
            {isListening && detectedStringPosition > 0 && <TunerStateBanner />}
          </View>

          {/* Cents Gauge */}
          <View className="flex-1 shrink justify-center min-h-[50px] px-6">
            <CentsGauge />
          </View>

          {/* String Selector */}
          <View className="py-1.5 px-4">
            <StringSelector />
            {/* Lock-on hint — shown when active and not yet locked */}
            {isListening && isActive && !isLockedOn && detectedStringPosition > 0 && (
              <Pressable onPress={handleLockOnToggle} hitSlop={10}>
                <AppText
                  variant="caption"
                  className="text-center mt-1"
                  style={{ fontSize: 10, color: theme.colors.accent, opacity: 0.65 }}
                >
                  Tap string to lock-on ›
                </AppText>
              </Pressable>
            )}
          </View>

          {/* Start / Stop Button */}
          <View
            className="items-center px-6 pt-2"
            style={{ paddingBottom: layout.isLandscape ? 24 : 0 }}
          >
            <Animated.View style={[{ width: "100%", alignItems: "center" }, animatedButtonStyle]}>
              <Pressable
                className="w-full items-center"
                onPress={isListening ? stopListening : startListening}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
              >
                <AppSurface
                  level={isListening ? "base" : "raised"}
                  className="min-w-[200px] items-center rounded-full"
                  style={{
                    paddingVertical: 16 * layout.spacingScale,
                    paddingHorizontal: 36,
                    backgroundColor: isListening
                      ? theme.colors.surface
                      : theme.colors.accentSoft,
                    borderWidth: 0,
                  }}
                >
                  <AppText
                    variant="body"
                    style={{
                      color: isListening ? theme.colors.textSecondary : theme.colors.accent,
                      fontSize: 17 * layout.fontScale,
                      fontWeight: '700',
                      letterSpacing: 0.2,
                    }}
                  >
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
