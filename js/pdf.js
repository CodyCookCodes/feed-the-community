// pdf.js — Generate a printable / downloadable PDF of nearby resources
//
// Flow:
//   1. User clicks "Print Nearby" button → opens picker modal
//   2. User picks a location (geolocation OR tap on map)
//   3. User picks a radius (10/20/30 min walk)
//   4. Optionally narrows by category (defaults to current filter selection)
//   5. Preview shows count of matches; user clicks Generate PDF
//   6. html2pdf.js renders the printable DOM element to a downloadable PDF

let pickerCenter = null;        // {lat, lng} of the chosen center
let pickerRadiusMeters = 1609;  // default: 1 mile (~20 min walk)
let mapClickListener = null;    // handle to remove the temporary click listener
let pickerCenterMarker = null;  // visual pin for the picked center
let pickerRadiusCircle = null;  // visual circle for the radius
let pickerActive = false;       // true while in "tap the map" mode

const RADIUS_OPTIONS = [
  { label: '10 min walk',  meters: 805,  minutes: 10 },  // ~0.5 mi
  { label: '20 min walk',  meters: 1609, minutes: 20 },  // ~1 mi
  { label: '30 min walk',  meters: 2414, minutes: 30 },  // ~1.5 mi
  { label: '1 mile drive', meters: 1609, minutes: null },
  { label: '3 mile drive', meters: 4828, minutes: null }
];

const WALKING_METERS_PER_MIN = 80; // ~3 mph average pedestrian pace

// ─────────── Distance helpers ───────────

// Haversine straight-line distance between two coordinates, returns meters.
function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function approxWalkingMinutes(meters) {
  return Math.round(meters / WALKING_METERS_PER_MIN);
}

// ─────────── Location picking ───────────

function startMapPicking() {
  if (!window.map) return;
  pickerActive = true;

  // Hide the modal so the user can interact with the map.
  // We'll reopen it once they click.
  const modal = document.getElementById('pdfModal');
  if (modal) modal.classList.remove('active');

  // Visual cue that picking is active
  document.body.classList.add('picking-location');

  // Show a temporary banner so the user knows what to do
  showPickingBanner();

  // Mobile: collapse the sheet so the map is visible
  if (window.innerWidth < 1024 && typeof window.setSheetState === 'function') {
    window.setSheetState('peek');
  }

  mapClickListener = window.map.addListener('click', (e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setPickerCenter(lat, lng);
    stopMapPicking();
    // Reopen the modal showing the new selection
    const modalEl = document.getElementById('pdfModal');
    if (modalEl) modalEl.classList.add('active');
  });
}

function stopMapPicking() {
  pickerActive = false;
  document.body.classList.remove('picking-location');
  hidePickingBanner();
  if (mapClickListener) {
    google.maps.event.removeListener(mapClickListener);
    mapClickListener = null;
  }
}

function showPickingBanner() {
  let banner = document.getElementById('pickingBanner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'pickingBanner';
    banner.className = 'picking-banner';
    banner.innerHTML = `
      <span>Tap anywhere on the map to pick a starting point</span>
      <button class="picking-cancel" id="pickingCancel">Cancel</button>
    `;
    document.body.appendChild(banner);
    document.getElementById('pickingCancel').addEventListener('click', () => {
      stopMapPicking();
      const modal = document.getElementById('pdfModal');
      if (modal) modal.classList.add('active');
    });
  }
  banner.classList.add('visible');
}

function hidePickingBanner() {
  const banner = document.getElementById('pickingBanner');
  if (banner) banner.classList.remove('visible');
}

function useMyLocation() {
  if (!navigator.geolocation) {
    alert("Your browser doesn't support location access. Try tapping the map instead.");
    return;
  }
  // Loading state on the button
  const btn = document.getElementById('pdfPickGeo');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Locating…';
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      setPickerCenter(pos.coords.latitude, pos.coords.longitude);
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Use my location';
      }
    },
    (err) => {
      console.warn('Geolocation failed:', err);
      alert("Couldn't get your location. Check that location is allowed for this site, or tap the map instead.");
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Use my location';
      }
    },
    { timeout: 10000, enableHighAccuracy: false }
  );
}

function setPickerCenter(lat, lng) {
  pickerCenter = { lat, lng };
  drawPickerOverlay();
  refreshPickerPreview();
}

