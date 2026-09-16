import React, { useState, useEffect } from 'react';
import { Power, ShieldAlert, X, History, MapPinned, Share2 } from 'lucide-react';
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

  const handleSelectVehicle = (vehicle) => {
    setSelectedVehicle(vehicle);
    setIsVehicleDetailOpen(true);
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

  const handleViewHistory = () => {
    setActiveSection('Historial');
    setIsVehicleDetailOpen(false);
    setIsFollowingRoute(true);
  };

  const handleLocateUser = () => {
    setLocateUserTrigger({ timestamp: Date.now(), coords: userLocation?.position });
  };

  const handleActivate = () => {
    if (!selectedVehicle) return;
    setVehicles((currentVehicles) => currentVehicles.map((vehicle) => (
      vehicle.id === selectedVehicle.id ? { ...vehicle, status: 'active', lastUpdate: 'Ahora' } : vehicle
    )));
    setSelectedVehicle((vehicle) => vehicle ? { ...vehicle, status: 'active', lastUpdate: 'Ahora' } : vehicle);
    setOperationMessage(`${selectedVehicle.plate} activado`);
  };

  const handleReportTheft = () => {
    if (!selectedVehicle) return;
    setVehicles((currentVehicles) => currentVehicles.map((vehicle) => (
      vehicle.id === selectedVehicle.id ? { ...vehicle, status: 'offline', lastUpdate: 'Incidente reportado' } : vehicle
    )));
    setSelectedVehicle((vehicle) => vehicle ? { ...vehicle, status: 'offline', lastUpdate: 'Incidente reportado' } : vehicle);
    setOperationMessage(`Incidente reportado para ${selectedVehicle.plate}`);
  };

  const handleNavigate = (section) => {
    setActiveSection(section);
    if (section === 'Mapa') {
      setIsMobileSidebarOpen(false);
    }
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
          onNavigate={handleNavigate}
        />

        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden gap-3 p-3">
          <LeftSidebarPanel
            selectedVehicle={selectedVehicle}
            activeSection={activeSection}
            onNavigate={handleNavigate}
          />

          <div className="dashboard-center min-h-0 min-w-0 flex-1">
            <VideoFeed
              selectedVehicle={selectedVehicle}
              onOpenDetail={() => setIsVehicleDetailOpen(true)}
              onOperationMessage={setOperationMessage}
            />
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
                isFollowingRoute={isFollowingRoute}
                onToggleRouteFollow={handleToggleRouteFollow}
                onShareRoute={handleShareRoute}
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
                <button type="button" onClick={handleToggleRouteFollow} className={isFollowingRoute ? 'mobile-map-action-active' : ''}>
                  <MapPinned size={15} />
                  <span>{isFollowingRoute ? 'Siguiendo' : 'Seguir'}</span>
                </button>
                <button type="button" onClick={handleShareRoute}>
                  <Share2 size={15} />
                  <span>Compartir</span>
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
            isFollowingRoute={isFollowingRoute}
            onToggleRouteFollow={handleToggleRouteFollow}
            onShareRoute={handleShareRoute}
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
            onViewHistory={handleViewHistory}
            onReportTheft={handleReportTheft}
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
            <LeftSidebarPanel activeSection={activeSection} onNavigate={handleNavigate} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;