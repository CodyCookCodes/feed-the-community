// map.js - Handle Google Maps initialization and marker management

let map = null;
let markers = [];
let mapInitialized = false;

function initMap() {
  const mapEl = document.getElementById('map');
  
  // Center on Oakland
  const oaklandCenter = { lat: 37.81835, lng: -122.2620 };
  
  map = new google.maps.Map(mapEl, {
    zoom: 12,
    center: oaklandCenter,
    mapTypeId: 'roadmap',
    styles: [
      {
        "featureType": "water",
        "elementType": "geometry",
        "stylers": [{ "color": "#e9e9e9" }]
      }
    ]
  });
  
  mapInitialized = true;
}

function updateMapMarkers(pantriesData) {
  if (!map || !mapInitialized) return;
  
  // Clear existing markers
  markers.forEach(marker => marker.setMap(null));
  markers = [];
  
  // Add markers for pantries
  pantriesData.forEach(pantry => {
    if (!pantry.coords) return;
    
    const [lat, lng] = pantry.coords.split(',').map(Number);
    const marker = new google.maps.Marker({
      position: { lat, lng },
      map: map,
      title: pantry.name
    });
    
    marker.addListener('click', () => {
      showModal(pantry);
    });
    
    markers.push(marker);
  });
}

function fitMapToMarkers() {
  if (!map || markers.length === 0) return;
  
  const bounds = new google.maps.LatLngBounds();
  markers.forEach(marker => bounds.extend(marker.getPosition()));
  map.fitBounds(bounds);
}