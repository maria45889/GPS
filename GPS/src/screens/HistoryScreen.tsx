import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import MapView from '../components/MapView';
import Card from '../components/Card';
import Header from '../components/Header';
import StatCard from '../components/StatCard';
import { colors, spacing, radius, shadows } from '../theme';

interface LocationPoint {
  id?: number;
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  battery?: number;
  timestamp?: string;
}

interface HistoryScreenProps {
  history: LocationPoint[];
  deviceName: string;
  onOpenDrawer: () => void; // Prop para abrir el menú lateral
}

function calculateDistance(points: LocationPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversine(points[i - 1], points[i]);
  }
  return total;
}

function haversine(a: LocationPoint, b: LocationPoint): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export default function HistoryScreen({ history, deviceName, onOpenDrawer }: HistoryScreenProps) {
  const totalKm = calculateDistance(history);
  const totalPoints = history.length;
  const avgSpeed = totalPoints > 1 && history[0]?.speed
    ? (history.reduce((s, p) => s + (p.speed || 0), 0) / totalPoints) * 3.6
    : null;

  const ascHistory = [...history].reverse();
  const lastLoc = history.length > 0 ? history[0] : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <Header
        title="Historial"
        subtitle={deviceName}
        leftAction={{ icon: 'menu', onPress: onOpenDrawer }}
        rightAction={{ icon: 'calendar', onPress: () => {} }} // Fase 2 placeholder
      />

      <FlatList
        data={ascHistory}
        keyExtractor={(item, idx) => String(item.id || idx)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.headerComponent}>
            {lastLoc && (
              <View style={styles.mapWrap}>
                <MapView
                  latitude={lastLoc.latitude}
                  longitude={lastLoc.longitude}
                  locations={ascHistory}
                  height={200}
                />
              </View>
            )}

            {/* Fila de resumen de viaje */}
            <View style={styles.summaryRow}>
              <StatCard
                icon="map-marker-distance"
                value={totalKm >= 1 ? `${totalKm.toFixed(1)} km` : `${(totalKm * 1000).toFixed(0)} m`}
                label="Distancia"
                color={colors.primary}
                style={styles.summaryCard}
              />
              <StatCard
                icon="clock-outline"
                value={totalPoints > 0 ? `${totalPoints}` : '--'}
                label="Puntos"
                color={colors.blue}
                style={styles.summaryCard}
              />
              <StatCard
                icon="speedometer"
                value={avgSpeed ? `${avgSpeed.toFixed(0)} km/h` : '--'}
                label="Vel. Prom"
                color={colors.accent}
                style={styles.summaryCard}
              />
            </View>

            <Text style={styles.sectionTitle}>Línea de tiempo de actividad</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const time = item.timestamp
            ? new Date(item.timestamp + 'Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '--';
          const date = item.timestamp
            ? new Date(item.timestamp + 'Z').toLocaleDateString([], { month: 'short', day: 'numeric' })
            : '';
          const isFirst = index === 0;
          const isLast = index === ascHistory.length - 1;

          // Icono y color según la posición en la timeline
          const iconName = isFirst ? 'play' : isLast ? 'flag-checkered' : 'map-marker';
          const iconColor = isFirst ? colors.primary : isLast ? colors.accent : colors.textDim;

          return (
            <View style={styles.historyItem}>
              <View style={styles.timeline}>
                <View style={[styles.timelineIconWrapper, { borderColor: iconColor }]}>
                  <Icon name={iconName} size={14} color={iconColor} />
                </View>
                {!isLast && <View style={styles.timelineLine} />}
              </View>
              
              <Card style={styles.historyCard}>
                <View style={styles.historyRow}>
                  <View style={styles.historyLeft}>
                    <Text style={styles.historyTime}>{time}</Text>
                    <Text style={styles.historyDate}>{date}</Text>
                  </View>
                  <View style={styles.historyRight}>
                    <Text style={styles.historyCoords}>
                      {item.latitude.toFixed(5)} • {item.longitude.toFixed(5)}
                    </Text>
                    {item.accuracy != null && (
                      <View style={styles.metaRow}>
                        <Icon name="crosshairs-gps" size={10} color={colors.textMuted} />
                        <Text style={styles.historyMeta}>±{item.accuracy.toFixed(0)}m</Text>
                      </View>
                    )}
                  </View>
                </View>
              </Card>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  list: { paddingBottom: spacing.xxl },
  headerComponent: {
    paddingTop: spacing.md,
  },
  mapWrap: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  summaryCard: {
    padding: spacing.sm,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textDim,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  historyItem: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  timeline: {
    width: 32,
    alignItems: 'center',
  },
  timelineIconWrapper: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    borderWidth: 1.5,
    backgroundColor: colors.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    zIndex: 2,
  },
  timelineLine: {
    position: 'absolute',
    top: 30,
    bottom: -16,
    width: 1.5,
    backgroundColor: colors.border,
    zIndex: 1,
  },
  historyCard: {
    flex: 1,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyLeft: {
    justifyContent: 'center',
  },
  historyTime: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  historyDate: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  historyRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  historyCoords: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  historyMeta: {
    fontSize: 10,
    color: colors.textMuted,
    marginLeft: 3,
  },
});
