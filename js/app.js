// Demo data with coords format (like World Cup finder)
const demoData = [
  {
    id: 1,
    name: "Oakland Community Pantry",
    address: "123 Broadway, Oakland, CA 94612",
    phone: "(510) 555-0100",
    hours: "Mon-Fri 10am-4pm, Sat 10am-2pm",
    eligibility: "Open to all East Bay residents. No documentation required.",
    foodTypes: "Canned goods, fresh produce, grains, proteins, dairy",
    frequency: "Weekly distributions on Thursdays at 2pm",
    donations: "Accepts monetary donations and food items",
    volunteer: "Looking for volunteers! Email: volunteer@oaklandpantry.org",
    coords: "37.8044,-122.2712",
    neighborhood: "Downtown Oakland"
  },
  {
    id: 2,
    name: "Berkeley Free Food Collective",
    address: "456 Shattuck Ave, Berkeley, CA 94704",
    phone: "(510) 555-0200",
    hours: "Tue-Sat 1pm-6pm",
    eligibility: "All community members welcome. No restrictions.",
    foodTypes: "Fresh vegetables, bread, pantry staples, prepared meals on weekends",
    frequency: "Daily distributions, specialty items on Saturdays",
    donations: "Tax-deductible donations accepted",
    volunteer: "Volunteers needed for food prep and distribution",
    coords: "37.8703,-122.2723",
    neighborhood: "Berkeley"
  },
  {
    id: 3,
    name: "Fruitvale Community Kitchen",
    address: "789 International Blvd, Oakland, CA 94601",
    phone: "(510) 555-0300",
    hours: "Wed-Fri 3pm-7pm, Sat 10am-3pm",
    eligibility: "Priority for families with children. All income levels.",
    foodTypes: "Culturally relevant foods, fresh produce, canned goods",
    frequency: "Twice weekly - Wednesdays and Fridays",
    donations: "Accept donations of fresh produce and non-perishables",
    volunteer: "Community volunteers help prepare and distribute food",
    coords: "37.7771,-122.2154",
    neighborhood: "Fruitvale"
  }
];

let allPantries = [];
let filteredPantries = [];
let currentView = 'map';
let map = null;
let markers = [];
let mapInitialized = false;

// INITIALIZE
function init() {
  allPantries = demoData;
  filteredPantries = allPantries;
  setupEventListeners();
  renderList();
  initMap();
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

function handleSearch(e) {
  const query = e.target.value.toLowerCase();
  filteredPantries = allPantries.filter(p => 
    p.name.toLowerCase().includes(query) ||
    p.address.toLowerCase().includes(query) ||
    p.neighborhood.toLowerCase().includes(query) ||
    p.foodTypes.toLowerCase().includes(query)
  );
  renderList();
  updateMapMarkers();
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
        map.invalidateSize();
      }, 100);
    }
  } else {
    document.querySelector('.list-view').classList.add('active');
  }
}

function renderList() {
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
      const pantry = allPantries.find(p => p.id === id);
      showModal(pantry);
    });
  });
}

function initMap() {
  // Placeholder for Google Maps integration
  // Structure ready for adding Google Maps API
  const mapEl = document.getElementById('map');
  mapEl.innerHTML = `
    <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #e8f0ed 0%, #f4d9c8 100%); font-size: 1.2rem; color: #6a6a6a; flex-direction: column; gap: 12px;">
      <div style="font-size: 2rem;">🗺️</div>
      <div>Google Maps integration coming soon</div>
      <div style="font-size: 0.85rem; color: #999;">Will display all pantry locations with coords</div>
    </div>
  `;
}

function updateMapMarkers() {
  // Update markers based on filtered pantries
  // Will be used when Google Maps is integrated
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
  
  document.getElementById('modalMapLink').href = `https://www.google.com/maps/search/${encodeURIComponent(pantry.address)}`;
  
  // Parse phone number for tel: link
  const phoneDigits = pantry.phone.replace(/\D/g, '');
  document.getElementById('modalCall').onclick = () => {
    window.location.href = `tel:${phoneDigits}`;
  };
  
  document.getElementById('pantryModal').classList.add('active');
}

function closeModal() {
  document.getElementById('pantryModal').classList.remove('active');
}

// START
document.addEventListener('DOMContentLoaded', init);