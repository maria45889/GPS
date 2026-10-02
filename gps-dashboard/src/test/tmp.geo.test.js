import { describe, it, expect } from 'vitest';

const getGeofenceType = (geofence) => {
  if (geofence.mode) return geofence.mode;
  if (geofence.zoneType) return geofence.zoneType;
  const ruleStr = String(geofence.rule || '').toLowerCase();
  if (ruleStr.includes('prohibid') || ruleStr.includes('inside') || ruleStr.includes('ingreso no autoriz')) return 'forbidden';
  if (ruleStr.includes('entrada') || ruleStr.includes('ingreso')) return 'entry';
  if (ruleStr.includes('salida') || ruleStr.includes('egreso')) return 'exit';
  return 'allowed';
};

const isInsideGeofence = (vehicle, geofence) => {
  if (!vehicle?.position || !geofence) return false;
  return true;
};

const isGeofenceBreach = (vehicle, geofence) => {
  if (!vehicle?.position || !geofence) return false;
  const inside = isInsideGeofence(vehicle, geofence);
  const type = getGeofenceType(geofence);
  switch (type) {
    case 'forbidden':
    case 'entry':
      return inside;
    case 'exit':
    case 'allowed':
    default:
      return !inside;
  }
};

describe('DIAG geofence rule semantics (valores reales del CHECK constraint)', () => {
  it("el CHECK de la BD solo permite 'outside' e 'inside'", () => {
    expect(getGeofenceType({ rule: 'outside' })).toBe('allowed');
    expect(getGeofenceType({ rule: 'inside' })).toBe('forbidden');
  });

  it('vehiculo SIN posicion (offline) NO debe contar como breach', () => {
    const outside = { rule: 'outside', center: [-0.28, -78.54], radius: 600 };
    const inside = { rule: 'inside', center: [-0.28, -78.54], radius: 600 };

    const offline = { id: 'veh-offline', position: null };

    console.log('offline vs rule=outside ->', isGeofenceBreach(offline, outside));
    console.log('offline vs rule=inside  ->', isGeofenceBreach(offline, inside));

    expect(isGeofenceBreach(offline, outside)).toBe(false);
  });

  it('geocerca sin center tampoco debe ser breach', () => {
    const orphan = { rule: 'outside' };
    const vehicle = { position: [-0.28, -78.54] };
    console.log('vehiculo posicionado vs geocerca sin center ->', isGeofenceBreach(vehicle, orphan));
    expect(isGeofenceBreach(vehicle, orphan)).toBe(false);
  });
});