// Draw a marker at the picked center plus a circle showing the radius
function drawPickerOverlay() {
  if (!window.map || !pickerCenter) return;

  // Clear old overlay
  if (pickerCenterMarker) {
    pickerCenterMarker.map = null;
    pickerCenterMarker = null;
  }
  if (pickerRadiusCircle) {
    pickerRadiusCircle.setMap(null);
    pickerRadiusCircle = null;
  }

  // Center marker — distinct from category pins (use a small filled dot via PinElement)
  if (typeof PinElement !== 'undefined') {
    const pin = new PinElement({
      background: '#1a1a1a',
      borderColor: '#ffffff',
      glyphColor: '#ffffff',
      glyph: '★',
      scale: 1.1
    });
    pickerCenterMarker = new AdvancedMarkerElement({
      position: pickerCenter,
      map: window.map,
      title: 'Search center',
      content: pin.element
    });
  }

  pickerRadiusCircle = new google.maps.Circle({
    strokeColor: '#1a1a1a',
    strokeOpacity: 0.5,
    strokeWeight: 2,
    fillColor: '#1a1a1a',
    fillOpacity: 0.08,
    map: window.map,
    center: pickerCenter,
    radius: pickerRadiusMeters
  });

  // Fit map to circle so user sees the area covered
  const bounds = pickerRadiusCircle.getBounds();
  if (bounds) window.map.fitBounds(bounds);
}

function clearPickerOverlay() {
  if (pickerCenterMarker) {
    pickerCenterMarker.map = null;
    pickerCenterMarker = null;
  }
  if (pickerRadiusCircle) {
    pickerRadiusCircle.setMap(null);
    pickerRadiusCircle = null;
  }
}

// ─────────── Modal management ───────────

function openPdfModal() {
  pickerCenter = null;
  pickerRadiusMeters = 1609;
  document.getElementById('pdfModal').classList.add('active');
  // Sync the radio state to the default
  document.querySelectorAll('#pdfModal .radius-option').forEach(el => {
    el.classList.toggle('active', parseInt(el.dataset.meters) === pickerRadiusMeters);
  });
  refreshPickerPreview();

  // Mobile: collapse the sheet so the user can see the map for picking
  if (window.innerWidth < 1024 && typeof window.setSheetState === 'function') {
    window.setSheetState('peek');
  }
}

function closePdfModal() {
  document.getElementById('pdfModal').classList.remove('active');
  stopMapPicking();
  clearPickerOverlay();
}

function refreshPickerPreview() {
  const previewEl = document.getElementById('pdfPreviewCount');
  const generateBtn = document.getElementById('pdfGenerateBtn');
  if (!previewEl || !generateBtn) return;

  if (!pickerCenter) {
    previewEl.textContent = 'Pick a starting point above to see results.';
    generateBtn.disabled = true;
    return;
  }

  const matches = findMatchesForPdf();
  if (matches.length === 0) {
    previewEl.textContent = 'No resources found in that area. Try a larger radius or different center.';
    generateBtn.disabled = true;
  } else {
    previewEl.textContent = `Found ${matches.length} ${matches.length === 1 ? 'resource' : 'resources'} within this area.`;
    generateBtn.disabled = false;
  }
}

function findMatchesForPdf() {
  if (!pickerCenter) return [];
  const categoryId = (typeof getActiveCategoryId === 'function')
    ? getActiveCategoryId()
    : 'all';

  return allPantries
    .filter(p => {
      if (!p.coords) return false;
      if (categoryId !== 'all' && p.category !== categoryId) return false;

      const [lat, lng] = p.coords.split(',').map(Number);
      if (Number.isNaN(lat) || Number.isNaN(lng)) return false;
      const d = distanceMeters(pickerCenter.lat, pickerCenter.lng, lat, lng);
      return d <= pickerRadiusMeters;
    })
    .map(p => {
      const [lat, lng] = p.coords.split(',').map(Number);
      const meters = distanceMeters(pickerCenter.lat, pickerCenter.lng, lat, lng);
      return { ...p, _distanceMeters: meters };
    })
    .sort((a, b) => a._distanceMeters - b._distanceMeters);
}

