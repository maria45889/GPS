import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  StatusBar,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, radius, shadows } from '../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface HomeScreenProps {
  checking: boolean;
  connected: boolean;
  onConnect: () => void;
}

export default function HomeScreen({ checking, connected, onConnect }: HomeScreenProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const [serverUrl, setServerUrl] = useState('http://192.168.100.174:3000');
  const [deviceName, setDeviceNameState] = useState('Mi Dispositivo');
  const [token, setTokenState] = useState('');
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    // Cargar credenciales guardadas si existen
    const loadSavedData = async () => {
      try {
        const savedUrl = await AsyncStorage.getItem('SERVER_URL');
        const savedName = await AsyncStorage.getItem('DEVICE_NAME');
        const savedToken = await AsyncStorage.getItem('DEVICE_TOKEN');
        if (savedUrl) setServerUrl(savedUrl);
        if (savedName) setDeviceNameState(savedName);
        if (savedToken) setTokenState(savedToken);
      } catch (e) {
        console.warn(e);
      }
    };
    loadSavedData();
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.85, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const handleConnect = async () => {
    try {
      await AsyncStorage.setItem('SERVER_URL', serverUrl);
      await AsyncStorage.setItem('DEVICE_NAME', deviceName);
      if (token) {
        await AsyncStorage.setItem('DEVICE_TOKEN', token);
      }
      onConnect();
    } catch (e) {
      console.warn(e);
    }
  };

  if (checking) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.logoWrap}>
          <Animated.View style={[styles.logoGlow, { opacity: pulseAnim }]} />
          <View style={styles.logoInner}>
            <Icon name="map-marker-radius" size={42} color={colors.primary} />
          </View>
        </View>

        <Text style={styles.brand}>GPS<Text style={{ color: colors.primary }}>Tracker</Text></Text>
        <Text style={styles.tagline}>Monitorea, rastrea y protege</Text>

        <View style={styles.form}>
          {/* Input URL del Servidor */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>URL del servidor</Text>
            <View style={styles.inputWrapper}>
              <Icon name="server" size={20} color={colors.textDim} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={serverUrl}
                onChangeText={setServerUrl}
                placeholder="http://192.168.100.174:3000"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Input Nombre del Dispositivo */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Nombre del dispositivo</Text>
            <View style={styles.inputWrapper}>
              <Icon name="cellphone" size={20} color={colors.textDim} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={deviceName}
                onChangeText={setDeviceNameState}
                placeholder="Mi Dispositivo"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          {/* Input Token de Acceso (Opcional) */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Token (opcional)</Text>
            <View style={styles.inputWrapper}>
              <Icon name="lock" size={20} color={colors.textDim} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={token}
                onChangeText={setTokenState}
                placeholder="••••••••••••"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showToken}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowToken(!showToken)} style={styles.eyeBtn}>
                <Icon name={showToken ? 'eye-off' : 'eye'} size={20} color={colors.textDim} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.connectBtn, connected && styles.connectedBtn]}
          onPress={handleConnect}
          activeOpacity={0.8}
        >
          <Text style={styles.connectBtnText}>
            {connected ? 'IR AL MAPA' : 'CONECTAR'}
          </Text>
        </TouchableOpacity>

        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: connected ? colors.online : colors.offline }]} />
          <Text style={styles.statusText}>
            {connected ? 'Conectado al servidor' : 'Sin conexión'}
          </Text>
        </View>

        <Text style={styles.versionText}>v1.0.0</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  content: { alignItems: 'center', paddingHorizontal: spacing.xl, width: '100%' },
  logoWrap: { width: 90, height: 90, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg },
  logoGlow: {
    position: 'absolute', width: 90, height: 90, borderRadius: 45,
    backgroundColor: `${colors.primary}20`,
  },
  logoInner: {
    width: 70, height: 70, borderRadius: 35, backgroundColor: colors.bgCard,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: colors.primary,
    ...shadows.card,
  },
  brand: { fontSize: 28, fontWeight: 'bold', color: colors.text, letterSpacing: 1 },
  tagline: { fontSize: 13, color: colors.textDim, marginTop: spacing.xs, marginBottom: spacing.xl },
  form: {
    width: '100%',
    maxWidth: 320,
    marginBottom: spacing.xl,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 11,
    color: colors.textDim,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgInput,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 48,
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
  eyeBtn: {
    padding: spacing.xs,
  },
  connectBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  connectedBtn: { backgroundColor: colors.blue },
  connectBtnText: { fontSize: 15, fontWeight: 'bold', color: '#fff', letterSpacing: 1.5 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { fontSize: 13, color: colors.textDim },
  versionText: { fontSize: 11, color: colors.textMuted, marginTop: spacing.lg },
});
