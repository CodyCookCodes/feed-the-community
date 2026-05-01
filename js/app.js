// app.js - Main initialization and orchestration

async function init() {
  // Load data
  await loadPantries();
  
  // Setup UI
  setupEventListeners();
  renderList(allPantries);
  
  // Setup map
  initMap();
  updateMapMarkers(allPantries);
}

// START
document.addEventListener('DOMContentLoaded', () => {
  // Wait for Google Maps to load
  const checkGoogleMaps = setInterval(() => {
    if (typeof google !== 'undefined') {
      clearInterval(checkGoogleMaps);
      init();
    }
  }, 100);
});