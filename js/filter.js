// filter.js - Category filter pills (renders into desktop and mobile containers)

let activeCategoryId = 'all'; // 'all' or a category id from CATEGORIES

function getActiveCategoryId() {
  return activeCategoryId;
}

function setActiveCategory(id) {
  activeCategoryId = id;
  // Update visual state on every pill (both desktop and mobile copies)
  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.classList.toggle('active', pill.dataset.category === id);
  });
  // Re-run search/filter pipeline. handleSearch re-applies the current
  // search term + the new category filter.
  if (typeof handleSearch === 'function') {
    // Synthesize an event-like object from whichever search input is active
    const fakeEvent = { target: document.getElementById('searchInputDesktop') };
    if (!fakeEvent.target.value) {
      fakeEvent.target = document.getElementById('searchInputMobile');
    }
    handleSearch(fakeEvent);
  }
}

function buildPillHtml() {
  // "All" pill first, then one per category
  const allPill = `
    <button class="filter-pill active" data-category="all">
      <span class="pill-label">All</span>
    </button>
  `;
  const catPills = CATEGORIES.map(c => `
    <button class="filter-pill" data-category="${c.id}" style="--pill-color: ${c.color};">
      <span class="pill-label">${c.short}</span>
    </button>
  `).join('');
  return allPill + catPills;
}

function initFilterPills() {
  const html = buildPillHtml();

  ['filterPillsDesktop', 'filterPillsMobile'].forEach(containerId => {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = html;
  });

  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      setActiveCategory(pill.dataset.category);
    });
  });
}