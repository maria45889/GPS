import React, {useEffect, useState, useCallback, useRef} from 'react';
import {View, StyleSheet, StatusBar} from 'react-native';
import {startTracking, stopTracking, isRunning} from './src/tracker';
import {
  getToken, saveToken, setDeviceName as storeDeviceName,
  setDeviceId as storeSetDeviceId, clearAll,
  isTrackingEnabled as wasTrackingBefore,
  getDeviceName,
} from './src/storage';
import {registerDevice, fetchDevices as apiFetchDevices, fetchLatestLocation, fetchLocationHistory, setApiBase, initApiBase} from './src/api';
import type {LocationData, DeviceInfo} from './src/api';

import SideDrawer from './src/components/SideDrawer';
import HomeScreen from './src/screens/HomeScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import DevicesScreen from './src/screens/DevicesScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import {colors} from './src/theme';

type AppScreen = 'home' | 'dashboard' | 'devices' | 'history' | 'settings';

function App(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<AppScreen>('home');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [checking, setChecking] = useState(true);
  const [connected, setConnected] = useState(false);
  const [deviceName, setDeviceName] = useState('Mi Dispositivo');
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [history, setHistory] = useState<LocationData[]>([]);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [deviceRegistered, setDeviceRegistered] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    initApp();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    initApiBase();
  }, []);

  async function initApp() {
    try {
      const running = await isRunning();
      if (running) setTracking(true);
      else if (await wasTrackingBefore()) {
        await startTracking();
        setTracking(true);
      }

      const token = await getToken();
      const name = await getDeviceName();
      if (token) {
        setDeviceToken(token);
        setDeviceRegistered(true);
        setConnected(true);
        setActiveTab('dashboard');
        startPolling(token);
      }
      if (name) setDeviceName(name);
    } catch (e) {
      console.warn('Init error:', e);
    } finally {
      setChecking(false);
    }
  }

  function startPolling(token: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    loadData(token);
    pollRef.current = setInterval(() => loadData(token), 15000);
  }

  async function loadData(token: string) {
    try {
      const [devs, latest, hist] = await Promise.all([
        apiFetchDevices(token).catch(() => []),
        fetchLatestLocation(token).catch(() => null),
        fetchLocationHistory(token, 200).catch(() => []),
      ]);
      if (Array.isArray(devs)) setDevices(devs);
      if (latest) {
        setLocation(latest);
        setBatteryLevel(latest.battery ?? null);
      }
      if (Array.isArray(hist) && hist.length > 0) setHistory(hist);
    } catch (e) {
      // silent
    }
  }

  const connectToServer = useCallback(async (serverUrl?: string) => {
    setChecking(true);
    try {
      if (serverUrl) {
        await setApiBase(serverUrl);
      }
      let token = await getToken();
      if (!token) {
        const name = deviceName.trim() || 'Mi Android';
        const result = await registerDevice(name);
        await saveToken(result.token);
        await storeDeviceName(result.name);
        await storeSetDeviceId(result.id);
        token = result.token;
        setDeviceName(result.name);
      }
      setDeviceToken(token);
      setDeviceRegistered(true);
      setConnected(true);
      setActiveTab('dashboard');
      startPolling(token);
    } catch (e) {
      console.warn('Connection error:', e);
    } finally {
      setChecking(false);
    }
  }, [deviceName]);

  const handleToggleTracking = useCallback(async () => {
    if (tracking) { await stopTracking(); setTracking(false); }
    else { await startTracking(); setTracking(true); }
  }, [tracking]);

  const handleSelectDevice = useCallback((_id: number, token: string) => {
    setDeviceToken(token);
    setActiveTab('dashboard');
    startPolling(token);
  }, []);

  const handleRegisterDevice = useCallback(async (name: string) => {
    try {
      const result = await registerDevice(name);
      await saveToken(result.token);
      await storeDeviceName(result.name);
      await storeSetDeviceId(result.id);
      setDeviceToken(result.token);
      setDeviceName(result.name);
      setDeviceRegistered(true);
      loadData(result.token);
    } catch (e) {
      console.warn('Register error:', e);
    }
  }, []);

  const handleSaveDeviceName = useCallback(async (name: string) => {
    setDeviceName(name);
    await storeDeviceName(name);
  }, [storeDeviceName]);

  const handleClearData = useCallback(async () => {
    await clearAll();
    if (pollRef.current) clearInterval(pollRef.current);
    setDeviceToken(null);
    setDeviceRegistered(false);
    setConnected(false);
    setActiveTab('home');
    setLocation(null);
    setHistory([]);
    setDevices([]);
  }, []);

  const handleRefresh = useCallback(() => {
    if (deviceToken) loadData(deviceToken);
  }, [deviceToken]);

  const handleSelectScreen = (screen: AppScreen) => {
    if (screen === 'home') {
      handleClearData();
    } else {
      setActiveTab(screen);
    }
  };

  if (activeTab === 'home') {
    return (
      <HomeScreen
        checking={checking}
        connected={connected}
        onConnect={(serverUrl) => connectToServer(serverUrl)}
      />
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} translucent />

      {/* Menú Lateral SideDrawer */}
      <SideDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeScreen={activeTab}
        onSelectScreen={handleSelectScreen}
      />

      <View style={styles.content}>
        {activeTab === 'dashboard' && (
          <DashboardScreen
            tracking={tracking}
            location={location}
            history={history}
            onToggleTracking={handleToggleTracking}
            batteryLevel={batteryLevel}
            deviceName={deviceName}
            deviceRegistered={deviceRegistered}
            onRefresh={handleRefresh}
            onOpenDrawer={() => setIsDrawerOpen(true)}
          />
        )}
        {activeTab === 'devices' && (
          <DevicesScreen
            devices={devices}
            activeToken={deviceToken}
            onSelectDevice={handleSelectDevice}
            onRegisterDevice={handleRegisterDevice}
            onOpenDrawer={() => setIsDrawerOpen(true)}
          />
        )}
        {activeTab === 'history' && (
          <HistoryScreen
            history={history}
            deviceName={deviceName}
            onOpenDrawer={() => setIsDrawerOpen(true)}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsScreen
            deviceName={deviceName}
            deviceToken={deviceToken}
            onSaveServerUrl={() => {}}
            onSaveDeviceName={handleSaveDeviceName}
            onSaveInterval={() => {}}
            onClearData={handleClearData}
            onOpenDrawer={() => setIsDrawerOpen(true)}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.bg},
  content: {flex: 1},
});

export default App;
