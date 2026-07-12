// GPS Tracking and Simulation service
import { api } from './api';

let watchId = null;
let simulationInterval = null;
let currentRouteIndex = 0;
let simulationBattery = 85;

// Sample routes for simulator
const routes = {
  'Quito': [
    { latitude: -0.1807, longitude: -78.4678, altitude: 2850 },
    { latitude: -0.1815, longitude: -78.4682, altitude: 2852 },
    { latitude: -0.1825, longitude: -78.4690, altitude: 2848 },
    { latitude: -0.1832, longitude: -78.4705, altitude: 2845 },
    { latitude: -0.1840, longitude: -78.4720, altitude: 2840 },
    { latitude: -0.1835, longitude: -78.4735, altitude: 2842 },
    { latitude: -0.1820, longitude: -78.4740, altitude: 2847 },
    { latitude: -0.1810, longitude: -78.4730, altitude: 2851 },
    { latitude: -0.1802, longitude: -78.4715, altitude: 2855 },
    { latitude: -0.1795, longitude: -78.4695, altitude: 2850 }
  ],
  'Nueva York': [
    { latitude: 40.7484, longitude: -73.9856, altitude: 15 },
    { latitude: 40.7492, longitude: -73.9868, altitude: 16 },
    { latitude: 40.7505, longitude: -73.9875, altitude: 15 },
    { latitude: 40.7518, longitude: -73.9862, altitude: 14 },
    { latitude: 40.7530, longitude: -73.9848, altitude: 15 },
    { latitude: 40.7542, longitude: -73.9835, altitude: 16 },
    { latitude: 40.7538, longitude: -73.9820, altitude: 15 },
    { latitude: 40.7525, longitude: -73.9832, altitude: 14 },
    { latitude: 40.7512, longitude: -73.9845, altitude: 15 }
  ],
  'Madrid': [
    { latitude: 40.4168, longitude: -3.7038, altitude: 650 },
    { latitude: 40.4175, longitude: -3.7048, altitude: 651 },
    { latitude: 40.4185, longitude: -3.7055, altitude: 649 },
    { latitude: 40.4195, longitude: -3.7042, altitude: 647 },
    { latitude: 40.4205, longitude: -3.7030, altitude: 646 },
    { latitude: 40.4215, longitude: -3.7018, altitude: 648 },
    { latitude: 40.4208, longitude: -3.7005, altitude: 652 },
    { latitude: 40.4195, longitude: -3.7015, altitude: 650 }
  ]
};

export const gpsService = {
  isSupported() {
    return 'geolocation' in navigator;
  },

  // Start real GPS tracking using browser geolocation API
  startRealTracking(onLocationUpdate, onError, intervalSec = 5) {
    if (watchId) return;

    if (!this.isSupported()) {
      if (onError) onError(new Error('Geolocation not supported'));
      return;
    }

    let lastSentTime = 0;

    watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const now = Date.now();
        // Throttle updates based on configured interval
        if (now - lastSentTime < intervalSec * 1000) return;
        lastSentTime = now;

        const loc = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy || 10,
          altitude: position.coords.altitude || 0,
          speed: position.coords.speed || 0,
          bearing: position.coords.heading || 0,
          battery: await this.getBatteryLevel(),
          timestamp: new Date().toISOString()
        };

        try {
          await api.sendLocation(loc);
          if (onLocationUpdate) onLocationUpdate(loc);
        } catch (err) {
          console.error('Error sending GPS location:', err);
          if (onError) onError(err);
        }
      },
      (err) => {
        console.error('GPS error:', err);
        if (onError) onError(err);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  },

  stopRealTracking() {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
  },

  // Start mock simulation
  startSimulation(onLocationUpdate, routeName = 'Quito', intervalSec = 5) {
    if (simulationInterval) return;

    const route = routes[routeName] || routes['Quito'];
    currentRouteIndex = 0;

    simulationInterval = setInterval(async () => {
      const point = route[currentRouteIndex];
      
      // Add slight random noise to simulate GPS jitter
      const jitterLat = (Math.random() - 0.5) * 0.0001;
      const jitterLng = (Math.random() - 0.5) * 0.0001;
      
      // Decay battery slowly
      simulationBattery = Math.max(5, simulationBattery - 0.1);
      if (simulationBattery < 20 && Math.random() < 0.05) simulationBattery = 98; // Recharge cycle

      // Calculate bearing to next point
      const nextPoint = route[(currentRouteIndex + 1) % route.length];
      const bearing = this.calculateBearing(point.latitude, point.longitude, nextPoint.latitude, nextPoint.longitude);

      const loc = {
        latitude: point.latitude + jitterLat,
        longitude: point.longitude + jitterLng,
        accuracy: Math.floor(Math.random() * 8) + 2, // 2-10 meters
        altitude: point.altitude + Math.floor(Math.random() * 4) - 2,
        speed: 10 + Math.random() * 15, // 10-25 m/s (~36-90 km/h)
        bearing: bearing,
        battery: Math.round(simulationBattery),
        timestamp: new Date().toISOString()
      };

      try {
        await api.sendLocation(loc);
        if (onLocationUpdate) onLocationUpdate(loc);
      } catch (err) {
        console.error('Error sending simulated location:', err);
      }

      currentRouteIndex = (currentRouteIndex + 1) % route.length;
    }, intervalSec * 1000);
  },

  stopSimulation() {
    if (simulationInterval) {
      clearInterval(simulationInterval);
      simulationInterval = null;
    }
  },

  // Get device battery level via browser API if available
  async getBatteryLevel() {
    if ('getBattery' in navigator) {
      try {
        const batteryObj = await navigator.getBattery();
        return Math.round(batteryObj.level * 100);
      } catch (e) {
        return 88; // fallback
      }
    }
    return 88; // fallback
  },

  // Helper to calculate heading angle between coordinates
  calculateBearing(lat1, lon1, lat2, lon2) {
    const toRad = (d) => (d * Math.PI) / 180;
    const toDeg = (r) => (r * 180) / Math.PI;
    const dLon = toRad(lon2 - lon1);
    const y = Math.sin(dLon) * Math.cos(toRad(lat2));
    const x =
      Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
      Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
  },

  // Generate an instant history in the DB to test the History tab
  async generateDemoHistory(deviceId, routeName = 'Quito') {
    const route = routes[routeName] || routes['Quito'];
    const now = new Date();
    
    console.log(`Generating demo history for device ${deviceId}...`);
    
    // Send 15 past coordinates spaced by 5 minutes
    for (let i = 0; i < 15; i++) {
      const point = route[i % route.length];
      const timeOffset = (15 - i) * 5 * 60 * 1000; // 5 min interval going backwards
      const timestamp = new Date(now.getTime() - timeOffset).toISOString();

      const loc = {
        latitude: point.latitude + (Math.random() - 0.5) * 0.00005,
        longitude: point.longitude + (Math.random() - 0.5) * 0.00005,
        accuracy: 5,
        altitude: point.altitude,
        speed: 12 + Math.random() * 5,
        bearing: 45 + i * 20,
        battery: 95 - i,
        timestamp: timestamp
      };

      // Since api.sendLocation sends for the CURRENT active device, we make sure the active token matches.
      // We will perform direct POST to make sure it gets stored.
      await api.sendLocation(loc);
    }
  }
};
