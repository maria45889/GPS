import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import MapView from '../components/MapView';
import Badge from '../components/Badge';
import BatteryIndicator from '../components/BatteryIndicator';
import StatusDot from '../components/StatusDot';
import { colors, spacing, radius, shadows } from '../theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  battery?: number;
  timestamp?: string;
}

interface DashboardScreenProps {
  tracking: boolean;
  location: LocationData | null;
  history: LocationData[];
  onToggleTracking: () => void;
  batteryLevel: number | null;
  deviceName: string;
  deviceRegistered: boolean;
  onRefresh: () => void;
  onOpenDrawer: () => void; // Prop para abrir el Drawer
}

export default function DashboardScreen({
  tracking,
  location,
  history,
  onToggleTracking,
  batteryLevel,
  deviceName,
  deviceRegistered,
  onRefresh,
  onOpenDrawer,
}: DashboardScreenProps) {
  const [cardExpanded, setCardExpanded] = useState(false);
  const cardAnim = useCardAnimation(cardExpanded);

  const lat = location?.latitude ?? -0.22;
  const lng = location?.longitude ?? -78.512;
  const speed = location?.speed != null ? (location.speed * 3.6).toFixed(0) : '--';
  const accuracy = location?.accuracy != null ? `${location.accuracy.toFixed(0)}m` : '--';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Mapa */}
      <View style={styles.mapContainer}>
        <MapView latitude={lat} longitude={lng} locations={history} />
      </View>

      {/* Top Bar Overlay */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.menuBtn} onPress={onOpenDrawer} activeOpacity={0.7}>
          <Icon name="menu" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.statusPill}>
          <StatusDot online={tracking} />
          <Text style={styles.statusPillText}>
            {tracking ? 'Enviando ubicación...' : 'Rastreo detenido'}
          </Text>
        </View>
        <TouchableOpacity style={styles.menuBtn} onPress={onRefresh} activeOpacity={0.7}>
          <Icon name="refresh" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Panel Inferior */}
      <Animated.View style={[styles.bottomCard, { transform: [{ translateY: cardAnim }] }]}>
        <TouchableOpacity
          style={styles.cardHandle}
          onPress={() => setCardExpanded(!cardExpanded)}
          activeOpacity={0.8}
        >
          <View style={styles.handle} />
        </TouchableOpacity>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xl }}>
          <View style={styles.cardContent}>
            {/* Header del dispositivo */}
            <View style={styles.cardHeader}>
              <View style={styles.headerInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.deviceName}>{deviceName || 'Mi Dispositivo'}</Text>
                  <StatusDot online={tracking} />
                </View>
                <Text style={styles.statusSubtext}>
                  {tracking ? 'En línea y transmitiendo' : 'Fuera de línea'}
                </Text>
              </View>
              <Badge
                label={deviceRegistered ? 'Registrado' : 'Offline'}
                variant={deviceRegistered ? 'online' : 'offline'}
                size="sm"
              />
            </View>

            {/* Quick Stats Grid */}
            <View style={styles.quickStats}>
              <View style={styles.quickStatBox}>
                <Icon name="speedometer" size={22} color={colors.primary} />
                <Text style={styles.quickStatValue}>{speed} km/h</Text>
                <Text style={styles.quickStatLabel}>Velocidad</Text>
              </View>
              <View style={styles.quickStatBox}>
                <Icon name="crosshairs-gps" size={22} color={colors.blue} />
                <Text style={styles.quickStatValue}>{accuracy}</Text>
                <Text style={styles.quickStatLabel}>Precisión</Text>
              </View>
              <View style={styles.quickStatBox}>
                <Icon name="battery-high" size={22} color={colors.green} />
                <Text style={styles.quickStatValue}>
                  {batteryLevel != null ? `${Math.round(batteryLevel)}%` : '--'}
                </Text>
                <Text style={styles.quickStatLabel}>Batería</Text>
              </View>
            </View>

            {/* Botón de control de tracking */}
            <TouchableOpacity
              style={[styles.actionBtn, tracking ? styles.actionBtnStop : styles.actionBtnStart]}
              onPress={onToggleTracking}
              activeOpacity={0.8}
            >
              <Icon
                name={tracking ? 'stop-circle-outline' : 'play-circle-outline'}
                size={22}
                color="#fff"
              />
              <Text style={styles.actionBtnText}>
                {tracking ? 'DETENER ENVÍO' : 'INICIAR ENVÍO'}
              </Text>
            </TouchableOpacity>

            {/* Más detalles al expandir */}
            {cardExpanded && (
              <View style={styles.expandedContent}>
                <View style={styles.divider} />
                <Text style={styles.sectionTitle}>Detalles del dispositivo</Text>

                <View style={styles.detailRow}>
                  <View style={styles.detailBox}>
                    <Text style={styles.detailLabel}>LATITUD</Text>
                    <Text style={styles.detailValue}>{lat.toFixed(6)}</Text>
                  </View>
                  <View style={styles.detailBox}>
                    <Text style={styles.detailLabel}>LONGITUD</Text>
                    <Text style={styles.detailValue}>{lng.toFixed(6)}</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <View style={styles.detailBox}>
                    <Text style={styles.detailLabel}>PUNTOS REGISTRADOS</Text>
                    <Text style={styles.detailValue}>{history.length}</Text>
                  </View>
                  <View style={styles.detailBox}>
                    <Text style={styles.detailLabel}>BATERÍA DETALLADA</Text>
                    <View style={styles.batteryRow}>
                      <BatteryIndicator level={batteryLevel} />
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

function useCardAnimation(expanded: boolean) {
  const [anim] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.spring(anim, {
      toValue: expanded ? -160 : 0,
      tension: 100,
      friction: 12,
      useNativeDriver: true,
    }).start();
  }, [expanded, anim]);
  return anim;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  mapContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  topBar: {
    position: 'absolute',
    top: spacing.xxl + 10,
    left: spacing.md,
    right: spacing.md,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(18, 18, 42, 0.85)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 10,
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgInput,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 4,
  },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
    maxHeight: SCREEN_H * 0.52,
    minHeight: 240,
    ...shadows.card,
  },
  cardHandle: { alignItems: 'center', paddingVertical: spacing.md },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.borderLight },
  cardContent: { paddingHorizontal: spacing.lg },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  headerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginRight: 6,
  },
  statusSubtext: {
    fontSize: 12,
    color: colors.textDim,
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  quickStatBox: {
    flex: 1,
    backgroundColor: colors.bgCard2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 6,
  },
  quickStatLabel: {
    fontSize: 9,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: radius.md,
    width: '100%',
    ...shadows.card,
  },
  actionBtnStart: {
    backgroundColor: colors.primary,
  },
  actionBtnStop: {
    backgroundColor: colors.accent,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 1,
    marginLeft: 6,
  },
  expandedContent: {
    marginTop: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textDim,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  detailBox: {
    flex: 1,
    backgroundColor: colors.bgCard2,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailLabel: {
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailValue: {
    fontFamily: 'monospace',
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  batteryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 18,
  },
});
