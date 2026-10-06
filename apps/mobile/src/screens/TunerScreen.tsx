import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Image, ScrollView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { toast } from 'sonner-native';
import * as Haptics from 'expo-haptics';
import { useTuner } from '../features/tuner/hooks/useTuner';
import { useTunerStore } from '../features/tuner/store/tunerStore';
import { TuningPicker } from '../features/tuner/components/TuningPicker';
import { StringSelector } from '../features/tuner/components/StringSelector';
import { TuningMeter } from '../features/tuner/components/TuningMeter';
import { PermissionPrompt } from '../features/tuner/components/PermissionPrompt';
import { AppSurface } from '../components/common/AppSurface';
import { AppText } from '../components/common/AppText';
import { useTheme } from '../theme/ThemeProvider';
import { useLayout } from '../hooks/useLayout';

const stateCopy = {
  in_tune: ['IN TUNE', 'Hold it there'],
  flat: ['TUNE UP', 'Tighten the string'],
  sharp: ['TUNE DOWN', 'Loosen the string'],
  signal_detected: ['LISTENING', 'Let the string ring'],
  unstable: ['LISTENING', 'Pluck one string cleanly'],
  no_signal: ['READY', 'Pluck an open string'],
  listening: ['LISTENING', 'Pluck one string'],
  idle: ['READY', 'Pluck an open string'],
  error: ['AUDIO ERROR', 'Check microphone permission'],
  permission_required: ['MICROPHONE', 'Permission required'],
  permission_denied: ['MICROPHONE', 'Allow microphone access'],
} as const;

