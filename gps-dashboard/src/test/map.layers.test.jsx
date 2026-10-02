// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import { MapFlyToHandler, RouteFocusHandler } from '../components/map/MapControllers';
import { MapNavigationLayer } from '../components/map/MapNavigationLayer';
import { MapGeofences } from '../components/map/MapGeofences';
import { MapContext } from '../components/map/MapContext';
import { MLGL } from '../lib/maplibreLoader';

vi.mock('../lib/routing', () => ({
  fetchDrivingRoute: vi.fn().mockResolvedValue({
    coords: [[0, 0], [1, 1]],
    distanceM: 1000,
    durationS: 600,
  }),
}));

const makeSource = () => ({ setData: vi.fn() });

const FakeMarker = {
  instances: [],
};

class MarkerStub {
  constructor(options) {
    this.options = options;
    this.element = options.element;
    FakeMarker.instances.push(this);
  }

  setLngLat(lngLat) { this.lngLat = lngLat; return this; }

  addTo() { return this; }

  setPopup(popup) { this.popup = popup; return this; }

  togglePopup() { this.toggled = true; }

  getElement() { return this.element; }

  remove() { this.removed = true; }
}

class PopupStub {
  constructor(options) { this.options = options; }

  setLngLat() { return this; }

  setHTML(html) { this.html = html; return this; }

  addTo() { return this; }
}

const createFakeMap = () => {
  const sources = new Map();
  const layers = new Map();

  const map = {
    sources,
    layers,
    flyTo: vi.fn(),
    fitBounds: vi.fn(),
    easeTo: vi.fn(),
    getPitch: vi.fn(() => 0),
    resize: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    getCanvas: vi.fn(() => ({ style: {} })),
    getContainer: vi.fn(() => ({ addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    setPaintProperty: vi.fn(),
    setLayoutProperty: vi.fn(),
    removeLayer: vi.fn(),
    removeSource: vi.fn(),
    moveLayer: vi.fn(),
    isStyleLoaded: vi.fn(() => true),
    getStyle: vi.fn(() => ({ layers: [] })),
    getLayers: vi.fn(() => []),
    getSource: vi.fn((id) => sources.get(id)),
    addSource: vi.fn((id, spec) => sources.set(id, { ...spec, ...makeSource() })),
    getLayer: vi.fn((id) => layers.get(id)),
    addLayer: vi.fn((spec) => layers.set(spec.id, spec)),
  };

  map[MLGL] = { Marker: MarkerStub, Popup: PopupStub };

  return map;
};

const withMap = (map, ui) => <MapContext.Provider value={map}>{ui}</MapContext.Provider>;

describe('Map Layers and Controllers (MapLibre)', () => {
  let map;

  beforeEach(() => {
    vi.clearAllMocks();
    FakeMarker.instances.length = 0;
    map = createFakeMap();
  });

  describe('MapControllers', () => {
    it('flies to the coordinates in lng/lat order when flyToTrigger changes', () => {
      render(withMap(map, <MapFlyToHandler flyToTrigger={{ coords: [4.6, -74.0], zoom: 18 }} />));

      expect(map.flyTo).toHaveBeenCalledWith(expect.objectContaining({
        center: [-74.0, 4.6],
        zoom: 18,
      }));
    });

    it('fits bounds in lng/lat order when routeFocusTrigger changes', () => {
      render(withMap(map, <RouteFocusHandler routeFocusTrigger={{ route: [[4.6, -74.0], [4.7, -74.1]] }} />));

      expect(map.fitBounds).toHaveBeenCalledWith(
        [[-74.1, 4.6], [-74.0, 4.7]],
        expect.objectContaining({ maxZoom: 16 }),
      );
    });

    it('ignores malformed routes instead of throwing', () => {
      expect(() => render(withMap(map, <RouteFocusHandler routeFocusTrigger={{ route: [[1, 2]] }} />))).not.toThrow();
      expect(map.fitBounds).not.toHaveBeenCalled();
    });
  });

  describe('MapNavigationLayer', () => {
    it('writes the driving route as a LineString feature', async () => {
      await act(async () => {
        render(withMap(map, (
          <MapNavigationLayer
            isFollowingRoute
            originPosition={[4.61, -74.01]}
            targetPosition={[4.6, -74.0]}
          />
        )));
      });

      await waitFor(() => expect(map.addSource).toHaveBeenCalled());
      const source = [...map.sources.values()].find((item) => item.type === 'geojson');
      await waitFor(() => expect(source.setData).toHaveBeenCalled());

      const { features } = source.setData.mock.calls.at(-1)[0];
      expect(features).toHaveLength(1);
      expect(features[0].geometry.type).toBe('LineString');
      expect(features[0].geometry.coordinates[0]).toEqual([0, 0]);
    });

    it('does not draw anything when the route is not being followed', async () => {
      await act(async () => {
        render(withMap(map, <MapNavigationLayer isFollowingRoute={false} originPosition={[4.61, -74.01]} targetPosition={[4.6, -74.0]} />));
      });

      await waitFor(() => expect(map.addSource).toHaveBeenCalled());
      const source = [...map.sources.values()].find((item) => item.type === 'geojson');
      await waitFor(() => expect(source.setData).toHaveBeenCalled());
      expect(source.setData.mock.calls.at(-1)[0].features).toHaveLength(0);
    });
  });

  describe('MapGeofences', () => {
    it('only publishes active geofences', async () => {
      await act(async () => {
        render(withMap(map, (
          <MapGeofences
            geofences={[
              { id: 'geo1', name: 'Zone A', type: 'circle', center: [4.6, -74.0], radius: 500, active: true },
              { id: 'geo2', name: 'Zone B', type: 'circle', center: [4.7, -74.1], radius: 300, active: false },
            ]}
            pendingCenter={null}
            selectedVehicle={null}
          />
        )));
      });

      const source = map.sources.get('gps-geofences');
      await waitFor(() => expect(source.setData).toHaveBeenCalled());

      const { features } = source.setData.mock.calls.at(-1)[0];
      expect(features).toHaveLength(1);
      expect(features[0].properties.id).toBe('geo1');
      expect(features[0].geometry.type).toBe('Polygon');
    });

    it('turns the zone red when the tracked vehicle breaches it', async () => {
      await act(async () => {
        render(withMap(map, (
          <MapGeofences
            geofences={[
              { id: 'geo1', name: 'Prohibida', type: 'circle', center: [4.6, -74.0], radius: 500, active: true, rule: 'ingreso no autorizado' },
            ]}
            pendingCenter={null}
            selectedVehicle={{ position: [4.6, -74.0] }}
          />
        )));
      });

      const source = map.sources.get('gps-geofences');
      await waitFor(() => expect(source.setData).toHaveBeenCalled());
      expect(source.setData.mock.calls.at(-1)[0].features[0].properties.color).toBe('#ef5c72');
    });
  });
});