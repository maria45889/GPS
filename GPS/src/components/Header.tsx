import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, radius } from '../theme';

interface HeaderProps {
  title: string;
  subtitle?: string;
  leftAction?: { icon: string; onPress: () => void };
  rightAction?: { icon: string; onPress: () => void };
}

export default function Header({ title, subtitle, leftAction, rightAction }: HeaderProps) {
  return (
    <View style={styles.header}>
      {leftAction ? (
        <TouchableOpacity style={styles.actionBtn} onPress={leftAction.onPress} activeOpacity={0.7}>
          <Icon name={leftAction.icon} size={22} color={colors.text} />
        </TouchableOpacity>
      ) : (
        // Espaciador si no hay acción izquierda
        <View style={styles.spacer} />
      )}

      <View style={styles.center}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
      </View>

      {rightAction ? (
        <TouchableOpacity style={styles.actionBtn} onPress={rightAction.onPress} activeOpacity={0.7}>
          <Icon name={rightAction.icon} size={22} color={colors.primary} />
        </TouchableOpacity>
      ) : (
        // Espaciador si no hay acción derecha
        <View style={styles.spacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingTop: spacing.xxl,
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textDim,
    marginTop: 2,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.bgCard2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  spacer: {
    width: 40,
    height: 40,
  },
});
