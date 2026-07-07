import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Header from '../components/Header';
import StatCard from '../components/StatCard';
import StatusDot from '../components/StatusDot';
import { colors, spacing, radius, shadows } from '../theme';

interface Device {
  id: number;
  name: string;
  token: string;
  created_at: string;
  latest?: {
    latitude: number;
    longitude: number;
    timestamp: string;
    battery?: number;
    speed?: number;
  };
}

interface DevicesScreenProps {
  devices: Device[];
  activeToken: string | null;
  onSelectDevice: (id: number, token: string) => void;
  onRegisterDevice: (name: string) => Promise<void>;
  onOpenDrawer: () => void; // Prop para abrir el Drawer lateral
}

export default function DevicesScreen({
  devices,
  activeToken,
  onSelectDevice,
  onRegisterDevice,
  onOpenDrawer,
}: DevicesScreenProps) {
  const [search, setSearch] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [newName, setNewName] = useState('');

  const filtered = devices.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = devices.length;
  const onlineCount = devices.filter(d => !!d.latest).length;

  const handleRegister = async () => {
    if (!newName.trim()) return;
    await onRegisterDevice(newName.trim());
    setNewName('');
    setShowRegister(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <Header
        title="Dispositivos"
        leftAction={{ icon: 'menu', onPress: onOpenDrawer }}
        rightAction={{ icon: 'plus', onPress: () => setShowRegister(true) }}
      />

      {/* Resumen de Dispositivos (Fase 1: UI Visual) */}
      <View style={styles.summaryRow}>
        <StatCard
          icon="cellphone"
          value={activeCount}
          label="Activos"
          color={colors.primary}
          style={styles.summaryCard}
        />
        <StatCard
          icon="check-circle"
          value={onlineCount}
          label="En línea"
          color={colors.blue}
          style={styles.summaryCard}
        />
      </View>

      {/* Buscador */}
      <View style={styles.searchWrap}>
        <Icon name="magnify" size={20} color={colors.textDim} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar dispositivo..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search !== '' && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Icon name="close-circle" size={16} color={colors.textDim} />
          </TouchableOpacity>
        )}
      </View>

      {/* Lista de Dispositivos */}
      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="cellphone-off" size={48} color={colors.textMuted} style={styles.emptyIcon} />
            <Text style={styles.emptyText}>No hay dispositivos</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => setShowRegister(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyBtnText}>Registrar primero</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const isActive = item.token === activeToken;
          const isOnline = !!item.latest;
          const time = item.latest ? formatTime(item.latest.timestamp) : '--';
          const latStr = item.latest ? item.latest.latitude.toFixed(4) : '--';
          const lngStr = item.latest ? item.latest.longitude.toFixed(4) : '--';
          const battery = item.latest?.battery != null ? `${Math.round(item.latest.battery)}%` : '--';
          const speed = item.latest?.speed != null ? `${(item.latest.speed * 3.6).toFixed(0)} km/h` : '--';

          return (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => onSelectDevice(item.id, item.token)}
              style={styles.cardContainer}
            >
              <Card style={[styles.deviceCard, isActive && styles.activeCard]}>
                <View style={styles.deviceRow}>
                  {/* Left: Icon & Info */}
                  <View style={styles.deviceLeft}>
                    <View style={[styles.deviceIcon, isActive && styles.activeDeviceIcon]}>
                      <Icon name="cellphone" size={24} color={isActive ? colors.primary : colors.textDim} />
                    </View>
                    <View style={styles.deviceInfo}>
                      <View style={styles.deviceNameRow}>
                        <Text style={styles.deviceName}>{item.name}</Text>
                        {isActive && <Badge label="ACTUAL" variant="online" size="sm" />}
                      </View>
                      
                      {/* Fila de mini-stats */}
                      <View style={styles.miniStatsRow}>
                        <View style={styles.miniStat}>
                          <Icon name="speedometer" size={12} color={colors.textMuted} />
                          <Text style={styles.miniStatText}>{speed}</Text>
                        </View>
                        <View style={styles.miniStat}>
                          <Icon name="battery" size={12} color={colors.textMuted} />
                          <Text style={styles.miniStatText}>{battery}</Text>
                        </View>
                      </View>

                      <Text style={styles.deviceCoords}>
                        Lat: {latStr} • Lng: {lngStr}
                      </Text>
                    </View>
                  </View>

                  {/* Right: Status Dot & Time */}
                  <View style={styles.deviceRight}>
                    <StatusDot online={isOnline} />
                    <Text style={styles.deviceTime}>{time}</Text>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          );
        }}
      />

      {/* Modal de Registro */}
      {showRegister && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Registrar dispositivo</Text>
            <View style={styles.modalInputWrapper}>
              <Icon name="cellphone" size={20} color={colors.textDim} style={styles.modalInputIcon} />
              <TextInput
                style={styles.modalInput}
                placeholder="Nombre del dispositivo"
                placeholderTextColor={colors.textMuted}
                value={newName}
                onChangeText={setNewName}
                autoFocus
              />
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setShowRegister(false);
                  setNewName('');
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={handleRegister}
                activeOpacity={0.8}
              >
                <Text style={styles.modalConfirmText}>Registrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

function formatTime(ts: string) {
  const d = new Date(ts + 'Z');
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return 'ahora';
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)}s`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)}h`;
  return d.toLocaleDateString();
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  summaryCard: {
    padding: spacing.md - 2,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginVertical: spacing.md,
    backgroundColor: colors.bgInput,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    height: 44,
  },
  searchIcon: { marginRight: spacing.sm },
  searchInput: { flex: 1, color: colors.text, fontSize: 14, paddingVertical: 0 },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl },
  cardContainer: {
    marginBottom: spacing.sm,
  },
  deviceCard: {
    padding: spacing.md,
  },
  activeCard: {
    borderColor: colors.primary,
    borderWidth: 1,
  },
  deviceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deviceLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  deviceIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.bgCard2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeDeviceIcon: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary + '30',
  },
  deviceInfo: { flex: 1 },
  deviceNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  deviceName: { fontSize: 15, fontWeight: 'bold', color: colors.text },
  miniStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: spacing.md,
  },
  miniStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniStatText: {
    fontSize: 11,
    color: colors.textDim,
    marginLeft: 3,
  },
  deviceCoords: { fontFamily: 'monospace', fontSize: 11, color: colors.textMuted },
  deviceRight: { alignItems: 'flex-end', justifyContent: 'center' },
  deviceTime: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { marginBottom: spacing.md },
  emptyText: { fontSize: 15, color: colors.textMuted, fontWeight: '600' },
  emptyBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.md,
  },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  modal: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.xl,
    width: '85%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: spacing.lg, color: colors.text },
  modalInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgInput,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 48,
    marginBottom: spacing.lg,
  },
  modalInputIcon: {
    marginRight: spacing.sm,
  },
  modalInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    paddingVertical: 0,
  },
  modalBtns: { flexDirection: 'row', gap: spacing.sm },
  modalCancel: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgCard2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelText: { fontSize: 14, color: colors.textDim, fontWeight: '600' },
  modalConfirm: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  modalConfirmText: { fontSize: 14, color: '#fff', fontWeight: 'bold' },
});