function setRadius(meters) {
  pickerRadiusMeters = meters;
  document.querySelectorAll('#pdfModal .radius-option').forEach(el => {
    el.classList.toggle('active', parseInt(el.dataset.meters) === meters);
  });
  if (pickerCenter) drawPickerOverlay();
  refreshPickerPreview();
}

// ─────────── PDF generation ───────────

// ─────────── PDF generation (programmatic, no html2canvas) ───────────

// Layout constants — all in inches
const PAGE_WIDTH = 8.5;
const PAGE_HEIGHT = 11;
const MARGIN_LEFT = 0.6;
const MARGIN_RIGHT = 0.6;
const MARGIN_TOP = 0.6;
const MARGIN_BOTTOM = 0.7;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

// Brand colors as RGB triplets (jsPDF expects 0-255 ints)
const COLOR_GREEN = [45, 90, 61];
const COLOR_TERRACOTTA = [212, 112, 91];
const COLOR_TEXT = [42, 42, 42];
const COLOR_MUTED = [110, 110, 110];
const COLOR_BG_ACCENT = [244, 217, 200];

async function generatePdf() {
  const matches = findMatchesForPdf();
  if (matches.length === 0) return;

  const jsPDFCtor = (typeof jspdf !== 'undefined' && jspdf.jsPDF)
    ? jspdf.jsPDF
    : (typeof window.jspdf !== 'undefined' ? window.jspdf.jsPDF : null);

  if (!jsPDFCtor) {
    alert('PDF library failed to load. Please refresh and try again.');
    return;
  }

  const generateBtn = document.getElementById('pdfGenerateBtn');
  const origText = generateBtn.textContent;
  generateBtn.disabled = true;
  generateBtn.textContent = 'Generating PDF…';

  try {
    const pdf = new jsPDFCtor({
      unit: 'in',
      format: 'letter',
      orientation: 'portrait'
    });

    drawOverviewPage(pdf, matches);
    drawResourceCards(pdf, matches);

    const filename = `bayareafree-${new Date().toISOString().slice(0, 10)}.pdf`;
    pdf.save(filename);

    closePdfModal();
  } catch (err) {
    console.error('PDF generation failed:', err);
    alert('Sorry — PDF generation failed. Please try again.');
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = origText;
  }
}

