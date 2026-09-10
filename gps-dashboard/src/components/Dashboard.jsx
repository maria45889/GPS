import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import MapArea from './MapArea';
import { FleetList } from './fleet/FleetList';
import { AlertsFeed } from './alerts/AlertsFeed';
import { AlertDetailModal } from './alerts/AlertDetailModal';
import { GeofenceDrawer } from './geofences/GeofenceDrawer';
import { TopKpiBar } from './dashboard/TopKpiBar';
import { initialFleet } from '../data/fleetData';
import { initialAlerts } from '../data/alertsData';
import { initialGeofences } from '../data/geofencesData';

const Dashboard = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showAlerts, setShowAlerts] = useState(true);
  const [activeTab, setActiveTab] = useState('fleet'); // Open Fleet by default
  const [vehicles, setVehicles] = useState(initialFleet);
  const [selectedVehicle, setSelectedVehicle] = useState(initialFleet[0]);
  
  // Alerts state management
  const [alerts, setAlerts] = useState(initialAlerts);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [flyToTrigger, setFlyToTrigger] = useState(null);

  // Geofences state management
  const [geofences, setGeofences] = useState(initialGeofences);
  const [isPlacingOnMap, setIsPlacingOnMap] = useState(false);
  const [pendingCenter, setPendingCenter] = useState(null);

  const handleSelectVehicle = (vehicle) => {
    setSelectedVehicle(vehicle);
  };

  // FlyTo & Open Forensic Modal upon alert selection
  const handleSelectAlert = (alert) => {
    setSelectedAlert(alert);
    if (alert.lat && alert.lng) {
      setFlyToTrigger({
        coords: [alert.lat, alert.lng],
        zoom: 16,
        timestamp: Date.now()
      });
    }
    const relatedVehicle = vehicles.find(v => v.id === alert.vehicleId || v.plate === alert.plate);
    if (relatedVehicle) {
      setSelectedVehicle(relatedVehicle);
    }
  };

  // Resolve Alert action
  const handleResolveAlert = (alertId) => {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: 'resolved' } : a));
    if (selectedAlert?.id === alertId) {
      setSelectedAlert(prev => prev ? { ...prev, status: 'resolved' } : null);
    }
  };

  // Remote engine block action
  const handleBlockEngine = (vehicleId) => {
    setVehicles(prev => prev.map(v => 
      v.id === vehicleId ? { ...v, status: 'stopped', speed: 0 } : v
    ));
    setSelectedVehicle(prev => prev && prev.id === vehicleId ? { ...prev, status: 'stopped', speed: 0 } : prev);
  };

  // Geofence Actions
  const handleAddGeofence = (newGeo) => {
    setGeofences(prev => [newGeo, ...prev]);
    setIsPlacingOnMap(false);
    setPendingCenter(null);
    if (newGeo.center) {
      setFlyToTrigger({
        coords: newGeo.center,
        zoom: 15,
        timestamp: Date.now()
      });
    }
  };

  const handleToggleGeofenceVisibility = (id) => {
    setGeofences(prev => prev.map(g => g.id === id ? { ...g, active: !g.active } : g));
  };

  const handleDeleteGeofence = (id) => {
    setGeofences(prev => prev.filter(g => g.id !== id));
  };

  const handleFocusGeofence = (geo) => {
    const target = geo.center || (geo.positions && geo.positions[0]);
    if (target) {
      setFlyToTrigger({
        coords: target,
        zoom: 15,
        timestamp: Date.now()
      });
    }
  };

  const handleMapClickForGeofence = (latlng) => {
    setPendingCenter(latlng);
    setIsPlacingOnMap(false);
  };

  // Dynamically calculate KPIs from fleet data and alerts
  const activeAlertsCount = alerts.filter(a => a.status !== 'resolved');
  const criticalCount = activeAlertsCount.filter(a => a.severity === 'critical').length;

  const kpis = {
    active: vehicles.filter(v => v.status === 'active').length,
    stopped: vehicles.filter(v => v.status === 'stopped').length,
    offline: vehicles.filter(v => v.status === 'offline').length,
    criticalAlerts: criticalCount,
    fuelEfficiency: '3.8',
    safetyScore: Math.max(70, 96 - (criticalCount * 4)),
  };

  return (
    <div className="flex w-full h-full relative overflow-hidden bg-[#0B0F19]">
      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/75 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Drawer on Mobile / Fixed column on Desktop */}
      <aside className={`
        fixed md:relative z-50 md:z-20 top-0 bottom-0 left-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        transition-transform duration-300 ease-in-out
        w-52 lg:w-56 h-full bg-[#0B0F19] border-r border-[#1E293B]/60 flex flex-col shrink-0
      `}>
        <Sidebar 
          activeTab={activeTab} 
          onSelectTab={(tab) => {
            setActiveTab(tab);
            if (tab !== 'geofences') {
              setIsPlacingOnMap(false);
            }
          }} 
          onClose={() => setIsSidebarOpen(false)} 
        />
      </aside>

      {/* Secondary Drawer / Panel: Fleet List */}
      {activeTab === 'fleet' && (
        <div className="shrink-0 h-full relative z-20 transition-all">
          <FleetList 
            vehicles={vehicles}
            selectedVehicle={selectedVehicle}
            onSelectVehicle={handleSelectVehicle}
            onClose={() => setActiveTab('dashboard')}
          />
        </div>
      )}

      {/* Secondary Drawer / Panel: Alerts Feed */}
      {activeTab === 'alerts' && (
        <div className="shrink-0 h-full relative z-20 transition-all">
          <AlertsFeed 
            alerts={alerts}
            onSelectAlert={handleSelectAlert}
            onClose={() => setActiveTab('dashboard')}
          />
        </div>
      )}

      {/* Secondary Drawer / Panel: Geofences Manager */}
      {activeTab === 'geofences' && (
        <div className="shrink-0 h-full relative z-20 transition-all">
          <GeofenceDrawer 
            geofences={geofences}
            onAddGeofence={handleAddGeofence}
            onToggleVisibility={handleToggleGeofenceVisibility}
            onDeleteGeofence={handleDeleteGeofence}
            onFocusGeofence={handleFocusGeofence}
            isPlacingOnMap={isPlacingOnMap}
            setIsPlacingOnMap={setIsPlacingOnMap}
            pendingCenter={pendingCenter}
            onClose={() => {
              setActiveTab('dashboard');
              setIsPlacingOnMap(false);
            }}
          />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full w-full relative overflow-hidden min-w-0">
        {/* TopBar with integrated mobile menu button & alerts toggle */}
        <TopBar 
          onMenuClick={() => setIsSidebarOpen(true)}
          onToggleAlerts={() => {
            if (activeTab === 'alerts') {
              setActiveTab('dashboard');
            } else {
              setActiveTab('alerts');
            }
          }}
          alertCount={activeAlertsCount.length}
        />

        {/* Global Tactical KPIs Bar */}
        <TopKpiBar kpis={kpis} />
        
        {/* Map Area */}
        <main className="flex-1 relative w-full h-full overflow-hidden">
          <MapArea 
            vehicles={vehicles}
            selectedVehicle={selectedVehicle}
            onSelectVehicle={handleSelectVehicle}
            alerts={alerts}
            onSelectAlert={handleSelectAlert}
            geofences={geofences}
            isPlacingOnMap={isPlacingOnMap}
            pendingCenter={pendingCenter}
            onMapClick={handleMapClickForGeofence}
            onOpenGeofences={() => setActiveTab('geofences')}
            flyToTrigger={flyToTrigger}
            showAlerts={showAlerts} 
            onCloseAlerts={() => setShowAlerts(false)} 
          />
        </main>
      </div>

      {/* Forensic Alert Detail Modal */}
      {selectedAlert && (
        <AlertDetailModal 
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onResolve={handleResolveAlert}
          onBlockEngine={handleBlockEngine}
        />
      )}
    </div>
  );
};

export default Dashboard;