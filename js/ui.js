// ui.js - Handle UI rendering, list display, modals, and search

let filteredPantries = [];
let currentView = 'map';

function renderList(pantriesData) {
  filteredPantries = pantriesData;
  const listHtml = filteredPantries.map(p => `
    <div class="pantry-card" data-id="${p.id}">
      <div class="pantry-name">${p.name}</div>
      <div class="pantry-address">${p.address}</div>
      <div class="pantry-meta">
        <span class="meta-tag">${p.neighborhood}</span>
        <span class="meta-tag">${p.hours.split(',')[0]}</span>
      </div>
    </div>
  `).join('');

  document.getElementById('pantryList').innerHTML = listHtml || '<div class="empty-state"><div class="empty-state-icon">🔍</div><div class="empty-state-text">No pantries found. Try a different search.</div></div>';

  document.querySelectorAll('.pantry-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = parseInt(card.dataset.id);
      const pantry = allPantries.find((p, idx) => idx === id);
      showModal(pantry);
    });
  });
}

function handleSearch(e) {
  const query = e.target.value.toLowerCase();
  const filtered = allPantries.filter(p => 
    p.name.toLowerCase().includes(query) ||
    p.address.toLowerCase().includes(query) ||
    p.neighborhood.toLowerCase().includes(query) ||
    p.foodTypes.toLowerCase().includes(query)
  );
  renderList(filtered);
  updateMapMarkers(filtered);
}

function handleViewToggle(e) {
  const view = e.target.dataset.view;
  document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
  e.target.classList.add('active');
  
  currentView = view;
  document.querySelector('.map-view').classList.remove('active');
  document.querySelector('.list-view').classList.remove('active');
  
  if (view === 'map') {
    document.querySelector('.map-view').classList.add('active');
    if (map && mapInitialized) {
      setTimeout(() => {
        google.maps.event.trigger(map, 'resize');
      }, 100);
    }
  } else {
    document.querySelector('.list-view').classList.add('active');
  }
}

function showModal(pantry) {
  document.getElementById('modalTitle').textContent = pantry.name;
  document.getElementById('modalAddress').textContent = pantry.address;
  document.getElementById('modalHours').textContent = pantry.hours;
  document.getElementById('modalPhone').textContent = pantry.phone;
  document.getElementById('modalEligibility').textContent = pantry.eligibility;
  document.getElementById('modalFoodTypes').textContent = pantry.foodTypes;
  document.getElementById('modalFrequency').textContent = pantry.frequency;
  document.getElementById('modalDonations').textContent = pantry.donations;
  document.getElementById('modalVolunteer').textContent = pantry.volunteer;
  
  document.getElementById('modalMapLink').href = `https://www.google.com/maps/search/${encodeURIComponent(pantry.name + ' ' + pantry.address)}`;
  
  // Parse phone number for tel: link
  
  document.getElementById('pantryModal').classList.add('active');
}

function closeModal() {
  document.getElementById('pantryModal').classList.remove('active');
}

function setupEventListeners() {
  document.getElementById('searchInput').addEventListener('input', handleSearch);
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', handleViewToggle);
  });
  document.getElementById('closeModal').addEventListener('click', closeModal);
  document.getElementById('pantryModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('pantryModal')) closeModal();
  });
}