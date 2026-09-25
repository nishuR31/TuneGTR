import React, { useEffect } from "react";
import { View, useWindowDimensions, StyleSheet } from "react-native";
import { useTunerStore } from "../store/tunerStore";
import { useTheme } from "../../../theme/ThemeProvider";
import { AppText } from "../../../components/common/AppText";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';
import Feather from '@expo/vector-icons/Feather';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Polar to SVG cartesian (0° = top, clockwise) */
function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** SVG arc path segment */
function svgArcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const s = polarToXY(cx, cy, r, startDeg);
  const e = polarToXY(cx, cy, r, endDeg);
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

const GAUGE_START_DEG = -135;  // -50¢
const GAUGE_END_DEG = 135;     // +50¢
const GAUGE_RANGE_DEG = 270;
const IN_TUNE_CENTS = 8;

function centsToAngle(cents: number): number {
  const c = Math.max(-50, Math.min(50, cents));
  return GAUGE_START_DEG + ((c + 50) / 100) * GAUGE_RANGE_DEG;
}

export const CentsGauge: React.FC = () => {
  const { cents, tunerState } = useTunerStore();
  const theme = useTheme();
  const { width: screenWidth } = useWindowDimensions();

  const isActive =
    tunerState === "in_tune" ||
    tunerState === "flat" ||
    tunerState === "sharp" ||
    tunerState === "signal_detected";

  const clampedCents = Math.max(-50, Math.min(50, cents));
  const isInTune = tunerState === "in_tune";

  // Animated needle angle (degrees)
  const needleAngleDeg = useSharedValue(0);
  useEffect(() => {
    const target = isActive ? centsToAngle(clampedCents) : 0;
    needleAngleDeg.value = withSpring(target, {
      mass: 0.4,
      damping: 16,
      stiffness: 130,
    });
  }, [clampedCents, isActive]);

  // Determine accent color
  let accentColor = theme.colors.accent;
  if (isActive) {
    if (isInTune) accentColor = theme.colors.success;
    else if (Math.abs(clampedCents) > 25) accentColor = theme.colors.error;
    else if (Math.abs(clampedCents) > 10) accentColor = theme.colors.warning;
    else accentColor = theme.colors.accent;
  }

  // Gauge geometry
  const gaugeW = Math.min(screenWidth - 40, 320);
  const gaugeH = gaugeW * 0.52;
  const cx = gaugeW / 2;
  // Pivot point: place it lower than the visible SVG area so the arc appears above
  const cy = gaugeH + 20;
  const outerR = gaugeW * 0.44;
  const innerR = outerR * 0.76;
  const trackR = (outerR + innerR) / 2;
  const trackW = outerR - innerR;
  const needleLen = outerR * 0.88;

  const trackColor = theme.mode === 'light' ? '#D5DAE6' : '#252B3A';
  const inTuneColor = theme.colors.successSoft;

  // Animated needle path (tip & base computed from angle)
  const needleAnimatedProps = useAnimatedProps(() => {
    const rad = (needleAngleDeg.value - 90) * (Math.PI / 180);
    const tipX = cx + needleLen * Math.cos(rad);
    const tipY = cy + needleLen * Math.sin(rad);
    // Small base offset behind pivot for visual balance
    const baseOffset = 10;
    const baseRad = rad + Math.PI;
    const baseX = cx + baseOffset * Math.cos(baseRad);
    const baseY = cy + baseOffset * Math.sin(baseRad);
    return {
      d: `M ${baseX.toFixed(2)} ${baseY.toFixed(2)} L ${tipX.toFixed(2)} ${tipY.toFixed(2)}`,
    };
  });

  // Pivot circle animated props
  const pivotAnimatedProps = useAnimatedProps(() => ({
    r: 6,
    opacity: isActive ? 1 : 0.3,
  }));

  // Tick data
  const ticks = [
    { c: -40, major: true, label: '-40' },
    { c: -20, major: true, label: '-20' },
    { c: -10, major: false, label: null },
    { c: 0, center: true, label: '0' },
    { c: 10, major: false, label: null },
    { c: 20, major: true, label: '+20' },
    { c: 40, major: true, label: '+40' },
  ];

  // Display
  const centsDisplay = () => {
    if (!isActive) return '—';
    if (isInTune || Math.abs(clampedCents) < 0.5) return '0.0¢';
    const sign = clampedCents > 0 ? '+' : '';
    return `${sign}${clampedCents.toFixed(1)}¢`;
  };

  const showFlat = isActive && clampedCents < -IN_TUNE_CENTS;
  const showSharp = isActive && clampedCents > IN_TUNE_CENTS;

  return (
    <View style={styles.container}>
      {/* Arc gauge — SVG with overflow visible so needle below gauge height shows */}
      <Svg
        width={gaugeW}
        height={gaugeH}
        style={{ overflow: 'visible' }}
      >
        {/* Background track arc */}
        <Path
          d={svgArcPath(cx, cy, trackR, GAUGE_START_DEG, GAUGE_END_DEG)}
          stroke={trackColor}
          strokeWidth={trackW}
          fill="none"
          strokeLinecap="round"
        />

        {/* In-tune green zone */}
        <Path
          d={svgArcPath(cx, cy, trackR, centsToAngle(-IN_TUNE_CENTS), centsToAngle(IN_TUNE_CENTS))}
          stroke={inTuneColor}
          strokeWidth={trackW}
          fill="none"
          strokeLinecap="butt"
        />

        {/* Tick marks */}
        {ticks.map(({ c, major, center }) => {
          const angle = centsToAngle(c);
          const tickOuter = polarToXY(cx, cy, outerR + (center ? 6 : major ? 3 : 0), angle);
          const tickInner = polarToXY(cx, cy, innerR - (center ? 6 : major ? 3 : 5), angle);
          const color = center
            ? theme.colors.success
            : theme.mode === 'light' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.22)';
          return (
            <Line
              key={c}
              x1={tickOuter.x} y1={tickOuter.y}
              x2={tickInner.x} y2={tickInner.y}
              stroke={color}
              strokeWidth={center ? 2.5 : major ? 1.5 : 1}
              strokeLinecap="round"
            />
          );
        })}

        {/* Tick labels */}
        {ticks.filter(t => t.label !== null).map(({ c, label, center }) => {
          const angle = centsToAngle(c);
          const pos = polarToXY(cx, cy, innerR - 16, angle);
          const labelColor = center
            ? theme.colors.success
            : theme.mode === 'light' ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.28)';
          return (
            <SvgText
              key={c}
              x={pos.x} y={pos.y}
              textAnchor="middle"
              alignmentBaseline="middle"
              fontSize={8.5}
              fill={labelColor}
              fontWeight={center ? '700' : '400'}
            >
              {label}
            </SvgText>
          );
        })}

        {/* Animated needle */}
        <AnimatedPath
          animatedProps={needleAnimatedProps}
          stroke={isActive ? accentColor : theme.colors.textMuted}
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
          opacity={isActive ? 1 : 0.25}
        />

        {/* Needle pivot outer ring */}
        <Circle
          cx={cx} cy={cy} r={9}
          fill={isActive ? accentColor : theme.colors.textMuted}
          opacity={isActive ? 0.2 : 0.1}
        />
        {/* Pivot solid dot */}
        <Circle
          cx={cx} cy={cy} r={5.5}
          fill={isActive ? accentColor : theme.colors.textMuted}
          opacity={isActive ? 1 : 0.25}
        />
        {/* Pivot center highlight */}
        <Circle
          cx={cx} cy={cy} r={2.5}
          fill={theme.mode === 'light' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)'}
        />
      </Svg>

      {/* Digital readout + directional arrows */}
      <View style={styles.readoutRow}>
        <View style={styles.arrowSlot}>
          {showFlat && (
            <View style={styles.arrowContent}>
              <Feather name="arrow-up" size={12} color={accentColor} />
              <AppText variant="caption" style={[styles.arrowText, { color: accentColor }]}>
                TUNE UP
              </AppText>
            </View>
          )}
        </View>

        <View style={[
          styles.centsChip,
          {
            backgroundColor: isActive
              ? (isInTune ? theme.colors.successSoft : theme.colors.surfaceRaised)
              : 'transparent',
          },
        ]}>
          <AppText variant="caption" style={[styles.centsValue, { color: accentColor }]}>
            {centsDisplay()}
          </AppText>
        </View>

        <View style={[styles.arrowSlot, { alignItems: 'flex-end' }]}>
          {showSharp && (
            <View style={styles.arrowContent}>
              <AppText variant="caption" style={[styles.arrowText, { color: accentColor }]}>
                TUNE DOWN
              </AppText>
              <Feather name="arrow-down" size={12} color={accentColor} />
            </View>
          )}
        </View>
      </View>

      {/* Corner indicators */}
      <View style={[styles.flatSharpRow, { width: gaugeW }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Feather name="trending-down" size={11} color={theme.colors.textMuted} style={{ marginRight: 4 }} />
          <AppText variant="caption" color="muted" style={styles.cornerLabel}>FLAT</AppText>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <AppText variant="caption" color="muted" style={styles.cornerLabel}>SHARP</AppText>
          <Feather name="trending-up" size={11} color={theme.colors.textMuted} style={{ marginLeft: 4 }} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
  },
  readoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    width: '100%',
    paddingHorizontal: 16,
    justifyContent: 'center',
    gap: 6,
  },
  arrowSlot: {
    flex: 1,
    height: 22,
    justifyContent: 'center',
  },
  arrowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  arrowText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  centsChip: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
    minWidth: 72,
    alignItems: 'center',
  },
  centsValue: {
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  flatSharpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 6,
  },
  cornerLabel: {
    fontSize: 10,
    fontWeight: '600',
    opacity: 0.5,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});
