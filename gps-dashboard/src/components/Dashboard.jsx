import React, { useEffect, useMemo } from 'react';
import { hasSupabaseConfig, supabase } from '../lib/supabase';
import CommandCenter from './command/CommandCenter';
import { deleteVehicle, updateEntity } from '../lib/vehicleActions';
import { clearAllGpsCaches } from '../lib/gpsTracker';
import { createGeofence } from '../lib/queries';
import { EditEntityModal } from './EditEntityModal';
import { DashboardProvider, useDashboardContext } from '../context/DashboardContext';

const DashboardInner = () => {
  const { state, dispatch, data } = useDashboardContext();
  const { category, selectedEntity, flyToTrigger, isPlacingOnMap, pendingCenter, geofenceRadius, pendingGeofenceConfirm, userLocation, locateUserTrigger, isFollowingRoute, origin, entityToEdit, operationMessage, alertFocusTrigger, routeFocusTrigger } = state;
  const { vehiclesList, devicesList, alerts, geofences, activeNetworkError, fleetLoading, vehiclesStale, devicesStale, vehiclesSyncTime, devicesSyncTime, hideEphemeral, refetchVehicles, refetchGeofences } = data;

  const sharedVehicleId = new URLSearchParams(window.location.search).get('vehicle');

  const handleCategoryChange = (next) => {
    dispatch({ type: 'SET_CATEGORY', payload: next });
  };

  const selectEntity = (entity) => {
    if (!entity) return;
    dispatch({ type: 'SET_SELECTED_ENTITY', payload: { ...entity, controlState: undefined } });
    if (entity.position) {
      dispatch({ type: 'SET_FLY_TO', payload: { coords: entity.position, zoom: 16, timestamp: Date.now() } });
    }
  };

  const handleFocusRoute = (entity, route) => {
    if (!entity) return;
    if (entity !== selectedEntity) dispatch({ type: 'SET_SELECTED_ENTITY', payload: { ...entity, controlState: undefined } });
    const points = Array.isArray(route) ? route.filter(
      (p) => Array.isArray(p) && p.length >= 2 && Number.isFinite(Number(p[0])) && Number.isFinite(Number(p[1]))
    ) : [];
    if (points.length < 2) return;
    dispatch({ type: 'SET_ROUTE_FOCUS', payload: { route: points, timestamp: Date.now() } });
  };

  const handleShareRoute = async () => {
    if (!selectedEntity) return;
    const routeUrl = new URL(window.location.href);
    routeUrl.searchParams.set('vehicle', selectedEntity.id);
    routeUrl.searchParams.set('category', category);
    routeUrl.searchParams.set('follow', '1');
    const shareData = {
      title: `Ubicación de ${selectedEntity.name}`,
      text: `Ubicación GPS de ${selectedEntity.name} (${selectedEntity.plate || selectedEntity.id})`,
      url: routeUrl.toString(),
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(shareData.url);
        dispatch({ type: 'SET_OPERATION_MESSAGE', payload: 'Enlace copiado' });
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = shareData.url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) {
          dispatch({ type: 'SET_OPERATION_MESSAGE', payload: 'Enlace copiado al portapapeles' });
        } else {
          dispatch({ type: 'SET_OPERATION_MESSAGE', payload: `Copia este enlace: ${shareData.url}` });
        }
      }
    } catch (error) {
      if (error?.name !== 'AbortError') dispatch({ type: 'SET_OPERATION_MESSAGE', payload: 'No se pudo compartir' });
    }
  };

  const handleSelectAlert = (alert) => {
    if (Number.isFinite(alert.lat) && Number.isFinite(alert.lng)) {
      dispatch({ type: 'SET_FLY_TO', payload: { coords: [alert.lat, alert.lng], zoom: 16, timestamp: Date.now() } });
      dispatch({ type: 'SET_ALERT_FOCUS', payload: { id: alert.id, coords: [alert.lat, alert.lng], zoom: 16, timestamp: Date.now() } });
    }
    const relatedVehicle = vehiclesList.find((v) => v.id === alert.vehicleId);
    const relatedDevice = devicesList.find((d) => d.id === alert.vehicleId);

    if (relatedVehicle) {
      if (category !== 'vehicles' && category !== 'all') handleCategoryChange('vehicles');
      selectEntity(relatedVehicle);
    } else if (relatedDevice) {
      if (category !== 'devices' && category !== 'all') handleCategoryChange('devices');
      selectEntity(relatedDevice);
    }
  };

  const handleMapClickForGeofence = (latlng) => {
    dispatch({ type: 'SET_PLACING_ON_MAP', payload: false });
    dispatch({ type: 'SET_PENDING_CENTER', payload: null });
    dispatch({ type: 'SET_GEOFENCE_RADIUS', payload: 300 });
    dispatch({ type: 'SET_PENDING_GEOFENCE_CONFIRM', payload: { center: latlng, name: 'Nueva geocerca' } });
  };

  const handleConfirmGeofence = async () => {
    if (!pendingGeofenceConfirm) return;
    const { center, name } = pendingGeofenceConfirm;
    const newGeo = {
      name, type: 'circle', center, positions: [center], radius: geofenceRadius, color: '#168ca4', rule: 'outside', active: true,
    };
    if (hasSupabaseConfig && supabase) {
      try {
        const saved = await createGeofence(newGeo);
        if (saved) {
          if (refetchGeofences) await refetchGeofences();
          dispatch({ type: 'SET_OPERATION_MESSAGE', payload: 'Geocerca guardada con éxito' });
          dispatch({ type: 'SET_PENDING_GEOFENCE_CONFIRM', payload: null });
          dispatch({ type: 'SET_PENDING_CENTER', payload: null });
        }
      } catch (err) {
        dispatch({ type: 'SET_OPERATION_MESSAGE', payload: `Error al guardar geocerca: ${err.message || 'Sin permisos'}. Puedes reintentar.` });
      }
    } else {
      dispatch({ type: 'SET_LOCAL_GEOFENCES', payload: [{ id: `GEOF-${Date.now()}`, ...newGeo }, ...state.localGeofences] });
      dispatch({ type: 'SET_OPERATION_MESSAGE', payload: 'Geocerca guardada localmente' });
      dispatch({ type: 'SET_PENDING_GEOFENCE_CONFIRM', payload: null });
      dispatch({ type: 'SET_PENDING_CENTER', payload: null });
    }
  };

  const handleCancelGeofence = () => {
    dispatch({ type: 'SET_PENDING_GEOFENCE_CONFIRM', payload: null });
    dispatch({ type: 'SET_PENDING_CENTER', payload: null });
  };

  const handleLocateUser = () => {
    dispatch({ type: 'SET_LOCATE_USER_TRIGGER', payload: { timestamp: Date.now(), coords: userLocation?.position } });
  };

  const handleDeleteVehicle = async (entityId, kindParam) => {
    const kind = kindParam || (category === 'vehicles' ? 'vehicle' : 'device');
    const result = await deleteVehicle(entityId, kind);
    if (result.error) {
      dispatch({ type: 'SET_OPERATION_MESSAGE', payload: `No se pudo eliminar: ${result.error.message || 'Error desconocido'}` });
      return;
    }
    dispatch({ type: 'SET_SELECTED_ENTITY', payload: null });
    if (kind === 'vehicle') {
      if (result.remote && refetchVehicles) await refetchVehicles();
      dispatch({ type: 'SET_LOCAL_VEHICLES', payload: state.localVehicles.filter((v) => v.id !== entityId) });
    } else {
      hideEphemeral(entityId);
    }
    dispatch({ type: 'SET_OPERATION_MESSAGE', payload: result.remote ? (kind === 'vehicle' ? 'Vehículo eliminado' : 'Dispositivo eliminado') : 'Eliminado del panel local' });
  };

  const handleEditVehicle = (entity) => {
    dispatch({ type: 'SET_ENTITY_TO_EDIT', payload: entity });
  };

  const handleSaveEntity = async (entityId, currentCategory, updates) => {
    const result = await updateEntity(entityId, currentCategory, updates);
    if (result.error) throw new Error(result.error.message || 'Error al guardar los cambios');
    dispatch({ type: 'SET_OPERATION_MESSAGE', payload: 'Cambios guardados con éxito' });
    if (currentCategory === 'vehicles' && refetchVehicles) refetchVehicles();
  };

  const handleToggleRouteFollow = (entity) => {
    const target = entity?.position ? entity : selectedEntity;
    if (!target?.position) {
      dispatch({ type: 'SET_FOLLOWING_ROUTE', payload: false });
      dispatch({ type: 'SET_OPERATION_MESSAGE', payload: 'Sin posición GPS para seguir' });
      return;
    }
    if (entity?.position && entity !== selectedEntity) selectEntity(entity);
    const next = !isFollowingRoute;
    dispatch({ type: 'SET_FOLLOWING_ROUTE', payload: next });
    if (next && !origin && !userLocation?.position) {
      handleLocateUser();
      dispatch({ type: 'SET_OPERATION_MESSAGE', payload: 'Punto de partida no definido: escribe tu calle o actívalo con tu ubicación GPS' });
    }
  };

  const handleSelectOrigin = (selected) => {
    dispatch({ type: 'SET_ORIGIN', payload: selected });
    if (selected) dispatch({ type: 'SET_OPERATION_MESSAGE', payload: 'Punto de partida fijado' });
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('gps_dev_admin');
      clearAllGpsCaches();
      if (supabase) await supabase.auth.signOut();
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    }
  };

  useEffect(() => {
    if (!sharedVehicleId) return;
    const sharedCategory = new URLSearchParams(window.location.search).get('category');
    const inVehicles = vehiclesList.find((v) => v.id === sharedVehicleId);
    const inDevices = devicesList.find((d) => d.id === sharedVehicleId);
    const targetCategory = sharedCategory === 'devices'
      ? (inDevices ? 'devices' : null)
      : (sharedCategory === 'vehicles' ? (inVehicles ? 'vehicles' : null) : null);
    const resolvedCategory = targetCategory || (inDevices && !inVehicles ? 'devices' : (inVehicles ? 'vehicles' : (inDevices ? 'devices' : null)));
    const targetEntity = resolvedCategory === 'devices' ? inDevices : (resolvedCategory === 'vehicles' ? inVehicles : null);

    if (resolvedCategory && category !== resolvedCategory) {
      queueMicrotask(() => handleCategoryChange(resolvedCategory));
    }
    if (targetEntity) selectEntity(targetEntity);
  }, [sharedVehicleId, vehiclesList, devicesList]); // eslint-disable-line react-hooks/exhaustive-deps

  const lastSyncLabel = useMemo(() => {
    if (activeNetworkError) return 'Sin conexión (Desactualizado)';
    if ((category === 'vehicles' && vehiclesStale) || (category === 'devices' && devicesStale)) return 'Sin conexión (Desactualizado)';

    if (category === 'vehicles' && vehiclesSyncTime) {
      const date = new Date(vehiclesSyncTime);
      return `Act. ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    if (category === 'devices' && devicesSyncTime) {
      const date = new Date(devicesSyncTime);
      return `Act. ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }

    const lastUpdate = selectedEntity?.lastUpdate;
    if (!lastUpdate || lastUpdate === '--') return 'Sin reporte';
    if (lastUpdate === 'En línea') return 'En línea';
    if (lastUpdate === 'Ahora') return 'Actualizado';
    return lastUpdate;
  }, [activeNetworkError, selectedEntity?.lastUpdate, category, vehiclesStale, devicesStale, vehiclesSyncTime, devicesSyncTime]);

  return (
    <div className="relative flex w-full flex-col bg-[#0b0f19] h-[100dvh] overflow-hidden">
      <CommandCenter />

      {operationMessage && (
        <button type="button" className="dashboard-toast" onClick={() => dispatch({ type: 'SET_OPERATION_MESSAGE', payload: '' })} aria-label="Cerrar mensaje">
          {operationMessage}
        </button>
      )}

      {!operationMessage && activeNetworkError && (
        <div className="dashboard-toast border border-[#ef5c72]/60 bg-[#250d12]/95 text-[#fca5a5]">
          ⚠️ Sin conexión a la red. Mostrando datos locales previamente cargados.
        </div>
      )}

      {pendingGeofenceConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Confirmar geocerca">
          <div className="w-full max-w-sm rounded-xl border border-[#28566a] bg-[#081825] p-5 shadow-2xl">
            <h3 className="text-[15px] font-bold text-[#effcff]">Confirmar Nueva Geocerca</h3>
            <p className="mt-2 text-[12px] text-[#89a9b5]">
              Crea una geocerca circular en las coordenadas seleccionadas. Usa el radio para que el dispositivo se detecte como «fuera de zona».
            </p>
            <fieldset className="mt-4">
              <legend className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#89a9b5]">Radio de la zona</legend>
              <div className="flex flex-wrap gap-1.5">
                {[100, 200, 300, 600, 1000].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => dispatch({ type: 'SET_GEOFENCE_RADIUS', payload: r })}
                    aria-pressed={geofenceRadius === r}
                    className={`rounded-md border px-2.5 py-1.5 font-mono text-[11px] font-bold transition-all ${
                      geofenceRadius === r
                        ? 'border-[#b8f36b]/70 bg-[#b8f36b]/15 text-[#effcff] shadow-[0_0_10px_rgba(184,243,107,0.15)]'
                        : 'border-[#28566a] text-[#89a9b5] hover:border-[#3f7c94] hover:text-[#effcff]'
                    }`}
                  >
                    {r} m
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelGeofence}
                className="rounded-lg border border-[#28566a] bg-[#102b38] px-3.5 py-2 text-[11px] font-bold text-[#89a9b5] hover:text-[#effcff]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmGeofence}
                className="rounded-lg bg-[#b8f36b] px-4 py-2 text-[11px] font-extrabold text-[#07111c] shadow-[0_0_12px_rgba(184,243,107,0.2)] hover:bg-[#cbfb88]"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {entityToEdit && (
        <EditEntityModal
          entity={entityToEdit}
          category={category}
          onClose={() => dispatch({ type: 'SET_ENTITY_TO_EDIT', payload: null })}
          onSave={handleSaveEntity}
        />
      )}
    </div>
  );
};

const Dashboard = () => (
  <DashboardProvider>
    <DashboardInner />
  </DashboardProvider>
);

export default Dashboard;