export function TunerScreen() {
  const { startListening, stopListening, isListening } = useTuner();
  const theme = useTheme();
  const layout = useLayout();
  const state = useTunerStore((s) => s.tunerState);
  const note = useTunerStore((s) => s.noteName);
  const frequency = useTunerStore((s) => s.frequency);
  const cents = useTunerStore((s) => s.cents);
  const target = useTunerStore((s) => s.targetFrequency);
  const stringPosition = useTunerStore((s) => s.detectedStringPosition);
  const stringNote = useTunerStore((s) => s.detectedStringNote);
  const confidence = useTunerStore((s) => s.confidence);
  const manualString = useTunerStore((s) => s.manualStringPosition);
  const tuning = useTunerStore((s) => s.activeTuning);
  const capo = useTunerStore((s) => s.capoFret);

  // Tester mode state
  const isTesterModeUnlocked = useTunerStore((s) => s.isTesterModeUnlocked);
  const setTesterModeUnlocked = useTunerStore((s) => s.setTesterModeUnlocked);

  // 7-tap detection
  const tapCountRef = useRef(0);
  const lastTapRef = useRef(0);
  const [testerTapCount, setTesterTapCount] = React.useState(0);

  useEffect(() => {
    startListening();
    return () => {
      stopListening();
    };
  }, [startListening, stopListening]);

  const handleLogoTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current > 3000) {
      tapCountRef.current = 1;
    } else {
      tapCountRef.current += 1;
    }
    lastTapRef.current = now;

    if (tapCountRef.current >= 7) {
      tapCountRef.current = 0;
      setTesterTapCount(0);
      if (!isTesterModeUnlocked) {
        setTesterModeUnlocked(true);
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
        }
        toast.success('Tester Mode Activated', {
          description: 'Monitor is now available in the bottom navigation.',
        });
      }
    } else {
      setTesterTapCount(tapCountRef.current);
    }
  };

  const active = ['flat', 'sharp', 'in_tune', 'signal_detected'].includes(state);
  const toneColor =
    state === 'in_tune'
      ? theme.colors.success
      : state === 'flat'
        ? theme.colors.warning
        : state === 'sharp'
          ? theme.colors.error
          : theme.colors.accent;
  const [label, sub] = stateCopy[state] ?? stateCopy.no_signal;

  const buttonScale = useSharedValue(1);
  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  if (state === 'permission_required' || state === 'permission_denied') {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: layout.insets.top }]}>
        <PermissionPrompt state={state} onRequestPermission={startListening} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={theme.mode === 'dark' ? ['#070A14', '#0E1428', '#070A16'] : ['#EEF3FF', '#F8FAFF', '#EDF2FA']}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: layout.insets.top + 12,
            paddingBottom: layout.insets.bottom + 98,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={handleLogoTap}
            style={styles.brandRow}
            accessibilityRole="button"
            accessibilityLabel="TuneGTR brand logo"
            accessibilityHint="Tap 7 times to unlock developer tester mode"
          >
            <View style={styles.logoWrap}>
              <Image
                source={require('../../assets/icon-dark.png')}
                style={styles.logo}
                resizeMode="cover"
              />
            </View>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.brand, { color: theme.colors.text }]}>TuneGTR</Text>
                {isTesterModeUnlocked && (
                  <View style={[styles.testerBadge, { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accent }]}>
                    <Text style={[styles.testerBadgeText, { color: theme.colors.accent }]}>TESTER</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.brandSub, { color: theme.colors.textMuted }]}>GUITAR TUNER</Text>
              {testerTapCount > 0 && testerTapCount < 7 && !isTesterModeUnlocked && (
                <View style={[styles.tapBadge, { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft }]}>
                  <AppText style={{ color: theme.colors.accent, fontSize: 10, fontWeight: '900' }}>
                    {testerTapCount}/7
                  </AppText>
                </View>
              )}
            </View>
          </Pressable>

          <View style={[styles.livePill, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
            <View style={[styles.liveDot, { backgroundColor: isListening ? theme.colors.success : theme.colors.textMuted }]} />
            <AppText variant="caption" color="muted">
              {isListening ? 'MIC LIVE' : 'MIC OFF'}
            </AppText>
          </View>
        </View>

        {/* Tuning & Capo Picker */}
        <View style={styles.tuningRow}>
          <TuningPicker />
          <View style={[styles.capo, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <AppText variant="caption" color="muted">CAPO</AppText>
            <AppText style={{ fontWeight: '800', color: theme.colors.text }}>{capo ? capo : 'OFF'}</AppText>
          </View>
        </View>

        {/* Main Tuner Card */}
        <AppSurface isCard level="raised" style={styles.hero}>
          <View style={[styles.statusPill, { backgroundColor: toneColor + '18', borderColor: toneColor + '44' }]}>
            <View style={[styles.statusDot, { backgroundColor: toneColor }]} />
            <AppText style={{ color: toneColor, fontSize: 12, fontWeight: '800', letterSpacing: 1 }}>{label}</AppText>
          </View>
          <AppText variant="caption" color="muted" style={styles.statusSub}>
            {sub}
          </AppText>

          {/* Note & Octave Display */}
          <View style={styles.noteRow}>
            <AppText
              style={[
                styles.note,
                {
                  fontSize: layout.isCompact ? 76 : 90,
                  color: active ? toneColor : theme.colors.textMuted,
                },
              ]}
              numberOfLines={1}
            >
              {active ? note.replace(/(-?\d+)$/, '') : '—'}
            </AppText>
            {active && (
              <AppText style={[styles.octave, { color: toneColor }]}>
                {note.match(/(-?\d+)$/)?.[1]}
              </AppText>
            )}
          </View>

          {/* String Indicator */}
          <View style={styles.stringLine}>
            <AppText variant="caption" color="muted">
              {stringPosition > 0 ? `STRING ${stringPosition}` : 'STRING —'}
            </AppText>
            <AppText style={{ color: theme.colors.text, fontWeight: '800' }}>
              {stringPosition > 0 ? stringNote : '—'}
            </AppText>
            {manualString > 0 && (
              <View style={[styles.lockPill, { backgroundColor: theme.colors.accentSoft }]}>
                <Feather name="lock" size={11} color={theme.colors.accent} />
                <AppText style={{ fontSize: 10, color: theme.colors.accent, fontWeight: '800' }}>LOCKED</AppText>
              </View>
            )}
          </View>

          {/* Metric Triplet */}
          <View style={styles.metrics}>
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: theme.colors.text }]} numberOfLines={1}>
                {active ? `${frequency.toFixed(1)} Hz` : '—'}
              </Text>
              <Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>DETECTED</Text>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: theme.colors.text }]} numberOfLines={1}>
                {target > 0 ? `${target.toFixed(1)} Hz` : '—'}
              </Text>
              <Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>TARGET</Text>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: toneColor }]} numberOfLines={1}>
                {active ? `${cents >= 0 ? '+' : ''}${cents.toFixed(1)}¢` : '—'}
              </Text>
              <Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>ERROR</Text>
            </View>
          </View>

          {/* Precision Tuning Meter Needle */}
          <TuningMeter />

          <Text style={[styles.confidence, { color: theme.colors.textMuted }]}>
            SIGNAL {active ? `${Math.round(confidence * 100)}%` : 'WAITING'} · {tuning.name.toUpperCase()}
          </Text>
        </AppSurface>

        {/* 6 Guitar Strings Selector */}
        <View style={styles.sectionHeader}>
          <AppText variant="caption" color="muted">STRINGS</AppText>
          <AppText variant="caption" color="muted">Tap to lock string</AppText>
        </View>
        <AppSurface isCard style={styles.stringsCard}>
          <View style={{ overflow: 'hidden' }}>
            <StringSelector />
          </View>
        </AppSurface>

        {/* High-End Start / Stop Tuning Action Button */}
        <Animated.View style={buttonStyle}>
          <Pressable
            onPress={isListening ? stopListening : startListening}
            onPressIn={() => (buttonScale.value = withSpring(0.96))}
            onPressOut={() => (buttonScale.value = withSpring(1))}
            accessibilityRole="button"
            accessibilityLabel={isListening ? 'Stop listening' : 'Start tuning'}
            accessibilityHint="Toggles acoustic microphone pitch detection"
          >
            <LinearGradient
              colors={
                isListening
                  ? ['rgba(16, 185, 129, 0.22)', 'rgba(6, 78, 59, 0.35)']
                  : ['#6366F1', '#4F46E5']
              }
              style={[
                styles.action,
                {
                  borderColor: isListening ? theme.colors.success : 'rgba(255, 255, 255, 0.25)',
                  overflow: 'hidden',
                },
              ]}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: isListening ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.15)' }]}>
                <Feather
                  name={isListening ? 'mic-off' : 'mic'}
                  size={18}
                  color={isListening ? theme.colors.success : '#FFFFFF'}
                />
              </View>
              <View style={{ alignItems: 'flex-start' }}>
                <Text
                  style={[
                    styles.actionText,
                    { color: isListening ? theme.colors.success : '#FFFFFF' },
                  ]}
                >
                  {isListening ? 'STOP LISTENING' : 'START TUNING'}
                </Text>
                <Text style={styles.actionSubText}>
                  {isListening ? 'Acoustic pitch engine listening' : 'Tap to start real-time detection'}
                </Text>
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* Pro Tip */}
        <View style={styles.tip}>
          <Feather name="info" size={13} color={theme.colors.textMuted} />
          <AppText variant="caption" color="muted" style={{ flex: 1, lineHeight: 18 }}>
            Pluck one open string at a time. Let it ring naturally and keep the other strings quiet.
          </AppText>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  content: {
    paddingHorizontal: 16,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  logoWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: '#0B1124',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 14,
  },
  brand: {
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  testerBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  testerBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  tapBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 3,
    alignSelf: 'flex-start',
  },
  brandSub: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginTop: 2,
  },
  livePill: {
    flexDirection: 'row',
    flexShrink: 0,
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 99,
    borderWidth: 1,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  tuningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  capo: {
    flexDirection: 'row',
    flexShrink: 0,
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  hero: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 20,
    alignItems: 'center',
    overflow: 'visible',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 99,
    borderWidth: 1,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusSub: {
    fontSize: 10,
    marginTop: 6,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 105,
    marginTop: 4,
  },
  note: {
    fontWeight: '700',
    letterSpacing: -2,
    lineHeight: 94,
  },
  octave: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    marginLeft: 4,
  },
  stringLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 15,
  },
  lockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 99,
  },
  metrics: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: 4,
  },
  metricDivider: {
    height: 28,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  confidence: {
    fontSize: 8,
    letterSpacing: 1.1,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 3,
  },
  stringsCard: {
    padding: 12,
    overflow: 'hidden',
  },
  action: {
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1.5,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  actionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  actionSubText: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.65)',
    fontWeight: '600',
    marginTop: 1,
  },
  tip: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    paddingHorizontal: 4,
    paddingTop: 2,
  },
});
