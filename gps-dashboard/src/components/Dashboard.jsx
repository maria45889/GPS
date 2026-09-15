import React, { useState } from 'react';
import MapArea from './MapArea';
import { LeftSidebarPanel } from './LeftSidebarPanel';
import { RightSidebarPanel } from './RightSidebarPanel';
import { HeaderBar } from './HeaderBar';
import { VideoFeed } from './VideoFeed';
import { History, MapPinned, Power, ShieldAlert, X } from 'lucide-react';
import { initialFleet } from '../data/fleetData';
import { initialAlerts } from '../data/alertsData';
import { initialGeofences } from '../data/geofencesData';

const Dashboard = () => {
  const [vehicles] = useState(initialFleet);
  const [selectedVehicle, setSelectedVehicle] = useState(initialFleet[0]);
  const [alerts] = useState(initialAlerts);
  const [geofences, setGeofences] = useState(initialGeofences);
  const [flyToTrigger, setFlyToTrigger] = useState(null);
  const [isPlacingOnMap, setIsPlacingOnMap] = useState(false);
  const [pendingCenter, setPendingCenter] = useState(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locateUserTrigger, setLocateUserTrigger] = useState(null);
  const [activeSection, setActiveSection] = useState('Inicio');

  const handleSelectVehicle = (vehicle) => {
    setSelectedVehicle(vehicle);
  };

  const handleSelectAlert = (alert) => {
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

  const handleMapClickForGeofence = (latlng) => {
    setPendingCenter(latlng);
    setIsPlacingOnMap(false);
    setGeofences((currentGeofences) => [
      {
        id: `GEOF-${Date.now()}`,
        name: 'Nueva geocerca',
        type: 'circle',
        center: latlng,
        radius: 300,
        color: '#168ca4',
        rule: 'Supervisión de ubicación',
        active: true,
      },
      ...currentGeofences,
    ]);
  };

  const handleViewHistory = () => {
    alert('Ver historial del vehículo: ' + selectedVehicle?.plate);
  };

  const handleLocateUser = () => {
    setLocateUserTrigger({ timestamp: Date.now(), coords: userLocation?.position });
  };

  const handleActivate = () => {
    alert('Vehículo activado: ' + selectedVehicle?.plate);
  };

  const handleReportTheft = () => {
    if (confirm(`¿Estás seguro de reportar robo del vehículo ${selectedVehicle?.plate}?`)) {
      alert('Robo reportado para: ' + selectedVehicle?.plate);
    }
  };

  const handleNavigate = (section) => {
    setActiveSection(section);
    if (section === 'Mapa') {
      setIsMobileSidebarOpen(false);
    }
  };

  return (
    <div className="reference-dashboard relative flex flex-col w-full max-w-[1680px] h-[calc(100vh-2rem)] overflow-hidden rounded-[14px] border border-[#1a3544] bg-[#07111c] shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:h-[calc(100vh-2.5rem)]">

      <div className="relative z-10 flex flex-col h-full">
        <HeaderBar
          selectedVehicle={selectedVehicle}
          onMenuClick={() => setIsMobileSidebarOpen(true)}
        />

        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden gap-3 p-3">
          <LeftSidebarPanel
            selectedVehicle={selectedVehicle}
            activeSection={activeSection}
            onNavigate={handleNavigate}
          />

          <div className="dashboard-center min-h-0 min-w-0 flex-1">
            <VideoFeed selectedVehicle={selectedVehicle} />
            <div className="map-surface relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-[12px] border border-[#cfe2e9] bg-[#eaf4f7] shadow-[0_8px_24px_rgba(43,93,112,0.12)]">
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
                flyToTrigger={flyToTrigger}
                userLocation={userLocation}
                onLocationChange={setUserLocation}
                locateUserTrigger={locateUserTrigger}
              />

              <div className="map-live-card">
                <div className="map-card-title">Live Data</div>
                <div className="map-live-grid">
                  <span>Engine Temp <strong>{selectedVehicle?.temp || '--'}°</strong></span>
                  <span>Fuel <strong>{selectedVehicle?.fuel || '--'}%</strong></span>
                  <span>Signal <strong className="signal-good">GOOD</strong></span>
                </div>
              </div>

              <div className="map-alerts-card">
                <div className="map-card-heading"><span>Active Alerts</span><span className="alert-count">{alerts.filter(item => item.status !== 'resolved').length}</span></div>
                {alerts.filter(item => item.status !== 'resolved').slice(0, 3).map((item) => (
                  <button key={item.id} type="button" onClick={() => handleSelectAlert(item)} className="map-alert-row">
                    <span className={`alert-dot ${item.severity}`} />
                    <span><strong>{item.title.split(' - ')[0]}</strong><small>{item.timestamp} · {item.locationName}</small></span>
                  </button>
                ))}
              </div>

              <div className="mobile-map-actions" aria-label="Acciones rápidas">
                <button type="button" onClick={handleActivate}>
                  <Power size={15} />
                  <span>Activar</span>
                </button>
                <button type="button" onClick={handleViewHistory}>
                  <History size={15} />
                  <span>Historial</span>
                </button>
                <button type="button" onClick={() => setIsPlacingOnMap(true)}>
                  <MapPinned size={15} />
                  <span>Geovalla</span>
                </button>
                <button type="button" onClick={handleReportTheft} className="mobile-map-action-danger">
                  <ShieldAlert size={15} />
                  <span>Robo</span>
                </button>
              </div>
            </div>
          </div>

          <RightSidebarPanel
            vehicles={vehicles}
            selectedVehicle={selectedVehicle}
            onSelectVehicle={handleSelectVehicle}
            onSetGeofence={() => setIsPlacingOnMap(true)}
            onViewHistory={handleViewHistory}
            userLocation={userLocation}
            onLocateUser={handleLocateUser}
          />
        </div>

        {isMobileSidebarOpen && (
          <div className="mobile-drawer-layer" role="dialog" aria-modal="true" aria-label="Menú de navegación">
            <button
              type="button"
              className="mobile-drawer-backdrop"
              aria-label="Cerrar menú"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            <div className="mobile-drawer-panel">
              <button
                type="button"
                className="mobile-drawer-close"
                aria-label="Cerrar menú"
                onClick={() => setIsMobileSidebarOpen(false)}
              >
                <X size={18} />
              </button>
              <LeftSidebarPanel activeSection={activeSection} onNavigate={handleNavigate} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;