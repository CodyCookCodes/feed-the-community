// app.js - Main initialization and orchestration

async function init() {
  console.log('Init starting...');
  
  // Load data
  await loadPantries();
  console.log('Pantries loaded:', allPantries.length);
  
  // Setup UI
  setupEventListeners();
  console.log('Event listeners set up');
  renderList(allPantries);
  
  // Setup map
  initMap();
  updateMapMarkers(allPantries);
  console.log('Map initialized');
}

// START
document.addEventListener('DOMContentLoaded', () => {
  // Wait for Google Maps to load
  const checkGoogleMaps = setInterval(() => {
    if (typeof google !== 'undefined') {
      clearInterval(checkGoogleMaps);
      console.log('Google Maps loaded, starting init');
      init();
    }
  }, 100);
});