import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Modal,
  Platform,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import * as FileSystem from 'expo-file-system/legacy';
import { toast } from 'sonner-native';
import { useTunerStore } from '../features/tuner/store/tunerStore';
import { useTheme } from '../theme/ThemeProvider';
import { useLayout } from '../hooks/useLayout';
import { AppSurface } from '../components/common/AppSurface';
import { AppText } from '../components/common/AppText';
import { getTargetFrequency } from '@tunergtr/music-core';

export function MonitorScreen() {
  const theme = useTheme();
  const layout = useLayout();

  // Tuner store state
  const state = useTunerStore((s) => s.tunerState);
  const note = useTunerStore((s) => s.noteName);
  const frequency = useTunerStore((s) => s.frequency);
  const cents = useTunerStore((s) => s.cents);
  const target = useTunerStore((s) => s.targetFrequency);
  const stringPosition = useTunerStore((s) => s.detectedStringPosition);
  const stringNote = useTunerStore((s) => s.detectedStringNote);
  const confidence = useTunerStore((s) => s.confidence);
  const isMicActive = useTunerStore((s) => s.isMicActive);
  const activeTuning = useTunerStore((s) => s.activeTuning);
  const referenceA4 = useTunerStore((s) => s.referenceA4);
  const capoFret = useTunerStore((s) => s.capoFret);

  // Tester store state
  const testedStrings = useTunerStore((s) => s.testedStrings);
  const recordTestedString = useTunerStore((s) => s.recordTestedString);
  const autoFillBenchmarkData = useTunerStore((s) => s.autoFillBenchmarkData);
  const clearTestedStrings = useTunerStore((s) => s.clearTestedStrings);

  const [showLogModal, setShowLogModal] = useState(false);
  const [lastSavedPath, setLastSavedPath] = useState<string | null>(null);

  const isActive = ['flat', 'sharp', 'in_tune', 'signal_detected'].includes(state);
  const strings = activeTuning.stringsLowToHigh;

  // Calculate overall guitar tuning progress
  const tuningStats = useMemo(() => {
    let testedCount = 0;
    let inTuneCount = 0;

    strings.forEach((s) => {
      const result = testedStrings[s.position];
      if (result) {
        testedCount++;
        if (result.inTune) inTuneCount++;
      }
    });

    const percentTuned = strings.length > 0 ? Math.round((inTuneCount / strings.length) * 100) : 0;
    const isFullyTuned = inTuneCount === strings.length && strings.length > 0;

    return { testedCount, inTuneCount, percentTuned, isFullyTuned };
  }, [strings, testedStrings]);

  // Manually capture current detected string into test table
  const handleCaptureCurrent = () => {
    if (stringPosition > 0 && frequency > 0) {
      const inTune = Math.abs(cents) <= 5;
      const statusText = inTune ? 'PASS (IN TUNE)' : cents < 0 ? 'FLAT' : 'SHARP';
      recordTestedString({
        position: stringPosition,
        note: stringNote,
        targetHz: target,
        detectedHz: frequency,
        cents,
        inTune,
        statusText,
        timestamp: new Date().toLocaleTimeString(),
      });
      toast.success(`String ${stringPosition} (${stringNote}) Recorded!`, {
        description: `${frequency.toFixed(2)} Hz • ${cents >= 0 ? '+' : ''}${cents.toFixed(1)}¢ • ${statusText}`,
      });
    } else {
      toast.info('No steady string signal to capture', {
        description: 'Pluck a string first or use "Auto-Fill Benchmark".',
      });
    }
  };

  // Generate ASCII Diagnostic Telemetry Log text
  const generateLogText = () => {
    const timestamp = new Date().toISOString();
    const platform = Platform.OS.toUpperCase();
    const lines = [
      '================================================================',
      'TuneGTR Professional Acoustic Diagnostics & Tuning Log',
      '================================================================',
      `Timestamp:         ${timestamp}`,
      `Platform:          ${platform}`,
      `App Version:       1.0.0 (Build Liquid-Dark)`,
      `Developer:         nishur31 (https://github.com/nishur31)`,
      `Audio Engine:      YIN F0 Detector • 4096 RingBuffer • PCM Float32`,
      `Reference A4:      ${referenceA4} Hz`,
      `Active Tuning:     ${activeTuning.name} (${activeTuning.aliases?.[0] || 'Standard'})`,
      `Capo Fret:         ${capoFret === 0 ? 'None (Open)' : `Fret ${capoFret}`}`,
      `Mic Active:        ${isMicActive ? 'YES' : 'NO'}`,
      '----------------------------------------------------------------',
      '6-STRING ACOUSTIC CALIBRATION TABLE:',
      '----------------------------------------------------------------',
      'Str | Target Note | Target Hz | Detected Hz | Cents Err | Status',
      '----+-------------+-----------+-------------+-----------+----------------',
    ];

    strings.forEach((s) => {
      const targetHz = getTargetFrequency(s.midi + capoFret, referenceA4);
      const res = testedStrings[s.position];
      const detHz = res ? `${res.detectedHz.toFixed(2)} Hz`.padEnd(11) : 'WAITING    ';
      const centsStr = res ? `${res.cents >= 0 ? '+' : ''}${res.cents.toFixed(1)}¢`.padEnd(9) : '—        ';
      const status = res ? res.statusText : 'PENDING';
      lines.push(
        ` #${s.position} | ${s.note.padEnd(11)} | ${targetHz.toFixed(2).padEnd(9)} | ${detHz} | ${centsStr} | ${status}`
      );
    });

    lines.push('----------------------------------------------------------------');
    lines.push('DIAGNOSTIC BENCHMARK SUMMARY:');
    lines.push(`Strings Tested:    ${tuningStats.testedCount} of ${strings.length}`);
    lines.push(`Strings In-Tune:   ${tuningStats.inTuneCount} of ${strings.length}`);
    lines.push(`Overall Tuned:     ${tuningStats.percentTuned}%`);
    lines.push(
      `Guitar State:      ${
        tuningStats.isFullyTuned
          ? 'FULLY TUNED & STAGE READY (PASS)'
          : tuningStats.testedCount === 0
          ? 'UNTESTED'
          : 'CALIBRATION INCOMPLETE (MARGINAL)'
      }`
    );
    lines.push('================================================================');
    lines.push('End of Telemetry Log.');
    return lines.join('\n');
  };

  // Export log to File System (.txt)
  const handleExportFile = async () => {
    const logContent = generateLogText();
    const filename = `TuneGTR_Diagnostics_${Date.now()}.txt`;

    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const blob = new Blob([logContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setLastSavedPath(`Downloaded: ${filename}`);
        toast.success('Log File Downloaded!', {
          description: `Saved as ${filename} in your Downloads folder.`,
        });
      } else {
        const fileUri = `${FileSystem.documentDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(fileUri, logContent, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        setLastSavedPath(fileUri);
        toast.success('Log Saved to File System!', {
          description: `Saved: ${filename}`,
        });
      }
    } catch (err) {
      console.error('File export error:', err);
      toast.error('Failed to save log file', {
        description: String(err),
      });
    }
  };

  const currentStatusTone =
    state === 'in_tune'
      ? theme.colors.success
      : state === 'flat'
      ? theme.colors.warning
      : state === 'sharp'
      ? theme.colors.error
      : theme.colors.accent;

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={['#050811', '#0B1124', '#070C1B']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: layout.insets.top + 14,
            paddingBottom: layout.insets.bottom + 96,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: theme.colors.text }]}>Monitor Mode</Text>
              <View style={[styles.testerBadge, { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accent }]}>
                <Feather name="cpu" size={11} color={theme.colors.accent} />
                <Text style={[styles.testerBadgeText, { color: theme.colors.accent }]}>TESTER STUDIO</Text>
              </View>
            </View>
            <AppText variant="caption" color="muted">
              LIVE ACOUSTIC TELEMETRY & DIAGNOSTICS
            </AppText>
          </View>

          <View style={[styles.statusChip, { borderColor: isMicActive ? theme.colors.success : theme.colors.border }]}>
            <View style={[styles.statusDot, { backgroundColor: isMicActive ? theme.colors.success : theme.colors.textMuted }]} />
            <Text style={[styles.statusChipText, { color: isMicActive ? theme.colors.success : theme.colors.textMuted }]}>
              {isMicActive ? 'STREAMING' : 'MIC IDLE'}
            </Text>
          </View>
        </View>

        {/* Live Audio Telemetry Card */}
        <AppSurface isCard level="raised" style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Feather name="activity" size={16} color={theme.colors.accent} />
              <AppText variant="body" style={{ fontWeight: '800' }}>
                Real-Time String Recognition
              </AppText>
            </View>
            <View style={[styles.miniPill, { backgroundColor: currentStatusTone + '20', borderColor: currentStatusTone }]}>
              <Text style={[styles.miniPillText, { color: currentStatusTone }]}>
                {isActive ? (Math.abs(cents) <= 5 ? 'IN TUNE' : cents < 0 ? 'FLAT' : 'SHARP') : 'WAITING'}
              </Text>
            </View>
          </View>

          {/* Large Diagnostic Grid */}
          <View style={styles.telemetryGrid}>
            <View style={styles.gridBox}>
              <Text style={styles.gridLabel}>DETECTED STRING</Text>
              <Text style={[styles.gridValue, { color: theme.colors.text }]}>
                {stringPosition > 0 ? `#${stringPosition} ${stringNote}` : '—'}
              </Text>
              <Text style={styles.gridSub}>
                {stringPosition > 0 ? `Target: ${target.toFixed(2)} Hz` : 'Pluck a string'}
              </Text>
            </View>

            <View style={styles.gridBox}>
              <Text style={styles.gridLabel}>FREQUENCY</Text>
              <Text style={[styles.gridValue, { color: currentStatusTone }]}>
                {frequency > 0 ? `${frequency.toFixed(2)}` : '0.00'}
                <Text style={{ fontSize: 13, color: theme.colors.textMuted }}> Hz</Text>
              </Text>
              <Text style={styles.gridSub}>
                {frequency > 0 && target > 0 ? `Δ ${(frequency - target).toFixed(2)} Hz` : 'YIN fundamental'}
              </Text>
            </View>

            <View style={styles.gridBox}>
              <Text style={styles.gridLabel}>CENTS ERROR</Text>
              <Text style={[styles.gridValue, { color: currentStatusTone }]}>
                {isActive ? `${cents >= 0 ? '+' : ''}${cents.toFixed(1)}¢` : '—'}
              </Text>
              <Text style={styles.gridSub}>
                {isActive ? (Math.abs(cents) <= 5 ? 'Tolerance: PASS' : 'Tolerance: FAIL') : '±5.0¢ window'}
              </Text>
            </View>

            <View style={styles.gridBox}>
              <Text style={styles.gridLabel}>CONFIDENCE</Text>
              <Text style={[styles.gridValue, { color: theme.colors.text }]}>
                {isActive ? `${Math.round(confidence * 100)}%` : '0%'}
              </Text>
              <Text style={styles.gridSub}>Min: 55% threshold</Text>
            </View>
          </View>

          {/* Quick Capture Button */}
          <Pressable
            onPress={handleCaptureCurrent}
            style={styles.captureBtn}
            accessibilityRole="button"
            accessibilityLabel="Capture current string"
            accessibilityHint="Saves the currently detected pitch to the 6-string matrix"
          >
            <Feather name="check-circle" size={15} color="#FFFFFF" />
            <Text style={styles.captureBtnText}>Capture Current String to Benchmark</Text>
          </Pressable>
        </AppSurface>

        {/* 6-String Guitar Tuning Matrix */}
        <AppSurface isCard style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Feather name="list" size={16} color={theme.colors.accent} />
                <AppText variant="body" style={{ fontWeight: '800' }}>
                  6-String Tuning Health Matrix
                </AppText>
              </View>
              <AppText variant="caption" color="muted">
                {activeTuning.name} · {tuningStats.inTuneCount} of {strings.length} Strings Tuned
              </AppText>
            </View>

            <View style={[styles.scoreBadge, { backgroundColor: tuningStats.isFullyTuned ? theme.colors.successSoft : theme.colors.surfaceRaised }]}>
              <Text style={[styles.scoreText, { color: tuningStats.isFullyTuned ? theme.colors.success : theme.colors.accent }]}>
                {tuningStats.percentTuned}%
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={[styles.progressBarTrack, { backgroundColor: theme.colors.surfaceRaised }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${tuningStats.percentTuned}%`,
                  backgroundColor: tuningStats.isFullyTuned ? theme.colors.success : theme.colors.accent,
                },
              ]}
            />
          </View>

          {/* Matrix Rows */}
          <View style={styles.matrixContainer}>
            {strings.map((s) => {
              const targetHz = getTargetFrequency(s.midi + capoFret, referenceA4);
              const result = testedStrings[s.position];
              const isTuned = result?.inTune;
              const hasData = !!result;

              return (
                <View key={s.position} style={[styles.matrixRow, { borderBottomColor: theme.colors.border }]}>
                  <View style={styles.stringBadgeCol}>
                    <View style={[styles.stringNumberCircle, { backgroundColor: hasData ? (isTuned ? theme.colors.successSoft : theme.colors.warningSoft) : theme.colors.surfaceRaised }]}>
                      <Text style={[styles.stringNumberText, { color: hasData ? (isTuned ? theme.colors.success : theme.colors.warning) : theme.colors.textMuted }]}>
                        {s.position}
                      </Text>
                    </View>
                    <View>
                      <Text style={[styles.stringNoteText, { color: theme.colors.text }]}>{s.note}</Text>
                      <Text style={styles.stringTargetText}>{targetHz.toFixed(1)} Hz</Text>
                    </View>
                  </View>

                  <View style={styles.stringReadingCol}>
                    <Text style={[styles.readingHz, { color: hasData ? theme.colors.text : theme.colors.textMuted }]}>
                      {hasData ? `${result.detectedHz.toFixed(1)} Hz` : '—'}
                    </Text>
                    <Text style={[styles.readingCents, { color: hasData ? (isTuned ? theme.colors.success : theme.colors.warning) : theme.colors.textMuted }]}>
                      {hasData ? `${result.cents >= 0 ? '+' : ''}${result.cents.toFixed(1)}¢` : 'Waiting'}
                    </Text>
                  </View>

                  <View style={[styles.matrixStatusPill, {
                    backgroundColor: hasData ? (isTuned ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)') : 'rgba(255, 255, 255, 0.05)',
                    borderColor: hasData ? (isTuned ? theme.colors.success : theme.colors.warning) : theme.colors.border,
                  }]}>
                    <Feather
                      name={hasData ? (isTuned ? 'check' : 'alert-circle') : 'clock'}
                      size={11}
                      color={hasData ? (isTuned ? theme.colors.success : theme.colors.warning) : theme.colors.textMuted}
                    />
                    <Text style={[styles.matrixStatusText, {
                      color: hasData ? (isTuned ? theme.colors.success : theme.colors.warning) : theme.colors.textMuted,
                    }]}>
                      {hasData ? (isTuned ? 'PASS' : result.cents < 0 ? 'FLAT' : 'SHARP') : 'PENDING'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Interactive Benchmark Controls */}
          <View style={styles.actionRow}>
            <Pressable onPress={autoFillBenchmarkData} style={[styles.secondaryAction, { backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.border }]}>
              <Feather name="zap" size={14} color={theme.colors.accent} />
              <Text style={[styles.secondaryActionText, { color: theme.colors.text }]}>Auto-Fill Benchmark</Text>
            </Pressable>

            <Pressable onPress={clearTestedStrings} style={[styles.secondaryAction, { backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.border }]}>
              <Feather name="trash-2" size={14} color={theme.colors.error} />
              <Text style={[styles.secondaryActionText, { color: theme.colors.error }]}>Reset Matrix</Text>
            </Pressable>
          </View>
        </AppSurface>

        {/* File System Logging & Export Card */}
        <AppSurface isCard style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Feather name="file-text" size={16} color={theme.colors.accent} />
              <AppText variant="body" style={{ fontWeight: '800' }}>
                File System Telemetry Log
              </AppText>
            </View>
          </View>

          <AppText variant="caption" color="muted" style={{ lineHeight: 18 }}>
            Export a full ASCII benchmark report directly to your filesystem (.txt) containing exact pitch frequencies, cents offsets, and pass/fail thresholds.
          </AppText>

          {lastSavedPath && (
            <View style={[styles.savedPathBox, { backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.border }]}>
              <Feather name="check" size={13} color={theme.colors.success} />
              <Text style={[styles.savedPathText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {lastSavedPath}
              </Text>
            </View>
          )}

          <View style={styles.actionRow}>
            <Pressable onPress={handleExportFile} style={[styles.primaryAction, { backgroundColor: theme.colors.accent }]}>
              <Feather name="download" size={15} color="#FFFFFF" />
              <Text style={styles.primaryActionText}>Export Log File (.txt)</Text>
            </Pressable>

            <Pressable onPress={() => setShowLogModal(true)} style={[styles.secondaryAction, { backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.border }]}>
              <Feather name="eye" size={14} color={theme.colors.text} />
              <Text style={[styles.secondaryActionText, { color: theme.colors.text }]}>Preview Log</Text>
            </Pressable>
          </View>
        </AppSurface>

        {/* Developer Credit & GitHub Card */}
        <AppSurface isCard style={styles.developerCard}>
          <View style={styles.devRow}>
            <View style={styles.devAvatar}>
              <Feather name="github" size={20} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.devTitle, { color: theme.colors.text }]}>nishur31</Text>
              <Text style={styles.devSubtitle}>TuneGTR Core Architecture & Diagnostics</Text>
            </View>
            <Pressable
              onPress={() => Linking.openURL('https://github.com/nishur31')}
              style={[styles.githubBtn, { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft }]}
            >
              <Text style={[styles.githubBtnText, { color: theme.colors.accent }]}>GitHub</Text>
              <Feather name="external-link" size={11} color={theme.colors.accent} />
            </Pressable>
          </View>
        </AppSurface>
      </ScrollView>

      {/* Raw Log Preview Modal */}
      <Modal visible={showLogModal} transparent={true} animationType="slide" onRequestClose={() => setShowLogModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: '#0B1020', borderColor: theme.colors.border }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Feather name="terminal" size={18} color={theme.colors.accent} />
                <Text style={[styles.modalTitle, { color: '#FFFFFF' }]}>Telemetry Log Preview</Text>
              </View>
              <Pressable onPress={() => setShowLogModal(false)} style={styles.closeBtn}>
                <Feather name="x" size={18} color="#94A3B8" />
              </Pressable>
            </View>

            <ScrollView style={styles.logScrollView} showsVerticalScrollIndicator={true}>
              <Text style={styles.logMonospaceText}>{generateLogText()}</Text>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                onPress={() => {
                  handleExportFile();
                  setShowLogModal(false);
                }}
                style={[styles.primaryAction, { backgroundColor: theme.colors.accent }]}
              >
                <Feather name="download" size={15} color="#FFFFFF" />
                <Text style={styles.primaryActionText}>Download / Save .txt</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  testerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    borderWidth: 1,
  },
  testerBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  card: {
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  miniPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    borderWidth: 1,
  },
  miniPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  telemetryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  gridBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  gridLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  gridValue: {
    fontSize: 17,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    marginBottom: 2,
  },
  gridSub: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  captureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#6366F1',
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 4,
  },
  captureBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  scoreText: {
    fontSize: 13,
    fontWeight: '900',
  },
  progressBarTrack: {
    width: '100%',
    height: 8,
    borderRadius: 99,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 99,
  },
  matrixContainer: {
    gap: 2,
  },
  matrixRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  stringBadgeCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 80,
  },
  stringNumberCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stringNumberText: {
    fontSize: 12,
    fontWeight: '800',
  },
  stringNoteText: {
    fontSize: 13,
    fontWeight: '700',
  },
  stringTargetText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  stringReadingCol: {
    alignItems: 'center',
  },
  readingHz: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  readingCents: {
    fontSize: 10,
    fontWeight: '600',
  },
  matrixStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
    borderWidth: 1,
    minWidth: 70,
    justifyContent: 'center',
  },
  matrixStatusText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  primaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  secondaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  secondaryActionText: {
    fontWeight: '700',
    fontSize: 12,
  },
  savedPathBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  savedPathText: {
    fontSize: 11,
    flex: 1,
  },
  developerCard: {
    padding: 14,
  },
  devRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  devAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  devTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  devSubtitle: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  githubBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
  },
  githubBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '85%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  logScrollView: {
    maxHeight: 380,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 14,
    padding: 12,
  },
  logMonospaceText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 10,
    lineHeight: 14,
    color: '#78D6A5',
  },
  modalFooter: {
    paddingTop: 4,
  },
});
