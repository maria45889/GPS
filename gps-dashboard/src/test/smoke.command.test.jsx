// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import CommandCenter from '../components/command/CommandCenter';

global.ResizeObserver = global.ResizeObserver || class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('smoke: CommandCenter render', () => {
  it('renderiza sin errores con 1 dispositivo y 1 vehículo (sin posición)', () => {
    const devices = [{
      id: 'DEV-1', name: 'Tracker A', status: 'active', position: [4.6097, -74.0817],
      battery: 80, speed: 12, accuracy: 9, lastUpdate: 'Ahora',
    }];
    const vehicles = [{
      id: 'MOTO-1', name: 'Moto Demo', status: 'offline', position: null,
      battery: 40, speed: 0, accuracy: null, lastUpdate: 'Hace 2 días',
    }];

    let rendered = false;
    try {
      render(
        <CommandCenter
          category="all"
          onCategoryChange={() => {}}
          devices={devices}
          vehicles={vehicles}
          selectedEntity={null}
          onSelectVehicle={() => {}}
          alerts={[]}
          geofences={[]}
          onSetGeofence={() => {}}
          onCancelGeofence={() => {}}
          pendingCenter={null}
          onMapClick={() => {}}
          onMapHover={() => {}}
          isFollowingRoute={false}
          onToggleRouteFollow={() => {}}
          onShareRoute={() => {}}
          userLocation={null}
          onLocateUser={() => {}}
          origin={null}
          onSelectOrigin={() => {}}
          onLocationChange={() => {}}
          locateUserTrigger={0}
          flyToTrigger={null}
          focusTrigger={null}
          onControlVehicle={() => {}}
          isControlBusy={false}
          onDeleteVehicle={() => {}}
          onDeleteEphemeral={() => {}}
          onEditVehicle={() => {}}
          onLogout={() => {}}
          lastSyncLabel="Act. 10:30"
          fleetLoading={false}
        />
      );
      rendered = true;
    } catch (err) {
      expect(err).toBeUndefined();
    }
    expect(rendered).toBe(true);
  });
});