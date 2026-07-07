import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Switch,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Card from '../components/Card';
import Header from '../components/Header';
import { colors, spacing, radius, shadows } from '../theme';

interface SettingsScreenProps {
  deviceName: string;
  deviceToken: string | null;
  onSaveServerUrl: (url: string) => void;
  onSaveDeviceName: (name: string) => void;
  onSaveInterval: (ms: number) => void;
  onClearData: () => void;
  onOpenDrawer: () => void; // Prop para abrir el Drawer
}

export default function SettingsScreen({
  deviceName,
  deviceToken,
  onSaveServerUrl,
  onSaveDeviceName,
  onSaveInterval,
  onClearData,
  onOpenDrawer,
}: SettingsScreenProps) {
  const [serverUrl, setServerUrl] = useState('');
  const [name, setName] = useState(deviceName);
  const [interval, setInterval] = useState('30');
  const [bgEnabled, setBgEnabled] = useState(true);
  const [onlyOnMotion, setOnlyOnMotion] = useState(false); // Fase 2 visual placeholder
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setServerUrl('');
    setName(deviceName);
  }, [deviceName]);

  const handleSave = () => {
    if (name.trim()) onSaveDeviceName(name.trim());
    const intervalMs = parseInt(interval) * 1000;
    if (intervalMs >= 5000) onSaveInterval(intervalMs);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <Header
        title="Ajustes"
        leftAction={{ icon: 'menu', onPress: onOpenDrawer }}
      />

      {/* SECCIÓN CONFIGURACIÓN */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Conexión al Servidor</Text>
        <Card style={styles.card}>
          <Text style={styles.label}>URL del servidor</Text>
          <View style={styles.inputWrapper}>
            <Icon name="server" size={18} color={colors.textDim} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="http://192.168.100.174:3000"
              placeholderTextColor={colors.textMuted}
              value={serverUrl}
              onChangeText={setServerUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>
          <TouchableOpacity
            style={styles.updateBtn}
            onPress={() => {
              if (serverUrl.trim()) onSaveServerUrl(serverUrl.trim());
            }}
            activeOpacity={0.8}
          >
            <Icon name="link-variant" size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.updateBtnText}>Actualizar Servidor</Text>
          </TouchableOpacity>
        </Card>
      </View>

      {/* SECCIÓN DISPOSITIVO */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Identidad del Dispositivo</Text>
        <Card style={styles.card}>
          <Text style={styles.label}>Nombre del dispositivo</Text>
          <View style={styles.inputWrapper}>
            <Icon name="cellphone" size={18} color={colors.textDim} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Mi Android"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />
          </View>

          {deviceToken && (
            <View style={styles.tokenBox}>
              <View style={styles.tokenHeader}>
                <Text style={styles.tokenLabel}>Token de acceso</Text>
                <Icon name="content-copy" size={14} color={colors.textMuted} />
              </View>
              <Text style={styles.tokenValue} selectable>{deviceToken}</Text>
            </View>
          )}
        </Card>
      </View>

      {/* SECCIÓN RASTREO */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Envío de Ubicación</Text>
        <Card style={styles.card}>
          <Text style={styles.label}>Intervalo de envío (segundos)</Text>
          <View style={styles.inputWrapper}>
            <Icon name="clock-outline" size={18} color={colors.textDim} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={interval}
              onChangeText={setInterval}
              keyboardType="numeric"
            />
          </View>

          {/* Toggle Movimiento (Fase 2 Visual) */}
          <View style={styles.switchRow}>
            <View style={{ flex: 1, paddingRight: spacing.sm }}>
              <Text style={styles.switchLabel}>Enviar solo con movimiento</Text>
              <Text style={styles.hint}>Reduce el consumo enviando solo al moverte</Text>
            </View>
            <Switch
              value={onlyOnMotion}
              onValueChange={setOnlyOnMotion}
              trackColor={{ false: colors.borderLight, true: `${colors.primary}60` }}
              thumbColor={onlyOnMotion ? colors.primary : colors.textMuted}
            />
          </View>

          {/* Toggle Segundo Plano */}
          <View style={styles.switchRow}>
            <View style={{ flex: 1, paddingRight: spacing.sm }}>
              <Text style={styles.switchLabel}>Enviar en segundo plano</Text>
              <Text style={styles.hint}>Mantén el rastreo aunque cierres la app</Text>
            </View>
            <Switch
              value={bgEnabled}
              onValueChange={setBgEnabled}
              trackColor={{ false: colors.borderLight, true: `${colors.primary}60` }}
              thumbColor={bgEnabled ? colors.primary : colors.textMuted}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saved && styles.savedBtn]}
            onPress={handleSave}
            activeOpacity={0.8}
          >
            <Icon name={saved ? 'check-circle-outline' : 'content-save-outline'} size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.saveBtnText}>{saved ? '✓ Guardado' : 'Guardar Cambios'}</Text>
          </TouchableOpacity>
        </Card>
      </View>

      {/* SECCIÓN INFORMACIÓN & DATOS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mantenimiento y Datos</Text>
        <Card style={styles.card}>
          <TouchableOpacity style={styles.dangerBtn} onPress={onClearData} activeOpacity={0.8}>
            <Icon name="trash-can-outline" size={18} color={colors.accent} style={{ marginRight: 6 }} />
            <Text style={styles.dangerBtnText}>Limpiar todos los datos</Text>
          </TouchableOpacity>
        </Card>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Desarrollado por GPS Tracker Team</Text>
        <Text style={[styles.footerText, { marginTop: 4 }]}>Versión de la app v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  section: { marginTop: spacing.lg, paddingHorizontal: spacing.md },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  card: {
    padding: spacing.md,
  },
  label: {
    fontSize: 12,
    color: colors.textDim,
    marginBottom: 6,
  },
  hint: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgInput,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 44,
    marginBottom: spacing.md,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    paddingVertical: 0,
  },
  updateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgCard2,
    borderWidth: 1,
    borderColor: colors.border,
    height: 40,
    borderRadius: radius.md,
  },
  updateBtnText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  tokenBox: {
    backgroundColor: colors.bgInput,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xs,
  },
  tokenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  tokenLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  tokenValue: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: colors.textDim,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    backgroundColor: colors.bgInput,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  switchLabel: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    height: 44,
    borderRadius: radius.md,
    marginTop: spacing.xs,
    ...shadows.subtle,
  },
  savedBtn: { backgroundColor: colors.green },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.accent}15`,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: `${colors.accent}30`,
  },
  dangerBtnText: { color: colors.accent, fontSize: 13, fontWeight: 'bold' },
  footer: { alignItems: 'center', paddingVertical: spacing.xxl },
  footerText: { fontSize: 11, color: colors.textMuted },
});
