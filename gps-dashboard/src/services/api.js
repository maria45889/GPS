const mockUsers = [
  {
    id: 'u-1',
    name: 'Admin Ops',
    email: 'admin@rideguard.com',
    password: 'admin123',
    role: 'admin',
    permissions: ['fleet:view', 'fleet:manage', 'alerts:view', 'alerts:resolve'],
  },
  {
    id: 'u-2',
    name: 'Fleet Manager',
    email: 'manager@rideguard.com',
    password: 'manager123',
    role: 'manager',
    permissions: ['fleet:view', 'alerts:view'],
  },
  {
    id: 'u-3',
    name: 'Driver',
    email: 'driver@rideguard.com',
    password: 'driver123',
    role: 'driver',
    permissions: ['fleet:view'],
  },
];

const mockVehicles = [
  {
    id: 'PC-450V',
    name: 'Yamaha MT-07',
    plate: 'PC-450V',
    driver: 'Juan Pérez',
    status: 'active',
    speed: 45,
    battery: 78,
    fuel: 82,
    temp: 82,
    position: [4.6097, -74.0817],
    route: [
      [4.6097, -74.0817],
      [4.6100, -74.0820],
      [4.6105, -74.0825],
      [4.6110, -74.0830],
      [4.6115, -74.0835],
    ],
  },
  {
    id: 'AT-0202',
    name: 'Honda CBR 600RR',
    plate: 'AT-0202',
    driver: 'María García',
    status: 'active',
    speed: 38,
    battery: 85,
    fuel: 70,
    temp: 79,
    position: [4.6150, -74.0750],
    route: [
      [4.6150, -74.0750],
      [4.6145, -74.0755],
      [4.6140, -74.0760],
    ],
  },
  {
    id: 'MT-8904',
    name: 'Kawasaki Ninja ZX-6R',
    plate: 'KWS-451',
    driver: 'Carlos Rodríguez',
    status: 'stopped',
    speed: 0,
    battery: 92,
    fuel: 90,
    temp: 45,
    position: [4.5980, -74.0780],
    route: [],
  },
];

const mockAlerts = [
  {
    id: 'ALT-101',
    severity: 'critical',
    title: 'GeoFence Breach - Salida No Autorizada',
    description: 'El vehículo cruzó el perímetro delineado del área restringida.',
    vehicleId: 'PC-450V',
    vehicleName: 'Yamaha MT-07',
    plate: 'PC-450V',
    speed: 84,
    timestamp: '12:48 PM',
    locationName: 'Salida Home Zone',
    lat: 37.7740,
    lng: -122.4100,
    status: 'active',
  },
  {
    id: 'ALT-102',
    severity: 'warning',
    title: 'Exceso de Velocidad (95 km/h)',
    description: 'Velocidad registrada supera el límite configurado.',
    vehicleId: 'AT-0202',
    vehicleName: 'Honda CBR 600RR',
    plate: 'AT-0202',
    speed: 95,
    timestamp: '12:45 PM',
    locationName: 'Market St',
    lat: 37.7800,
    lng: -122.4120,
    status: 'active',
  },
];

const delay = (ms = 400) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
  async login(email, password) {
    await delay();
    const user = mockUsers.find(item => item.email === email && item.password === password);
    if (!user) {
      throw new Error('Credenciales inválidas');
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
      },
      token: `mock-token-${user.id}`,
    };
  },

  async getFleet() {
    await delay();
    return mockVehicles;
  },

  async getAlerts() {
    await delay();
    return mockAlerts;
  },

  async getDashboardSummary() {
    await delay();
    return {
      activeVehicles: 2,
      stoppedVehicles: 1,
      offlineVehicles: 0,
      criticalAlerts: 1,
      avgSpeed: 41,
      efficiency: 94,
    };
  },
};
