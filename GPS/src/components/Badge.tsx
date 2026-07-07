import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, fonts } from '../theme';

interface BadgeProps {
  label: string;
  variant?: 'online' | 'offline' | 'info' | 'warning' | 'success';
  size?: 'sm' | 'md';
}

const variantColors = {
  online: { bg: '#0d3320', text: colors.online, dot: colors.online },
  offline: { bg: '#331111', text: colors.offline, dot: colors.offline },
  info: { bg: '#0c1f3a', text: colors.blue, dot: colors.blue },
  warning: { bg: '#332a0d', text: colors.yellow, dot: colors.yellow },
  success: { bg: '#0d3320', text: colors.green, dot: colors.green },
};

export default function Badge({ label, variant = 'info', size = 'md' }: BadgeProps) {
  const vc = variantColors[variant];
  const isSm = size === 'sm';
  return (
    <View style={[styles.badge, { backgroundColor: vc.bg }, isSm && styles.sm]}>
      <View style={[styles.dot, { backgroundColor: vc.dot }, isSm && styles.dotSm]} />
      <Text style={[styles.label, { color: vc.text }, isSm && styles.labelSm]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    gap: 6,
  },
  sm: { paddingHorizontal: spacing.sm, paddingVertical: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotSm: { width: 6, height: 6, borderRadius: 3 },
  label: { ...fonts.small, fontWeight: '600' },
  labelSm: { ...fonts.tiny, fontWeight: '600' },
});
