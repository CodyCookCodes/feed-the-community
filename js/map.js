// map.js - Google Maps initialization and marker management

let map = null;
let markers = [];
let mapInitialized = false;
let AdvancedMarkerElement = null;
let PinElement = null;

async function initMap() {
  const mapEl = document.getElementById('map');

  // Center on Oakland
  const oaklandCenter = { lat: 37.4953, lng: -121.9909 };
37.4953577, -121.9909104
  const { Map } = await google.maps.importLibrary('maps');
  const markerLib = await google.maps.importLibrary('marker');
  AdvancedMarkerElement = markerLib.AdvancedMarkerElement;
  PinElement = markerLib.PinElement;
  // Expose to other modules (pdf.js uses these for the picker overlay)
  window.AdvancedMarkerElement = AdvancedMarkerElement;
  window.PinElement = PinElement;

  map = new Map(mapEl, {
    zoom: 11,
    center: oaklandCenter,
    mapId: 'BAY_AREA_FREE_MAP',
    mapTypeId: 'roadmap',
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    zoomControlOptions: {
      position: google.maps.ControlPosition.RIGHT_TOP
    }
  });

  // Expose for other modules (sheet.js triggers resize on it)
  window.map = map;
  mapInitialized = true;
}

// Build a category-colored pin. Slightly darker border than the fill
// so the pin stays visible against light or warm-colored map tiles.
function buildPin(category) {
  return new PinElement({
    background: category.color,
    borderColor: shadeColor(category.color, -25),
    glyphColor: '#ffffff',
    scale: 1.0
  });
}

// Darken or lighten a hex color by a percentage (-100 to 100)
function shadeColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  const adjust = (c) => Math.max(0, Math.min(255, Math.round(c + (c * percent / 100))));
  const newR = adjust(r);
  const newG = adjust(g);
  const newB = adjust(b);
  return '#' + ((newR << 16) | (newG << 8) | newB).toString(16).padStart(6, '0');
}

function updateMapMarkers(pantriesData) {
  if (!map || !mapInitialized || !AdvancedMarkerElement) return;

  // Clear existing markers
  markers.forEach(marker => { marker.map = null; });
  markers = [];

  pantriesData.forEach(pantry => {
    if (!pantry.coords) return;

    const [lat, lng] = pantry.coords.split(',').map(Number);
    const cat = getCategory(pantry.category);

    const marker = new AdvancedMarkerElement({
      position: { lat, lng },
      map: map,
      title: pantry.name,
      content: buildPin(cat).element
    });

    marker.addListener('click', () => {
      if (window.innerWidth < 1024 && typeof window.setSheetState === 'function') {
        window.setSheetState('peek');
      }
      showModal(pantry);
    });

    markers.push(marker);
  });
}

function fitMapToMarkers() {
  if (!map || markers.length === 0) return;

  const bounds = new google.maps.LatLngBounds();
  markers.forEach(marker => bounds.extend(marker.position));
  map.fitBounds(bounds);
}
