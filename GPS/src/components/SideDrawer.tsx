import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, radius } from '../theme';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.78;

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeScreen: string;
  onSelectScreen: (screen: any) => void;
}

export default function SideDrawer({
  isOpen,
  onClose,
  activeScreen,
  onSelectScreen,
}: SideDrawerProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: isOpen ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOpen]);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-DRAWER_WIDTH, 0],
  });

  const backdropOpacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  const handleSelect = (screen: string) => {
    onSelectScreen(screen);
    onClose();
  };

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 1000 }]} pointerEvents={isOpen ? 'auto' : 'none'}>
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: backdropOpacity,
            },
          ]}
        />
      </TouchableWithoutFeedback>

      {/* Drawer Content */}
      <Animated.View
        style={[
          styles.drawerContainer,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Icon name="map-marker-radius" size={28} color={colors.primary} />
              <Text style={styles.logoText}>
                GPS<Text style={{ color: colors.primary }}>Tracker</Text>
              </Text>
            </View>
            <Text style={styles.versionText}>v1.0.0</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.menuContainer}>
            {/* Secciones funcionales */}
            <DrawerItem
              icon="map"
              label="En vivo"
              active={activeScreen === 'dashboard'}
              onPress={() => handleSelect('dashboard')}
            />
            <DrawerItem
              icon="history"
              label="Historial"
              active={activeScreen === 'history'}
              onPress={() => handleSelect('history')}
            />
            <DrawerItem
              icon="cellphone"
              label="Dispositivos"
              active={activeScreen === 'devices'}
              onPress={() => handleSelect('devices')}
            />

            {/* Placeholder para Fase 2 */}
            <DrawerItem
              icon="vector-square"
              label="Geocercas"
              active={false}
              disabled
              badge="Fase 2"
            />
            <DrawerItem
              icon="bell-ring"
              label="Alertas"
              active={false}
              disabled
              badge="Fase 2"
            />

            <DrawerItem
              icon="cog"
              label="Ajustes"
              active={activeScreen === 'settings'}
              onPress={() => handleSelect('settings')}
            />
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.logoutButton} onPress={() => handleSelect('home')}>
              <Icon name="exit-to-app" size={22} color={colors.accent} />
              <Text style={styles.logoutText}>Cerrar sesión</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

interface DrawerItemProps {
  icon: string;
  label: string;
  active: boolean;
  onPress?: () => void;
  disabled?: boolean;
  badge?: string;
}

function DrawerItem({ icon, label, active, onPress, disabled, badge }: DrawerItemProps) {
  return (
    <TouchableOpacity
      style={[
        styles.item,
        active && styles.itemActive,
        disabled && styles.itemDisabled,
      ]}
      onPress={disabled ? undefined : onPress}
      activeOpacity={disabled ? 0.9 : 0.7}
    >
      <View style={styles.itemLeft}>
        <Icon
          name={icon}
          size={22}
          color={active ? colors.primary : disabled ? colors.textMuted : colors.textDim}
        />
        <Text style={[styles.label, active && styles.labelActive, disabled && styles.labelDisabled]}>
          {label}
        </Text>
      </View>
      {badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  drawerContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: colors.bgCard,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    elevation: 16,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    padding: spacing.xl,
    paddingTop: spacing.xxl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginLeft: spacing.xs,
  },
  versionText: {
    fontSize: 10,
    color: colors.textMuted,
    backgroundColor: colors.bgInput,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  menuContainer: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginVertical: spacing.xs,
    borderRadius: radius.md,
  },
  itemActive: {
    backgroundColor: colors.bgCard2,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  itemDisabled: {
    opacity: 0.5,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 15,
    color: colors.textDim,
    marginLeft: spacing.md,
  },
  labelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  labelDisabled: {
    color: colors.textMuted,
  },
  badge: {
    backgroundColor: colors.bgInput,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  badgeText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },
  footer: {
    padding: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 15,
    color: colors.accent,
    fontWeight: '600',
    marginLeft: spacing.md,
  },
});
