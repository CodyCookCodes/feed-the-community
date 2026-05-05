// ui.js - List rendering, search, modal, filter coordination

let filteredPantries = [];

function applyFilters() {
  const query = (document.getElementById('searchInputDesktop')?.value
    || document.getElementById('searchInputMobile')?.value
    || '').toLowerCase();

  const categoryId = getActiveCategoryId();

  return allPantries.filter(p => {
    // Category filter
    if (categoryId !== 'all' && p.category !== categoryId) return false;

    // Search filter (no query = pass all)
    if (!query) return true;
    return (
      (p.name || '').toLowerCase().includes(query) ||
      (p.address || '').toLowerCase().includes(query) ||
      (p.neighborhood || '').toLowerCase().includes(query) ||
      (p.foodTypes || '').toLowerCase().includes(query)
    );
  });
}

function buildCardHtml(p) {
  const cat = getCategory(p.category);
  const firstHours = (p.hours || '').split(',')[0] || '';
  return `
    <div class="pantry-card" data-id="${p.id}">
      <div class="pantry-card-top">
        <span class="pantry-icon" style="background: ${cat.color};"></span>
        <div class="pantry-name">${p.name}</div>
      </div>
      <div class="pantry-address">${p.address}</div>
      <div class="pantry-meta">
        ${p.neighborhood ? `<span class="meta-tag">${p.neighborhood}</span>` : ''}
        ${firstHours ? `<span class="meta-tag">${firstHours}</span>` : ''}
      </div>
    </div>
  `;
}

function buildEmptyStateHtml() {
  const categoryId = getActiveCategoryId();
  if (categoryId === 'all') {
    return `<div class="empty-state">
      <div class="empty-state-icon">🔍</div>
      <div class="empty-state-text">No resources found. Try a different search.</div>
    </div>`;
  }
  const cat = getCategory(categoryId);
  return `<div class="empty-state">
    <div class="empty-state-icon">${cat.icon}</div>
    <div class="empty-state-text">No ${cat.label.toLowerCase()} found yet. Try "All" or a different search.</div>
  </div>`;
}

function renderList(pantriesData) {
  filteredPantries = pantriesData;

  const html = filteredPantries.length
    ? filteredPantries.map(buildCardHtml).join('')
    : buildEmptyStateHtml();

  const mobileList = document.getElementById('pantryListMobile');
  const desktopList = document.getElementById('pantryListDesktop');
  if (mobileList) mobileList.innerHTML = html;
  if (desktopList) desktopList.innerHTML = html;

  document.querySelectorAll('.pantry-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = parseInt(card.dataset.id);
      const pantry = allPantries[id];
      showModal(pantry);
    });
  });
}

function refreshView() {
  const filtered = applyFilters();
  renderList(filtered);
  updateMapMarkers(filtered);
}

function handleSearch(e) {
  // Sync both inputs so they don't drift
  const otherId = e.target.id === 'searchInputMobile'
    ? 'searchInputDesktop'
    : 'searchInputMobile';
  const otherInput = document.getElementById(otherId);
  if (otherInput && otherInput.value !== e.target.value) {
    otherInput.value = e.target.value;
  }
  refreshView();
}

// Modal section configuration: maps each section's DOM element to its data field.
// Sections whose data is empty OR whose category excludes the field are hidden.
const MODAL_SECTIONS = [
  { field: 'address',     elId: 'modalAddress',     sectionId: 'modalSectionAddress' },
  { field: 'hours',       elId: 'modalHours',       sectionId: 'modalSectionHours' },
  { field: 'phone',       elId: 'modalPhone',       sectionId: 'modalSectionPhone' },
  { field: 'eligibility', elId: 'modalEligibility', sectionId: 'modalSectionEligibility' },
  { field: 'foodTypes',   elId: 'modalFoodTypes',   sectionId: 'modalSectionFoodTypes' },
  { field: 'frequency',   elId: 'modalFrequency',   sectionId: 'modalSectionFrequency' },
  { field: 'donations',   elId: 'modalDonations',   sectionId: 'modalSectionDonations' },
  { field: 'volunteer',   elId: 'modalVolunteer',   sectionId: 'modalSectionVolunteer' }
];

function showModal(pantry) {
  const cat = getCategory(pantry.category);

  // Title
  const titleEl = document.getElementById('modalTitle');
  titleEl.textContent = pantry.name;

  // Category badge in modal header
  const badgeEl = document.getElementById('modalCategoryBadge');
  if (badgeEl) {
    badgeEl.textContent = `${cat.icon} ${cat.label}`;
    badgeEl.style.background = `${cat.color}20`;
    badgeEl.style.color = cat.color;
  }

  // Render every section, hiding ones whose data is empty
  // OR whose category doesn't include them in showFields
  MODAL_SECTIONS.forEach(({ field, elId, sectionId }) => {
    const sectionEl = document.getElementById(sectionId);
    const contentEl = document.getElementById(elId);
    if (!sectionEl || !contentEl) return;

    const value = (pantry[field] || '').trim();
    // Address is always shown (it's the primary location info)
    const categoryAllows = field === 'address' || cat.showFields.includes(field);

    if (!value || !categoryAllows) {
      sectionEl.style.display = 'none';
      return;
    }
    sectionEl.style.display = '';

    if (field === 'phone') {
      const phoneDigits = value.replace(/\D/g, '');
      if (phoneDigits.length >= 10) {
        contentEl.innerHTML = `<a href="tel:${phoneDigits}">${value}</a>`;
      } else {
        contentEl.textContent = value;
      }
    } else {
      contentEl.textContent = value;
    }
  });

  document.getElementById('modalMapLink').href =
    `https://www.google.com/maps/search/${encodeURIComponent(pantry.name + ' ' + pantry.address)}`;

  document.getElementById('pantryModal').classList.add('active');
}

function closeModal() {
  document.getElementById('pantryModal').classList.remove('active');
}

function setupEventListeners() {
  const mobileSearch = document.getElementById('searchInputMobile');
  const desktopSearch = document.getElementById('searchInputDesktop');
  if (mobileSearch) mobileSearch.addEventListener('input', handleSearch);
  if (desktopSearch) desktopSearch.addEventListener('input', handleSearch);

  document.getElementById('closeModal').addEventListener('click', closeModal);
  document.getElementById('pantryModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('pantryModal')) closeModal();
  });
}