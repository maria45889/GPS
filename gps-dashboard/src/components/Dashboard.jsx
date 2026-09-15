import React, { useState } from 'react';
import MapArea from './MapArea';
import { LeftSidebarPanel } from './LeftSidebarPanel';
import { RightSidebarPanel } from './RightSidebarPanel';
import { HeaderBar } from './HeaderBar';
import { History, MapPinned, Power, ShieldAlert, X } from 'lucide-react';
import { initialFleet } from '../data/fleetData';
import { initialAlerts } from '../data/alertsData';
import { initialGeofences } from '../data/geofencesData';

const Dashboard = () => {
  const [vehicles] = useState(initialFleet);
  const [selectedVehicle, setSelectedVehicle] = useState(initialFleet[0]);
  const [alerts] = useState(initialAlerts);
  const [geofences] = useState(initialGeofences);
  const [flyToTrigger, setFlyToTrigger] = useState(null);
  const [isPlacingOnMap, setIsPlacingOnMap] = useState(false);
  const [pendingCenter, setPendingCenter] = useState(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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
  };

  const handleViewHistory = () => {
    alert('Ver historial del vehículo: ' + selectedVehicle?.plate);
  };

  const handleActivate = () => {
    alert('Vehículo activado: ' + selectedVehicle?.plate);
  };

  const handleReportTheft = () => {
    if (confirm(`¿Estás seguro de reportar robo del vehículo ${selectedVehicle?.plate}?`)) {
      alert('Robo reportado para: ' + selectedVehicle?.plate);
    }
  };

  return (
    <div className="relative flex flex-col w-full max-w-[1680px] h-[calc(100vh-2rem)] overflow-hidden rounded-[14px] border border-[#26343b] bg-[#11181d] shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:h-[calc(100vh-2.5rem)]">

      <div className="relative z-10 flex flex-col h-full">
        <HeaderBar
          selectedVehicle={selectedVehicle}
          onMenuClick={() => setIsMobileSidebarOpen(true)}
        />

        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden gap-3 p-3">
          <LeftSidebarPanel selectedVehicle={selectedVehicle} />

          <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-[12px] border border-[#2a3a40] bg-[#162126] shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
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
            />

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

          <RightSidebarPanel
            vehicles={vehicles}
            selectedVehicle={selectedVehicle}
            onSelectVehicle={handleSelectVehicle}
            onSetGeofence={() => setIsPlacingOnMap(true)}
            onViewHistory={handleViewHistory}
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
              <LeftSidebarPanel />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;