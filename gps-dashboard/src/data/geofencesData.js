export const initialGeofences = [
  {
    id: 1,
    name: 'Home Zone',
    type: 'polygon',
    positions: [
      [37.7710, -122.4280],
      [37.7745, -122.4270],
      [37.7740, -122.4200],
      [37.7695, -122.4215],
    ],
    center: [37.7725, -122.4245],
    radius: 650,
    color: '#00F0FF',
    rule: 'Notificar salida no autorizada',
    active: true,
  },
  {
    id: 2,
    name: 'Office Zone',
    type: 'polygon',
    positions: [
      [37.7660, -122.3990],
      [37.7710, -122.3980],
      [37.7705, -122.3890],
      [37.7645, -122.3905],
    ],
    center: [37.7675, -122.3945],
    radius: 850,
    color: '#00E676',
    rule: 'Registro de entrada y control horario',
    active: true,
  },
  {
    id: 3,
    name: 'Corredor Portuario',
    type: 'circle',
    center: [37.7880, -122.4000],
    radius: 700,
    color: '#FF9100',
    rule: 'Límite velocidad 50 km/h',
    active: false,
  }
];
