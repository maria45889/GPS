import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, fonts } from '../theme';

interface BatteryIndicatorProps {
  level: number | null;
}

export default function BatteryIndicator({ level }: BatteryIndicatorProps) {
  if (level == null) return <Text style={fonts.small}>--</Text>;

  const pct = Math.min(100, Math.max(0, level));
  const color = pct > 50 ? colors.green : pct > 20 ? colors.yellow : colors.red;
  const fillWidth = pct;

  return (
    <View style={styles.container}>
      <View style={styles.outer}>
        <View style={[styles.fill, { width: `${fillWidth}%`, backgroundColor: color }]} />
      </View>
      <View style={styles.cap} />
      <Text style={[fonts.small, { color, fontWeight: '600', marginLeft: 6 }]}>
        {Math.round(pct)}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center' },
  outer: {
    width: 36,
    height: 16,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    backgroundColor: colors.bgCard2,
  },
  fill: { height: '100%', borderRadius: 1.5 },
  cap: {
    width: 3,
    height: 6,
    borderRadius: 1,
    backgroundColor: colors.borderLight,
    marginLeft: 1,
  },
});