// Draw the first overview page: title, search params, numbered list of all resources
function drawOverviewPage(pdf, matches) {
  let y = MARGIN_TOP;

  // Header bar
  pdf.setFillColor(...COLOR_GREEN);
  pdf.rect(0, 0, PAGE_WIDTH, 0.7, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.text('Bay Area Free', MARGIN_LEFT, 0.45);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text('Free resources nearby', PAGE_WIDTH - MARGIN_RIGHT, 0.45, { align: 'right' });

  y = 1.1;

  // Meta block
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  const radiusLabel = (RADIUS_OPTIONS.find(r => r.meters === pickerRadiusMeters) || {}).label
    || `${(pickerRadiusMeters / 1609).toFixed(1)} miles`;
  const categoryId = (typeof getActiveCategoryId === 'function')
    ? getActiveCategoryId() : 'all';
  const categoryLabel = categoryId === 'all'
    ? 'All categories'
    : (typeof getCategory === 'function' ? getCategory(categoryId).label : categoryId);

  pdf.setTextColor(...COLOR_TEXT);
  pdf.setFontSize(10);

  const metaRows = [
    ['Generated:', today],
    ['Search area:', radiusLabel + ' radius'],
    ['Categories:', categoryLabel],
    ['Total resources:', String(matches.length)]
  ];
  metaRows.forEach(([label, value]) => {
    pdf.setFont('helvetica', 'bold');
    pdf.text(label, MARGIN_LEFT, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(value, MARGIN_LEFT + 1.2, y);
    y += 0.22;
  });

  y += 0.15;

  // Section header
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.setTextColor(...COLOR_GREEN);
  pdf.text('Resources nearby', MARGIN_LEFT, y);
  y += 0.05;
  pdf.setDrawColor(220, 220, 220);
  pdf.setLineWidth(0.01);
  pdf.line(MARGIN_LEFT, y + 0.04, PAGE_WIDTH - MARGIN_RIGHT, y + 0.04);
  y += 0.25;

  // List
  pdf.setTextColor(...COLOR_TEXT);
  pdf.setFontSize(10);
  matches.forEach((p, i) => {
    if (y > PAGE_HEIGHT - MARGIN_BOTTOM - 0.5) {
      pdf.addPage();
      y = MARGIN_TOP;
    }
    const walkMin = approxWalkingMinutes(p._distanceMeters);
    pdf.setFont('helvetica', 'bold');
    const numText = `${i + 1}. ${p.name}`;
    const numLines = pdf.splitTextToSize(numText, CONTENT_WIDTH);
    numLines.forEach(line => {
      pdf.text(line, MARGIN_LEFT, y);
      y += 0.18;
    });
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...COLOR_MUTED);
    if (p.address) {
      const addrLines = pdf.splitTextToSize(p.address, CONTENT_WIDTH - 0.2);
      addrLines.forEach(line => {
        pdf.text(line, MARGIN_LEFT + 0.2, y);
        y += 0.16;
      });
    }
    pdf.setFontSize(9);
    pdf.text(
      `~${walkMin} min walk · ${(p._distanceMeters / 1609).toFixed(2)} mi`,
      MARGIN_LEFT + 0.2, y
    );
    pdf.setFontSize(10);
    pdf.setTextColor(...COLOR_TEXT);
    y += 0.25;
  });

  y += 0.15;

  // Disclaimer box
  if (y < PAGE_HEIGHT - MARGIN_BOTTOM - 1.0) {
    pdf.setFillColor(255, 248, 235);
    pdf.rect(MARGIN_LEFT, y, CONTENT_WIDTH, 0.6, 'F');
    pdf.setDrawColor(...COLOR_TERRACOTTA);
    pdf.setLineWidth(0.04);
    pdf.line(MARGIN_LEFT, y, MARGIN_LEFT, y + 0.6);
    pdf.setFontSize(9);
    pdf.setTextColor(...COLOR_MUTED);
    const disclaimer = 'Hours and eligibility may have changed since this list was generated. Please call ahead to confirm. For other services, dial 2-1-1.';
    const lines = pdf.splitTextToSize(disclaimer, CONTENT_WIDTH - 0.2);
    let dy = y + 0.2;
    lines.forEach(line => {
      pdf.text(line, MARGIN_LEFT + 0.1, dy);
      dy += 0.16;
    });
  }
}

// Draw detail cards — one resource at a time, automatic page breaks
function drawResourceCards(pdf, matches) {
  pdf.addPage();
  let y = MARGIN_TOP;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.setTextColor(...COLOR_GREEN);
  pdf.text('Detailed listings', MARGIN_LEFT, y);
  y += 0.4;

  matches.forEach((p, i) => {
    const cardHeight = estimateCardHeight(pdf, p);
    if (y + cardHeight > PAGE_HEIGHT - MARGIN_BOTTOM) {
      pdf.addPage();
      y = MARGIN_TOP;
    }
    y = drawResourceCard(pdf, p, i, y);
    y += 0.2;
  });

  // Footer on last page
  pdf.setFontSize(8);
  pdf.setTextColor(...COLOR_MUTED);
  const footerText = `Generated from bayareafree.com on ${new Date().toLocaleDateString('en-US')}. Information may be out of date — verify before going.`;
  const footerLines = pdf.splitTextToSize(footerText, CONTENT_WIDTH);
  let fy = PAGE_HEIGHT - MARGIN_BOTTOM + 0.2;
  footerLines.forEach(line => {
    pdf.text(line, PAGE_WIDTH / 2, fy, { align: 'center' });
    fy += 0.14;
  });
}

function estimateCardHeight(pdf, p) {
  // Rough estimate — used to decide whether to start a new page.
  // Returns inches.
  let h = 0.6; // header + spacing
  h += 0.2; // address
  const fields = ['hours', 'phone', 'eligibility', 'foodTypes', 'frequency'];
  fields.forEach(f => {
    const value = (p[f] || '').trim();
    if (!value) return;
    const lines = pdf.splitTextToSize(`${f}: ${value}`, CONTENT_WIDTH - 0.2);
    h += lines.length * 0.18 + 0.04;
  });
  h += 0.2; // bottom padding
  return h;
}

function drawResourceCard(pdf, p, index, startY) {
  const cat = (typeof getCategory === 'function')
    ? getCategory(p.category)
    : { label: p.category || 'Resource', color: '#2D5A3D' };
  const catRgb = hexToRgb(cat.color || '#2D5A3D');
  const walkMin = approxWalkingMinutes(p._distanceMeters);

  let y = startY;

  // Card border
  const cardTop = y;

  // Number badge
  pdf.setFillColor(...COLOR_GREEN);
  pdf.circle(MARGIN_LEFT + 0.18, y + 0.18, 0.16, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text(String(index + 1), MARGIN_LEFT + 0.18, y + 0.22, { align: 'center' });

  // Name + meta
  pdf.setTextColor(...COLOR_TEXT);
  pdf.setFontSize(13);
  const nameLines = pdf.splitTextToSize(p.name, CONTENT_WIDTH - 0.6);
  let ny = y + 0.15;
  nameLines.forEach(line => {
    pdf.text(line, MARGIN_LEFT + 0.5, ny);
    ny += 0.22;
  });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(...COLOR_MUTED);
  pdf.text(`${cat.label} · ~${walkMin} min walk`, MARGIN_LEFT + 0.5, ny);
  ny += 0.18;

  y = Math.max(y + 0.45, ny + 0.05);

  // Address
  if (p.address) {
    pdf.setFontSize(11);
    pdf.setTextColor(...COLOR_TEXT);
    const addrLines = pdf.splitTextToSize(p.address, CONTENT_WIDTH - 0.2);
    addrLines.forEach(line => {
      pdf.text(line, MARGIN_LEFT + 0.1, y);
      y += 0.18;
    });
    y += 0.06;
  }

  // Fields
  const fields = [
    { label: 'Hours', value: p.hours },
    { label: 'Phone', value: p.phone },
    { label: 'Eligibility', value: p.eligibility },
    { label: "What's available", value: p.foodTypes },
    { label: 'Distribution schedule', value: p.frequency }
  ].filter(f => (f.value || '').trim());

  pdf.setFontSize(10);
  fields.forEach(f => {
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...COLOR_GREEN);
    const labelText = `${f.label}: `;
    pdf.text(labelText, MARGIN_LEFT + 0.1, y);
    const labelWidth = pdf.getTextWidth(labelText);

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...COLOR_TEXT);
    const lines = pdf.splitTextToSize(f.value, CONTENT_WIDTH - 0.2 - labelWidth);
    lines.forEach((line, idx) => {
      const x = idx === 0 ? MARGIN_LEFT + 0.1 + labelWidth : MARGIN_LEFT + 0.2;
      pdf.text(line, x, y);
      y += 0.17;
    });
    y += 0.04;
  });

  // Card border
  y += 0.05;
  pdf.setDrawColor(220, 220, 220);
  pdf.setLineWidth(0.01);
  pdf.roundedRect(MARGIN_LEFT, cardTop, CONTENT_WIDTH, y - cardTop, 0.05, 0.05);

  return y;
}

