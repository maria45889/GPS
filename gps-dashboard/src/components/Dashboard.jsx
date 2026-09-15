import React, { useState } from 'react';
import MapArea from './MapArea';
import { LeftSidebarPanel } from './LeftSidebarPanel';
import { RightSidebarPanel } from './RightSidebarPanel';
import { HeaderBar } from './HeaderBar';
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

  return (
    <div className="relative flex flex-col w-full max-w-[1600px] h-[calc(100vh-1.5rem)] overflow-hidden rounded-[18px] border-[2px] border-[#1dd6ff]/55 bg-[#050f1c] shadow-[0_0_0_1px_rgba(29,214,255,0.18),0_0_35px_rgba(29,214,255,0.08),0_25px_60px_rgba(2,6,23,0.9)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.10),_transparent_30%)] pointer-events-none" />

      <div className="relative z-10 flex flex-col h-full">
        <HeaderBar selectedVehicle={selectedVehicle} />

        <div className="flex flex-1 overflow-hidden p-2 gap-1.5">
          <LeftSidebarPanel selectedVehicle={selectedVehicle} />

          <div className="flex-1 overflow-hidden rounded-[10px] border border-[#1dd6ff]/25 bg-[#061a27] shadow-[inset_0_0_25px_rgba(29,214,255,0.04)] relative">
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
          </div>

          <RightSidebarPanel
            vehicles={vehicles}
            selectedVehicle={selectedVehicle}
            onSelectVehicle={handleSelectVehicle}
            onSetGeofence={() => setIsPlacingOnMap(true)}
            onViewHistory={handleViewHistory}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;