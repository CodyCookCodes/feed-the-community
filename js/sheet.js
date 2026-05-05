// sheet.js - Draggable bottom sheet (mobile only)
//
// Three snap points: peek (small, just shows search), half (~50vh), full (~90vh).
// Sheet stores its current state on the dataset so CSS can drive the visual
// presentation; this module just handles the drag interaction and snap logic.
//
// Public API:
//   setSheetState(state)  // 'peek' | 'half' | 'full' — animates to that state
//   getSheetState()        // returns current state

let sheetEl = null;
let handleAreaEl = null;
let scrollEl = null;

let isDragging = false;
let dragStartY = 0;
let dragStartHeight = 0;
let lastMoveY = 0;
let lastMoveTime = 0;
let velocity = 0; // px/ms, positive = moving down

const STATE_HEIGHTS = {
  peek: 170,
  half: 0.5,   // fraction of viewport
  full: 0.92
};

function getStateHeightPx(state) {
  const v = STATE_HEIGHTS[state];
  return v < 1 ? Math.round(window.innerHeight * v) : v;
}

function setSheetState(state) {
  if (!sheetEl) return;
  if (!STATE_HEIGHTS[state]) return;
  sheetEl.dataset.state = state;
  sheetEl.style.height = getStateHeightPx(state) + 'px';
  sheetEl.style.transition = 'height 0.28s cubic-bezier(0.32, 0.72, 0, 1)';
  // Reset scroll to top when collapsing so the user sees the search bar
  if (state !== 'full' && scrollEl) {
    scrollEl.scrollTop = 0;
  }
  // Map needs to know its container changed size
  if (typeof google !== 'undefined' && window.map) {
    setTimeout(() => google.maps.event.trigger(window.map, 'resize'), 300);
  }
}

function getSheetState() {
  return sheetEl ? sheetEl.dataset.state : null;
}

function snapToNearest(currentHeight) {
  const peekH = getStateHeightPx('peek');
  const halfH = getStateHeightPx('half');
  const fullH = getStateHeightPx('full');

  // Velocity-aware snapping: if moving fast, snap in the direction of motion
  const VELOCITY_THRESHOLD = 0.5; // px/ms
  if (Math.abs(velocity) > VELOCITY_THRESHOLD) {
    if (velocity > 0) {
      // Moving down — snap to next-lower state
      if (currentHeight > halfH) return 'half';
      return 'peek';
    } else {
      // Moving up — snap to next-higher state
      if (currentHeight < halfH) return 'half';
      return 'full';
    }
  }

  // Otherwise, snap to nearest
  const distances = {
    peek: Math.abs(currentHeight - peekH),
    half: Math.abs(currentHeight - halfH),
    full: Math.abs(currentHeight - fullH)
  };
  return Object.keys(distances).reduce((a, b) =>
    distances[a] < distances[b] ? a : b
  );
}

function onPointerDown(e) {
  // Only start drag from the handle area, not from inside scrollable content
  // (unless the scroll is already at the top and user pulls down — covered below)
  isDragging = true;
  dragStartY = e.clientY;
  dragStartHeight = sheetEl.offsetHeight;
  lastMoveY = e.clientY;
  lastMoveTime = performance.now();
  velocity = 0;

  // Disable transition during drag so it tracks the finger
  sheetEl.style.transition = 'none';
  // Capture so we keep getting events even if pointer leaves the handle
  handleAreaEl.setPointerCapture(e.pointerId);
  e.preventDefault();
}

function onPointerMove(e) {
  if (!isDragging) return;

  const now = performance.now();
  const dy = e.clientY - lastMoveY;
  const dt = now - lastMoveTime;
  if (dt > 0) {
    velocity = dy / dt;
  }
  lastMoveY = e.clientY;
  lastMoveTime = now;

  // Total drag distance from start. Negative dy = moving up = sheet growing.
  const totalDy = e.clientY - dragStartY;
  let newHeight = dragStartHeight - totalDy;

  // Clamp
  const minH = getStateHeightPx('peek');
  const maxH = getStateHeightPx('full');
  newHeight = Math.max(minH, Math.min(maxH, newHeight));

  sheetEl.style.height = newHeight + 'px';
}

