import React, { useState } from 'react';
import { View, StyleSheet, Switch, TouchableOpacity, NativeModules, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../theme/themeStore';
import { useTheme } from '../theme/ThemeProvider';
import { useTunerStore } from '../features/tuner/store/tunerStore';
import { AppSurface } from '../components/common/AppSurface';
import { AppText } from '../components/common/AppText';
import { toast } from 'sonner-native';
import Feather from '@expo/vector-icons/Feather';

const CAPO_FRETS = Array.from({ length: 13 }, (_, i) => i); // 0-12

export function SettingsScreen() {
  const { mode, base, setMode, setBase } = useThemeStore();
  const { clearPitchData, referenceA4, setReferenceA4, capoFret, setCapoFret } = useTunerStore();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  
  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Title */}
      <View style={[styles.titleContainer, { paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.xl, marginBottom: theme.spacing.lg }]}>
        <Feather name="settings" size={28} color={theme.colors.text} style={{ marginRight: theme.spacing.sm }} />
        <AppText variant="heading" style={{ fontSize: 28 }}>Settings</AppText>
      </View>

      {/* ─── Calibration Section ─── */}
      <AppText variant="caption" color="muted" style={[styles.sectionLabel, { paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.xs }]}>
        CALIBRATION
      </AppText>
      <AppSurface isCard level="elevated" style={[styles.card, { padding: theme.spacing.md, marginHorizontal: theme.spacing.lg }]}>
        
        {/* A4 Reference Frequency */}
        <View style={[styles.row, { paddingVertical: theme.spacing.sm }]}>
          <View style={{ flex: 1 }}>
            <AppText variant="body" style={{ fontWeight: '500' }}>Reference Pitch (A4)</AppText>
            <AppText variant="caption" color="muted" style={{ marginTop: 2 }}>
              Standard is 440 Hz. Orchestras often use 442 Hz.
            </AppText>
          </View>
          <AppText variant="body" color="accent" style={{ fontWeight: '700', fontSize: 18, marginLeft: 8 }}>
            {referenceA4} Hz
          </AppText>
        </View>

        {/* A4 adjustment buttons */}
        <View style={[styles.a4Controls, { marginBottom: theme.spacing.sm }]}>
          <TouchableOpacity 
            style={[styles.a4Button, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => setReferenceA4(Math.max(430, referenceA4 - 1))}
          >
            <AppText variant="body" style={{ fontWeight: '600', fontSize: 18 }}>−</AppText>
          </TouchableOpacity>
          
          {[432, 440, 442].map(freq => (
            <TouchableOpacity 
              key={freq}
              style={[
                styles.a4Preset, 
                { 
                  backgroundColor: referenceA4 === freq ? theme.colors.accentSoft : theme.colors.surface,
                  borderColor: referenceA4 === freq ? theme.colors.accent : theme.colors.border,
                }
              ]}
              onPress={() => setReferenceA4(freq)}
            >
              <AppText 
                variant="caption" 
                color={referenceA4 === freq ? 'accent' : 'primary'}
                style={{ fontWeight: referenceA4 === freq ? '700' : '500' }}
              >
                {freq}
              </AppText>
            </TouchableOpacity>
          ))}

          <TouchableOpacity 
            style={[styles.a4Button, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => setReferenceA4(Math.min(450, referenceA4 + 1))}
          >
            <AppText variant="body" style={{ fontWeight: '600', fontSize: 18 }}>+</AppText>
          </TouchableOpacity>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.colors.border, marginVertical: theme.spacing.xs }]} />

        {/* Capo Position */}
        <View style={[styles.row, { paddingVertical: theme.spacing.sm }]}>
          <View style={{ flex: 1 }}>
            <AppText variant="body" style={{ fontWeight: '500' }}>Capo Position</AppText>
            <AppText variant="caption" color="muted" style={{ marginTop: 2 }}>
              Shifts target pitch up by this many frets.
            </AppText>
          </View>
          <AppText variant="body" color={capoFret > 0 ? 'warning' : 'muted'} style={{ fontWeight: '700', fontSize: 18, marginLeft: 8 }}>
            {capoFret === 0 ? "Off" : `Fret ${capoFret}`}
          </AppText>
        </View>

        {/* Capo fret selector */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.capoRow, { gap: 6 }]}
        >
          {CAPO_FRETS.map(fret => (
            <TouchableOpacity
              key={fret}
              style={[
                styles.capoButton,
                {
                  backgroundColor: capoFret === fret ? theme.colors.accentSoft : theme.colors.surface,
                  borderColor: capoFret === fret ? theme.colors.accent : theme.colors.border,
                }
              ]}
              onPress={() => setCapoFret(fret)}
            >
              <AppText 
                variant="caption"
                color={capoFret === fret ? 'accent' : 'muted'}
                style={{ fontWeight: capoFret === fret ? '700' : '400', fontSize: 13 }}
              >
                {fret === 0 ? "Off" : fret}
              </AppText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </AppSurface>

      {/* ─── Appearance Section ─── */}
      <AppText variant="caption" color="muted" style={[styles.sectionLabel, { paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.xl, marginBottom: theme.spacing.xs }]}>
        APPEARANCE
      </AppText>
      <AppSurface isCard level="elevated" style={[styles.card, { padding: theme.spacing.md, marginHorizontal: theme.spacing.lg }]}>
        <View style={[styles.row, { paddingVertical: theme.spacing.sm }]}>
          <AppText variant="body" style={{ fontWeight: '500' }}>Dark Mode</AppText>
          <Switch 
            value={mode === 'dark'} 
            onValueChange={(val) => setMode(val ? 'dark' : 'light')} 
            trackColor={{ true: theme.colors.accent, false: theme.colors.border }}
          />
        </View>

        <View style={[styles.divider, { backgroundColor: theme.colors.border, marginVertical: theme.spacing.xs }]} />

        <View style={[styles.row, { paddingVertical: theme.spacing.sm }]}>
          <View style={{ flex: 1 }}>
            <AppText variant="body" style={{ fontWeight: '500' }}>Glass Theme</AppText>
            <AppText variant="caption" color="muted" style={{ marginTop: 2 }}>
              Translucent surfaces with light borders.
            </AppText>
          </View>
          <Switch 
            value={base === 'glass'} 
            onValueChange={(val) => setBase(val ? 'glass' : 'clay')}
            trackColor={{ true: theme.colors.accent, false: theme.colors.border }}
          />
        </View>
      </AppSurface>

      {/* ─── Advanced Section ─── */}
      <AppText variant="caption" color="muted" style={[styles.sectionLabel, { paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.xl, marginBottom: theme.spacing.xs }]}>
        ADVANCED
      </AppText>
      <AppSurface isCard level="base" style={[styles.card, { padding: theme.spacing.md, marginHorizontal: theme.spacing.lg }]}>
        <TouchableOpacity style={[styles.button, { paddingVertical: theme.spacing.sm, flexDirection: 'row', justifyContent: 'center' }]} onPress={() => {
            clearPitchData();
            toast.success("Cache Cleared, Reloading...");
            setTimeout(() => {
              if (Platform.OS === 'web') {
                window.location.reload();
              } else if (NativeModules.DevSettings) {
                NativeModules.DevSettings.reload();
              }
            }, 1000);
        }}>
          <Feather name="refresh-cw" size={18} color={theme.colors.error} style={{ marginRight: theme.spacing.sm }} />
          <AppText variant="body" color="error" style={{ fontWeight: '600' }}>Clean Cache & Hard Reload</AppText>
        </TouchableOpacity>
      </AppSurface>

      {/* Version info */}
      <AppText variant="caption" color="muted" style={{ textAlign: 'center', marginTop: theme.spacing.xl }}>
        Guitar Tuner v0.1.0
      </AppText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    width: 'auto',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionLabel: {
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    height: 1,
  },
  button: {
    alignItems: 'center',
  },
  a4Controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  a4Button: {
    width: 40,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  a4Preset: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capoRow: {
    paddingVertical: 4,
  },
  capoButton: {
    width: 38,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
