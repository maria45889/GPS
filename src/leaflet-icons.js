import L from 'leaflet'

// Icono personalizado para la ubicación actual
const currentLocationIcon = L.divIcon({
  className: 'custom-marker',
  html: '<div style="background-color: #667eea; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10]
})

// Icono personalizado para ubicaciones guardadas
const savedLocationIcon = L.divIcon({
  className: 'custom-marker',
  html: '<div style="background-color: #28a745; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -8]
})

export { currentLocationIcon, savedLocationIcon }