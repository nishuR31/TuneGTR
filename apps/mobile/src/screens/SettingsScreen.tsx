import React, { useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet, Switch, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import { toast } from 'sonner-native';
import { useTunerStore } from '../features/tuner/store/tunerStore';
import { TuningPicker } from '../features/tuner/components/TuningPicker';
import { AppSurface } from '../components/common/AppSurface';
import { AppText } from '../components/common/AppText';
import { useTheme } from '../theme/ThemeProvider';
import { useLayout } from '../hooks/useLayout';
import { SecurityComplianceModal } from '../features/tuner/components/SecurityComplianceModal';

const CAPO_FRETS = Array.from({ length: 13 }, (_, i) => i);

export function SettingsScreen() {
  const theme = useTheme();
  const layout = useLayout();
  const tuning = useTunerStore((s) => s.activeTuning);
  const capo = useTunerStore((s) => s.capoFret);
  const setCapo = useTunerStore((s) => s.setCapoFret);
  const haptics = useTunerStore((s) => s.hapticsEnabled);
  const setHaptics = useTunerStore((s) => s.setHapticsEnabled);
  const isTesterModeUnlocked = useTunerStore((s) => s.isTesterModeUnlocked);
  const setTesterModeUnlocked = useTunerStore((s) => s.setTesterModeUnlocked);
  const clearTestedStrings = useTunerStore((s) => s.clearTestedStrings);
  const [security, setSecurity] = useState(false);

  const handleOpenGithub = () => {
    Linking.openURL('https://github.com/nishur31').catch(() => {
      toast.error('Could not open GitHub URL');
    });
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={['#070A14', '#0E1428', '#070A16']}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        contentContainerStyle={{
          paddingTop: layout.insets.top + 16,
          paddingBottom: layout.insets.bottom + 98,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <AppText style={styles.title}>Settings</AppText>
            <AppText variant="caption" color="muted">
              PREFERENCES & INSTRUMENT SETUP
            </AppText>
          </View>
          <View style={[styles.badge, { backgroundColor: theme.colors.successSoft }]}>
            <Feather name="music" size={13} color={theme.colors.success} />
            <AppText style={{ fontSize: 10, fontWeight: '800', color: theme.colors.success }}>
              A440
            </AppText>
          </View>
        </View>

        {/* Tuning Configuration */}
        <AppText variant="caption" color="muted" style={styles.section}>
          TUNING
        </AppText>
        <AppSurface isCard level="raised" style={styles.card}>
          <View style={styles.row}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <AppText style={styles.rowTitle}>Tuning Preset</AppText>
              <AppText variant="caption" color="muted">
                {tuning.name} · 6-string guitar
              </AppText>
            </View>
            <TuningPicker />
          </View>
          <View style={styles.rule} />
          <View style={styles.row}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <AppText style={styles.rowTitle}>Capo Offset</AppText>
              <AppText variant="caption" color="muted">
                Shift target frequencies by semitones
              </AppText>
            </View>
            <AppText
              style={{
                fontWeight: '800',
                color: capo ? theme.colors.warning : theme.colors.textMuted,
              }}
            >
              {capo ? `Fret ${capo}` : 'Off'}
            </AppText>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.capoRow}>
            {CAPO_FRETS.map((f) => (
              <Pressable
                key={f}
                onPress={() => setCapo(f)}
                style={[
                  styles.capo,
                  {
                    backgroundColor: f === capo ? theme.colors.accentSoft : theme.colors.surface,
                    borderColor: f === capo ? theme.colors.accent : theme.colors.border,
                  },
                ]}
              >
                <AppText
                  style={{
                    fontSize: 11,
                    fontWeight: f === capo ? '800' : '600',
                    color: f === capo ? theme.colors.accent : theme.colors.textMuted,
                  }}
                >
                  {f === 0 ? 'OFF' : f}
                </AppText>
              </Pressable>
            ))}
          </ScrollView>
        </AppSurface>

        {/* Haptics & Feedback */}
        <AppText variant="caption" color="muted" style={styles.section}>
          FEEDBACK
        </AppText>
        <AppSurface isCard style={styles.card}>
          <View style={styles.row}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <AppText style={styles.rowTitle}>Haptic Confirmation</AppText>
              <AppText variant="caption" color="muted">
                Vibrate when string enters the ±5¢ in-tune zone
              </AppText>
            </View>
            <Switch
              value={haptics}
              onValueChange={setHaptics}
              trackColor={{ false: theme.colors.surfaceRaised, true: theme.colors.accent }}
              thumbColor={theme.colors.text}
            />
          </View>
        </AppSurface>

        {/* Developer & Tester Mode */}
        {isTesterModeUnlocked && (
          <>
            <AppText variant="caption" color="muted" style={styles.section}>
              DEVELOPER & TESTER
            </AppText>
            <AppSurface isCard style={styles.card}>
              <View style={styles.row}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <AppText style={styles.rowTitle}>Monitor Mode Tab</AppText>
                  <AppText variant="caption" color="muted">
                    Show telemetry & benchmark studio in navigation bar
                  </AppText>
                </View>
                <Switch
                  value={isTesterModeUnlocked}
                  onValueChange={(val) => {
                    setTesterModeUnlocked(val);
                    toast.info(val ? 'Tester Mode Enabled' : 'Tester Mode Hidden');
                  }}
                  trackColor={{ false: theme.colors.surfaceRaised, true: theme.colors.accent }}
                  thumbColor={theme.colors.text}
                />
              </View>

              <View style={styles.rule} />

              <Pressable
                onPress={() => {
                  clearTestedStrings();
                  toast.success('Benchmark Session Cleared');
                }}
                style={styles.row}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Feather name="trash-2" size={17} color={theme.colors.error} />
                  <View>
                    <AppText style={styles.rowTitle}>Reset Telemetry Cache</AppText>
                    <AppText variant="caption" color="muted">
                      Clear recorded string benchmarks
                    </AppText>
                  </View>
                </View>
                <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
              </Pressable>
            </AppSurface>
          </>
        )}

        {/* About & Privacy */}
        <AppText variant="caption" color="muted" style={styles.section}>
          ABOUT
        </AppText>
        <AppSurface isCard style={styles.card}>
          <View style={styles.row}>
            <View>
              <AppText style={styles.rowTitle}>Reference Pitch</AppText>
              <AppText variant="caption" color="muted">
                Fixed standard A4 = 440 Hz
              </AppText>
            </View>
            <AppText style={{ fontWeight: '800', color: theme.colors.text }}>440 Hz</AppText>
          </View>

          <View style={styles.rule} />

          <Pressable onPress={() => setSecurity(true)} style={styles.row}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Feather name="shield" size={17} color={theme.colors.textSecondary} />
              <View>
                <AppText style={styles.rowTitle}>Privacy & Security</AppText>
                <AppText variant="caption" color="muted">
                  Audio stays strictly local on device
                </AppText>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
          </Pressable>
        </AppSurface>

        {/* Developer Credit & GitHub Link */}
        <AppSurface isCard style={[styles.card, { marginTop: 14 }]}>
          <Pressable onPress={handleOpenGithub} style={styles.githubRow}>
            <View style={styles.githubIconWrap}>
              <Feather name="github" size={20} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={styles.rowTitle}>Developer</AppText>
              <AppText variant="caption" color="muted">
                Built with precision by nishur31
              </AppText>
            </View>
            <View style={[styles.githubPill, { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accent }]}>
              <AppText style={{ fontSize: 11, fontWeight: '800', color: theme.colors.accent }}>
                @nishur31
              </AppText>
              <Feather name="external-link" size={12} color={theme.colors.accent} />
            </View>
          </Pressable>
        </AppSurface>

        <AppText variant="caption" color="muted" style={styles.version}>
          TuneGTR · v1.0.0
        </AppText>
      </ScrollView>

      <SecurityComplianceModal visible={security} onClose={() => setSecurity(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 99,
  },
  section: {
    marginHorizontal: 22,
    marginTop: 20,
    marginBottom: 8,
    letterSpacing: 1.4,
    fontSize: 10,
  },
  card: {
    marginHorizontal: 16,
    padding: 16,
    gap: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  rule: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
  },
  capoRow: {
    gap: 8,
    paddingTop: 4,
  },
  capo: {
    width: 42,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  githubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  githubIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  githubPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
  },
  version: {
    textAlign: 'center',
    marginTop: 22,
    fontSize: 10,
    letterSpacing: 1,
  },
});
