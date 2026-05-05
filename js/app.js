// app.js - Main initialization and orchestration

function hideLoadingScreen() {
  const el = document.getElementById('loadingScreen');
  if (!el) return;
  el.classList.add('hidden');
  // Remove from DOM after fade-out completes so it doesn't block events
  setTimeout(() => el.remove(), 500);
}

function showLoadingError(message) {
  const el = document.getElementById('loadingScreen');
  if (!el) return;
  el.classList.add('error');
  const tagline = el.querySelector('.loading-tagline');
  if (tagline) {
    tagline.textContent = message ||
      'Something went wrong loading the map. Please refresh to try again.';
  }
}

async function init() {
  try {
    console.log('Init starting...');

    await loadPantries();
    console.log('Pantries loaded:', allPantries.length);

    if (allPantries.length === 0) {
      throw new Error('No data available. Check your connection and try again.');
    }

    setupEventListeners();
    initFilterPills();
    renderList(allPantries);

    // Mobile bottom sheet (no-op on desktop because the sheet is hidden via CSS,
    // but we still init listeners so resize works if the user resizes the window)
    initSheet();

    await initMap();
    updateMapMarkers(allPantries);
    console.log('Map initialized');

    initPdf();

    hideLoadingScreen();
  } catch (err) {
    console.error('Init failed:', err);
    showLoadingError(err.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Wait for Google Maps script tag to populate the global `google` object
  let waitedMs = 0;
  const MAX_WAIT_MS = 15000; // 15s before giving up

  const checkGoogleMaps = setInterval(() => {
    if (typeof google !== 'undefined' && google.maps) {
      clearInterval(checkGoogleMaps);
      console.log('Google Maps loaded, starting init');
      init();
    } else if (waitedMs >= MAX_WAIT_MS) {
      clearInterval(checkGoogleMaps);
      showLoadingError(
        "We couldn't load the map. Check your connection and refresh to try again."
      );
    }
    waitedMs += 100;
  }, 100);
});