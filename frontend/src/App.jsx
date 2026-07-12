import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import Live from './pages/Live';
import History from './pages/History';
import Devices from './pages/Devices';
import Settings from './pages/Settings';
import DeviceDetail from './pages/DeviceDetail';
import { api, getLocalToken, getLocalDeviceId, getLocalDeviceName, getLocalServerUrl, getLocalSendInterval, getLocalSendOnlyMoving, getLocalSendBackground, saveLocalSettings } from './services/api';
import { socketService } from './services/socket';
import { gpsService } from './services/gps';

export default function App() {
  // --- Server/Connection State ---
  const [serverStatus, setServerStatus] = useState('disconnected');
  const [deviceToken, setDeviceToken] = useState(getLocalToken());
  const [deviceId, setDeviceId] = useState(getLocalDeviceId());
  const [deviceName, setDeviceName] = useState(getLocalDeviceName());

  // --- Data State ---
  const [location, setLocation] = useState(null);
  const [history, setHistory] = useState([]);
  const [devices, setDevices] = useState([]);

  // --- Tracking / Simulation State ---
  const [isTracking, setIsTracking] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isGeneratingDemo, setIsGeneratingDemo] = useState(false);

  // --- Settings State ---
  const [serverUrl, setServerUrl] = useState(getLocalServerUrl());
  const [sendInterval, setSendInterval] = useState(getLocalSendInterval());
  const [sendOnlyMoving, setSendOnlyMoving] = useState(getLocalSendOnlyMoving());
  const [sendBackground, setSendBackground] = useState(getLocalSendBackground());

  const pollRef = useRef(null);
  const registeringRef = useRef(false);

  useEffect(() => {
    socketService.connect(setServerStatus);
    socketService.on('new_location', (payload) => {
      if (deviceId && payload.deviceId === parseInt(deviceId)) {
        setLocation(payload.location);
        setHistory(prev => [payload.location, ...prev].slice(0, 500));
      }
    });

    if (deviceToken) {
      startPolling();
    } else {
      autoRegister();
    }

    const onAuthInvalid = () => {
      if (registeringRef.current) return;
      registeringRef.current = true;
      setDeviceToken(null);
      setDeviceId(null);
      setLocation(null);
      setHistory([]);
      if (pollRef.current) clearInterval(pollRef.current);
      autoRegister().finally(() => { registeringRef.current = false; });
    };
    window.addEventListener('auth:invalid', onAuthInvalid);

    return () => {
      socketService.disconnect();
      if (pollRef.current) clearInterval(pollRef.current);
      gpsService.stopRealTracking();
      gpsService.stopSimulation();
      window.removeEventListener('auth:invalid', onAuthInvalid);
    };
  }, []);

  async function autoRegister() {
    try {
      const result = await api.registerDevice('Mi Dispositivo');
      if (result && result.token) {
        saveLocalSettings({ token: result.token, deviceId: result.id, name: result.name });
        setDeviceToken(result.token);
        setDeviceId(result.id);
        setDeviceName(result.name);
        startPolling();
      }
    } catch (err) {
      console.error('Auto-register error:', err);
    }
  }

  function startPolling() {
    loadData();
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(loadData, 15000);
  }

  async function loadData() {
    try {
      const [devs, latest, hist] = await Promise.all([
        api.getDevices().catch(() => []),
        api.getLatestLocationAny().catch(() => null),
        api.getLocationHistory(500).catch(() => [])
      ]);

      if (Array.isArray(devs)) setDevices(devs);
      if (latest && !latest.error) setLocation(latest);
      if (Array.isArray(hist) && hist.length > 0) setHistory(hist);
    } catch (err) {
      // silent
    }
  }

  const handleToggleTracking = useCallback(() => {
    if (isTracking) {
      gpsService.stopRealTracking();
      setIsTracking(false);
    } else {
      gpsService.startRealTracking(
        (loc) => {
          setLocation(loc);
          setHistory(prev => [loc, ...prev].slice(0, 500));
        },
        (err) => console.error('GPS error:', err),
        sendInterval
      );
      setIsTracking(true);
    }
  }, [isTracking, sendInterval]);

  const handleStartSimulation = useCallback((routeName) => {
    gpsService.startSimulation(
      (loc) => {
        setLocation(loc);
        setHistory(prev => [loc, ...prev].slice(0, 500));
      },
      routeName,
      3
    );
    setIsSimulating(true);
  }, []);

  const handleStopSimulation = useCallback(() => {
    gpsService.stopSimulation();
    setIsSimulating(false);
  }, []);

  const handleGenerateDemo = useCallback(async (routeName) => {
    setIsGeneratingDemo(true);
    try {
      await gpsService.generateDemoHistory(deviceId, routeName);
      await loadData();
    } catch (err) {
      console.error('Demo generation error:', err);
    } finally {
      setIsGeneratingDemo(false);
    }
  }, [deviceId]);

  const handleSelectDevice = useCallback((device) => {
    saveLocalSettings({ token: device.token, deviceId: device.id });
    setDeviceToken(device.token);
    setDeviceId(device.id);
    startPolling();
  }, []);

  const handleRegisterDevice = useCallback(async (name) => {
    try {
      const result = await api.registerDevice(name);
      if (result && result.token) {
        saveLocalSettings({ token: result.token, deviceId: result.id, name: result.name });
        setDeviceToken(result.token);
        setDeviceId(result.id);
        setDeviceName(result.name);
        loadData();
      }
    } catch (err) {}
  }, []);

  const handleDeleteDevice = useCallback(async (id) => {
    try {
      await api.deleteDevice(id);
      if (id === parseInt(deviceId)) {
        saveLocalSettings({ token: null, deviceId: null });
        setDeviceToken(null);
        setDeviceId(null);
        setLocation(null);
        setHistory([]);
      }
      loadData();
    } catch (err) {}
  }, [deviceId]);

  const handleClearData = () => {
    localStorage.clear();
    gpsService.stopRealTracking();
    gpsService.stopSimulation();
    setIsTracking(false);
    setIsSimulating(false);
    setDeviceToken(null);
    setDeviceId(null);
    setLocation(null);
    setHistory([]);
    setDevices([]);
    autoRegister();
  };

  return (
    <Router>
      <DashboardLayout serverStatus={serverStatus} deviceName={deviceName} onClearData={handleClearData}>
        <Routes>
          <Route 
            path="/" 
            element={
              <Live
                activeDevice={devices.find(d => d.id === parseInt(deviceId)) || { name: deviceName }}
                location={location}
                history={history}
                isTracking={isTracking || isSimulating}
                onToggleTracking={handleToggleTracking}
                serverStatus={serverStatus}
                onStartSimulation={handleStartSimulation}
                onStopSimulation={handleStopSimulation}
                isSimulating={isSimulating}
                onGenerateDemo={handleGenerateDemo}
                isGeneratingDemo={isGeneratingDemo}
              />
            } 
          />
          <Route 
            path="/history" 
            element={
              <History
                history={history}
                onGenerateDemo={handleGenerateDemo}
                isGeneratingDemo={isGeneratingDemo}
                activeDeviceId={deviceId}
              />
            } 
          />
          <Route 
            path="/devices" 
            element={
              <Devices
                devices={devices}
                activeToken={deviceToken}
                onSelectDevice={handleSelectDevice}
                onRegisterDevice={handleRegisterDevice}
                onDeleteDevice={handleDeleteDevice}
              />
            } 
          />
          <Route 
            path="/settings" 
            element={
              <Settings
                deviceName={deviceName}
                deviceToken={deviceToken}
                serverUrl={serverUrl}
                sendInterval={sendInterval}
                sendOnlyMoving={sendOnlyMoving}
                sendBackground={sendBackground}
                onSaveDeviceName={(name) => { setDeviceName(name); saveLocalSettings({ name }); }}
                onSaveServerUrl={(url) => { setServerUrl(url); saveLocalSettings({ serverUrl: url }); }}
                onSaveInterval={(val) => { setSendInterval(val); saveLocalSettings({ sendInterval: val }); }}
                onToggleSendOnlyMoving={() => { const next = !sendOnlyMoving; setSendOnlyMoving(next); saveLocalSettings({ sendOnlyMoving: next }); }}
                onToggleSendBackground={() => { const next = !sendBackground; setSendBackground(next); saveLocalSettings({ sendBackground: next }); }}
                onClearData={handleClearData}
              />
            } 
          />
          <Route path="/device-detail" element={<DeviceDetail />} />
        </Routes>
      </DashboardLayout>
    </Router>
  );
}
