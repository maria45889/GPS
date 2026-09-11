import React, { useState } from 'react';
import { VideoFeed } from './VideoFeed';
import MapArea from './MapArea';
import { LeftSidebarPanel } from './LeftSidebarPanel';
import { RightSidebarPanel } from './RightSidebarPanel';
import { HeaderBar } from './HeaderBar';
import { initialFleet } from '../data/fleetData';
import { initialAlerts } from '../data/alertsData';
import { initialGeofences } from '../data/geofencesData';

const Dashboard = () => {
  const [vehicles, setVehicles] = useState(initialFleet);
  const [selectedVehicle, setSelectedVehicle] = useState(initialFleet[0]);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [geofences, setGeofences] = useState(initialGeofences);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [flyToTrigger, setFlyToTrigger] = useState(null);
  const [isPlacingOnMap, setIsPlacingOnMap] = useState(false);
  const [pendingCenter, setPendingCenter] = useState(null);

  const handleSelectVehicle = (vehicle) => {
    setSelectedVehicle(vehicle);
  };

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

  const handleMapClickForGeofence = (latlng) => {
    setPendingCenter(latlng);
    setIsPlacingOnMap(false);
  };

  const handleViewHistory = () => {
    alert('Ver historial del vehículo: ' + selectedVehicle?.plate);
    // Aquí puedes implementar la lógica para mostrar el historial
  };

  const handleReportTheft = () => {
    if (confirm(`¿Estás seguro de reportar robo del vehículo ${selectedVehicle?.plate}?`)) {
      alert('Robo reportado para: ' + selectedVehicle?.plate);
      // Aquí puedes implementar la lógica para reportar robo
    }
  };

  return (
    <div className="flex flex-col w-full h-screen bg-[#0a0e1a] overflow-hidden">
      {/* Header Bar */}
      <HeaderBar selectedVehicle={selectedVehicle} />
      
      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <LeftSidebarPanel selectedVehicle={selectedVehicle} />
        
        {/* Center Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Video Feed */}
          <VideoFeed selectedVehicle={selectedVehicle} />
          
          {/* Map Area */}
          <div className="flex-1 relative overflow-hidden">
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
              onOpenGeofences={() => setIsPlacingOnMap(true)}
              flyToTrigger={flyToTrigger}
              showAlerts={false} 
              onCloseAlerts={() => {}} 
            />
          </div>
        </div>
        
        {/* Right Sidebar */}
        <RightSidebarPanel 
          vehicles={vehicles}
          selectedVehicle={selectedVehicle}
          onSelectVehicle={handleSelectVehicle}
          onSetGeofence={() => setIsPlacingOnMap(true)}
          onReportTheft={handleReportTheft}
          onViewHistory={handleViewHistory}
        />
      </div>
    </div>
  );
};

export default Dashboard;