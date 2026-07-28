import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { colors, spacing, radius, fonts } from '../theme';

export interface Tab {
  key: string;
  label: string;
  icon: string;
}

interface TabBarProps {
  tabs: Tab[];
  active: string;
  onSelect: (key: string) => void;
}

export default function TabBar({ tabs, active, onSelect }: TabBarProps) {
  return (
    <View style={styles.container}>
      {tabs.map(tab => (
        <TabButton
          key={tab.key}
          tab={tab}
          isActive={active === tab.key}
          onPress={() => onSelect(tab.key)}
        />
      ))}
    </View>
  );
}

function TabButton({ tab, isActive, onPress }: { tab: Tab; isActive: boolean; onPress: () => void }) {
  const scale = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: isActive ? 1 : 0,
      tension: 300,
      friction: 20,
      useNativeDriver: true,
    }).start();
  }, [isActive, scale]);

  return (
    <TouchableOpacity style={styles.tab} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
        <Text style={[styles.icon, isActive && styles.iconActive]}>{tab.icon}</Text>
      </View>
      <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: spacing.xs,
    paddingTop: spacing.xs,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  iconWrap: {
    width: 40,
    height: 28,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapActive: {
    backgroundColor: `${colors.primary}20`,
  },
  icon: { fontSize: 20, opacity: 0.5 },
  iconActive: { opacity: 1 },
  label: { ...fonts.tiny, marginTop: 1, opacity: 0.5, fontSize: 9 },
  labelActive: { color: colors.primary, opacity: 1, fontWeight: '600' },
});