function hexToRgb(hex) {
  const num = parseInt(hex.replace('#', ''), 16);
  return [(num >> 16) & 0xff, (num >> 8) & 0xff, num & 0xff];
}

// ─────────── Wire up ───────────

function initPdf() {
  // Open buttons (desktop and mobile)
  document.querySelectorAll('.pdf-open-btn').forEach(btn => {
    btn.addEventListener('click', openPdfModal);
  });

  // Close
  const closeBtn = document.getElementById('closePdfModal');
  if (closeBtn) closeBtn.addEventListener('click', closePdfModal);

  // Backdrop click closes
  const modal = document.getElementById('pdfModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closePdfModal();
    });
  }

  // Location pickers
  const geoBtn = document.getElementById('pdfPickGeo');
  if (geoBtn) geoBtn.addEventListener('click', useMyLocation);

  const mapBtn = document.getElementById('pdfPickMap');
  if (mapBtn) mapBtn.addEventListener('click', startMapPicking);

  // Radius options
  document.querySelectorAll('#pdfModal .radius-option').forEach(el => {
    el.addEventListener('click', () => setRadius(parseInt(el.dataset.meters)));
  });

  // Generate
  const genBtn = document.getElementById('pdfGenerateBtn');
  if (genBtn) genBtn.addEventListener('click', generatePdf);
}