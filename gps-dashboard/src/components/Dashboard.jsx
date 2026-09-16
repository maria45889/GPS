import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import MapArea from './MapArea';
import { LeftSidebarPanel } from './LeftSidebarPanel';
import { RightSidebarPanel } from './RightSidebarPanel';
import { HeaderBar } from './HeaderBar';
import { VideoFeed } from './VideoFeed';
import { initialFleet } from '../data/fleetData';
import { initialAlerts } from '../data/alertsData';
import { initialGeofences } from '../data/geofencesData';
import { useVehicles, useAlerts, useGeofences } from '../hooks';
import { VehicleDetailPanel } from './VehicleDetailPanel';
import { deleteVehicle, sendVehicleCommand, updateVehicleStatus } from '../lib/vehicleActions';

const Dashboard = () => {
  const { vehicles: supabaseVehicles } = useVehicles();
  const { alerts: supabaseAlerts } = useAlerts();
  const { geofences: supabaseGeofences } = useGeofences();
  const sharedVehicleId = new URLSearchParams(window.location.search).get('vehicle');

  // State management with fallback to mock data
  const [vehicles, setVehicles] = useState(supabaseVehicles.length > 0 ? supabaseVehicles : initialFleet);
  const [alerts, setAlertsState] = useState(supabaseAlerts.length > 0 ? supabaseAlerts : initialAlerts);
  const [geofences, setGeofencesState] = useState(supabaseGeofences.length > 0 ? supabaseGeofences : initialGeofences);

  // Update state when Supabase data loads
  useEffect(() => {
    if (supabaseVehicles.length > 0) setVehicles(supabaseVehicles);
  }, [supabaseVehicles])

  useEffect(() => {
    if (supabaseAlerts.length > 0) setAlertsState(supabaseAlerts);
  }, [supabaseAlerts])

  useEffect(() => {
    if (supabaseGeofences.length > 0) setGeofencesState(supabaseGeofences);
  }, [supabaseGeofences])
  const [selectedVehicle, setSelectedVehicle] = useState(
    () => vehicles.find((vehicle) => vehicle.id === sharedVehicleId) || vehicles[0]
  );
  const [flyToTrigger, setFlyToTrigger] = useState(null);
  const [isPlacingOnMap, setIsPlacingOnMap] = useState(false);
  const [pendingCenter, setPendingCenter] = useState(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locateUserTrigger, setLocateUserTrigger] = useState(null);
  const [isFollowingRoute, setIsFollowingRoute] = useState(
    () => new URLSearchParams(window.location.search).get('follow') === '1'
  );
  const [isVehicleDetailOpen, setIsVehicleDetailOpen] = useState(false);
  const [operationMessage, setOperationMessage] = useState('');
  const [alertFocusTrigger, setAlertFocusTrigger] = useState(null);
  const [isVehicleControlBusy, setIsVehicleControlBusy] = useState(false);

  const handleSelectVehicle = (vehicle, openDetail = false) => {
    setSelectedVehicle(vehicle);
    setIsVehicleDetailOpen(openDetail);
    setFlyToTrigger({
      coords: vehicle.position,
      zoom: 16,
    });
  };

  const handleToggleRouteFollow = () => {
    setIsFollowingRoute((current) => !current);
  };

  const handleShareRoute = async () => {
    if (!selectedVehicle) return;

    const routeUrl = new URL(window.location.href);
    routeUrl.searchParams.set('vehicle', selectedVehicle.id);
    routeUrl.searchParams.set('follow', '1');
    const shareData = {
      title: `Ruta de ${selectedVehicle.name}`,
      text: `Seguimiento GPS de ${selectedVehicle.name} (${selectedVehicle.plate})`,
      url: routeUrl.toString(),
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        setOperationMessage('Enlace de ruta copiado');
      }
    } catch (error) {
      if (error?.name !== 'AbortError') setOperationMessage('No se pudo compartir la ruta');
    }
  };

  const handleSelectAlert = (alert) => {
    if (alert.lat && alert.lng) {
      setFlyToTrigger({
        coords: [alert.lat, alert.lng],
        zoom: 16,
        timestamp: Date.now()
      });
      setAlertFocusTrigger({ id: alert.id, coords: [alert.lat, alert.lng], zoom: 16, timestamp: Date.now() });
    }
    const relatedVehicle = vehicles.find(v => v.id === alert.vehicleId || v.plate === alert.plate);
    if (relatedVehicle) {
      setSelectedVehicle(relatedVehicle);
      setIsVehicleDetailOpen(true);
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

  const handleLocateUser = () => {
    setLocateUserTrigger({ timestamp: Date.now(), coords: userLocation?.position });
  };

  const handleVehicleControl = async (command) => {
    if (!selectedVehicle || isVehicleControlBusy) return;
    setIsVehicleControlBusy(true);
    const nextStatus = command === 'activate' ? 'active' : 'stopped';
    const result = await updateVehicleStatus(selectedVehicle.id, nextStatus);
    if (command === 'immobilize') await sendVehicleCommand(selectedVehicle.id, command);

    const nextVehicle = {
      ...selectedVehicle,
      status: nextStatus,
      controlState: command === 'immobilize' ? 'immobilized' : undefined,
      lastUpdate: 'Ahora',
    };
    setVehicles((current) => current.map((vehicle) => vehicle.id === selectedVehicle.id ? nextVehicle : vehicle));
    setSelectedVehicle(nextVehicle);
    setOperationMessage(result.remote ? `Comando ${command} enviado` : `Comando ${command} aplicado en este panel`);
    setIsVehicleControlBusy(false);
  };

  const handleDeleteVehicle = async (vehicleId) => {
    if (isVehicleControlBusy) return;
    setIsVehicleControlBusy(true);
    const result = await deleteVehicle(vehicleId);
    const remainingVehicles = vehicles.filter((vehicle) => vehicle.id !== vehicleId);
    setVehicles(remainingVehicles);
    setSelectedVehicle(remainingVehicles[0] || null);
    setIsVehicleDetailOpen(false);
    setOperationMessage(result.remote ? 'Vehículo eliminado de Supabase' : 'Vehículo eliminado del panel local');
    setIsVehicleControlBusy(false);
  };

  useEffect(() => {
    if (!sharedVehicleId) return;
    const sharedVehicle = vehicles.find((vehicle) => vehicle.id === sharedVehicleId);
    if (sharedVehicle && selectedVehicle?.id !== sharedVehicle.id) {
      setSelectedVehicle(sharedVehicle);
      setFlyToTrigger({ coords: sharedVehicle.position, zoom: 16, timestamp: Date.now() });
    }
  }, [vehicles, sharedVehicleId, selectedVehicle?.id]);
  return (
    <div className="reference-dashboard relative flex flex-col w-full max-w-[1680px] h-[calc(100vh-2rem)] overflow-hidden rounded-[14px] border border-[#1a3544] bg-[#07111c] shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:h-[calc(100vh-2.5rem)]">

      <div className="relative z-10 flex flex-col h-full">
        <HeaderBar
          selectedVehicle={selectedVehicle}
          onMenuClick={() => setIsMobileSidebarOpen(true)}
        />

        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden gap-3 p-3">
          <LeftSidebarPanel
            vehicles={vehicles}
            selectedVehicle={selectedVehicle}
            onControlVehicle={handleVehicleControl}
            onDeleteVehicle={handleDeleteVehicle}
            isControlBusy={isVehicleControlBusy}
          />

          <div className="dashboard-center min-h-0 min-w-0 flex-1">
            <VideoFeed
              selectedVehicle={selectedVehicle}
            />
            <div className="map-surface relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-[12px] border border-[#cfe2e9] bg-[#eaf4f7] shadow-[0_8px_24px_rgba(43,93,112,0.12)]">
              <MapArea
                vehicles={vehicles}
                selectedVehicle={selectedVehicle}
                onSelectVehicle={handleSelectVehicle}
                onOpenDetail={() => setIsVehicleDetailOpen(true)}
                alerts={alerts}
                onSelectAlert={handleSelectAlert}
                focusTrigger={alertFocusTrigger}
                geofences={geofences}
                isPlacingOnMap={isPlacingOnMap}
                pendingCenter={pendingCenter}
                onMapClick={handleMapClickForGeofence}
                flyToTrigger={flyToTrigger}
                isFollowingRoute={isFollowingRoute}
                onToggleRouteFollow={handleToggleRouteFollow}
                onShareRoute={handleShareRoute}
                isVehicleDetailOpen={isVehicleDetailOpen}
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

            </div>
          </div>

          <RightSidebarPanel
            vehicles={vehicles}
            selectedVehicle={selectedVehicle}
            onSelectVehicle={(vehicle) => handleSelectVehicle(vehicle, true)}
            onSetGeofence={() => setIsPlacingOnMap(true)}
            userLocation={userLocation}
            onLocateUser={handleLocateUser}
          />
        </div>

        {isVehicleDetailOpen && (
          <VehicleDetailPanel
            vehicle={selectedVehicle}
            isFollowingRoute={isFollowingRoute}
            onClose={() => setIsVehicleDetailOpen(false)}
            onToggleRouteFollow={handleToggleRouteFollow}
            onShareRoute={handleShareRoute}
            onControlVehicle={handleVehicleControl}
            onDeleteVehicle={handleDeleteVehicle}
            isControlBusy={isVehicleControlBusy}
          />
        )}
      </div>

      {operationMessage && (
        <button type="button" className="dashboard-toast" onClick={() => setOperationMessage('')} aria-label="Cerrar mensaje">
          {operationMessage}
        </button>
      )}

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
            <LeftSidebarPanel vehicles={vehicles} selectedVehicle={selectedVehicle} onControlVehicle={handleVehicleControl} onDeleteVehicle={handleDeleteVehicle} isControlBusy={isVehicleControlBusy} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;