function onPointerUp(e) {
  if (!isDragging) return;
  isDragging = false;
  handleAreaEl.releasePointerCapture(e.pointerId);

  const currentHeight = sheetEl.offsetHeight;
  const targetState = snapToNearest(currentHeight);
  setSheetState(targetState);
}

// Allow pulling down from the top of the scroll area to collapse the sheet
// when in 'full' state. This is the standard iOS behavior.
let scrollDragActive = false;
let scrollDragStartY = 0;
let scrollDragStartHeight = 0;

function onScrollPointerDown(e) {
  // Only handle if at top of scroll AND in full state
  if (getSheetState() !== 'full') return;
  if (scrollEl.scrollTop > 0) return;
  scrollDragActive = true;
  scrollDragStartY = e.clientY;
  scrollDragStartHeight = sheetEl.offsetHeight;
  lastMoveY = e.clientY;
  lastMoveTime = performance.now();
  velocity = 0;
}

function onScrollPointerMove(e) {
  if (!scrollDragActive) return;
  const totalDy = e.clientY - scrollDragStartY;
  // Only react to downward drags (collapsing); upward = let scroll happen
  if (totalDy <= 0) return;

  const now = performance.now();
  const dy = e.clientY - lastMoveY;
  const dt = now - lastMoveTime;
  if (dt > 0) velocity = dy / dt;
  lastMoveY = e.clientY;
  lastMoveTime = now;

  // Lock scroll while we're dragging the sheet down
  scrollEl.style.overflowY = 'hidden';
  sheetEl.style.transition = 'none';

  let newHeight = scrollDragStartHeight - totalDy;
  newHeight = Math.max(getStateHeightPx('peek'), newHeight);
  sheetEl.style.height = newHeight + 'px';
  e.preventDefault();
}

function onScrollPointerUp() {
  if (!scrollDragActive) return;
  scrollDragActive = false;
  scrollEl.style.overflowY = '';

  const currentHeight = sheetEl.offsetHeight;
  // Only snap if we actually dragged
  if (currentHeight !== scrollDragStartHeight) {
    const targetState = snapToNearest(currentHeight);
    setSheetState(targetState);
  }
}

function onResize() {
  // Re-apply current state at new viewport size
  if (sheetEl) setSheetState(getSheetState());
}

function initSheet() {
  sheetEl = document.getElementById('sheet');
  handleAreaEl = document.getElementById('sheetHandleArea');
  scrollEl = document.getElementById('sheetScroll');
  if (!sheetEl || !handleAreaEl || !scrollEl) return;

  // Set initial height
  setSheetState('half');

  // Drag from the handle
  handleAreaEl.addEventListener('pointerdown', onPointerDown);
  handleAreaEl.addEventListener('pointermove', onPointerMove);
  handleAreaEl.addEventListener('pointerup', onPointerUp);
  handleAreaEl.addEventListener('pointercancel', onPointerUp);

  // Pull-down-to-collapse from the scroll area
  scrollEl.addEventListener('pointerdown', onScrollPointerDown);
  scrollEl.addEventListener('pointermove', onScrollPointerMove);
  scrollEl.addEventListener('pointerup', onScrollPointerUp);
  scrollEl.addEventListener('pointercancel', onScrollPointerUp);

  // Tapping the search input expands the sheet to full
  const searchEl = document.getElementById('searchInputMobile');
  if (searchEl) {
    searchEl.addEventListener('focus', () => {
      if (getSheetState() !== 'full') setSheetState('full');
    });
  }

  // Keep heights correct on viewport changes (rotation, browser chrome)
  window.addEventListener('resize', onResize);
}

// Expose to other modules
window.setSheetState = setSheetState;
window.getSheetState = getSheetState;
window.initSheet = initSheet;