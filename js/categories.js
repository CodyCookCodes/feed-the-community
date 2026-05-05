// categories.js - Single source of truth for resource categories.
//
// Each category has:
//   id      - matches the value in the sheet's `category` column
//   label   - display name in the filter UI
//   short   - shorter version for tight UI spots (mobile pills)
//   icon    - emoji used on cards and pills
//   color   - hex color for map markers (must visually distinguish on a roadmap)
//   showFields - which modal sections to render for this category
//                (others are hidden even if data is present, to reduce noise)
//
// Order in this array drives display order in the filter row.

const CATEGORIES = [
  {
    id: 'food_pantry',
    label: 'Food Pantries',
    short: 'Pantries',
    color: '#D4705B',
    showFields: ['hours', 'phone', 'eligibility', 'foodTypes', 'frequency', 'donations', 'volunteer']
  },
  {
    id: 'free_meal',
    label: 'Free Meals',
    short: 'Meals',
    color: '#E8A04B',
    showFields: ['hours', 'phone', 'eligibility', 'frequency', 'donations', 'volunteer']
  },
  {
    id: 'diaper_hygiene',
    label: 'Diapers & Hygiene',
    short: 'Hygiene',
    color: '#9B6BB0',
    showFields: ['hours', 'phone', 'eligibility', 'frequency']
  },
  {
    id: 'clothing',
    label: 'Free Clothing',
    short: 'Clothing',
    color: '#7BA05B',
    showFields: ['hours', 'phone', 'eligibility', 'frequency', 'donations']
  },
  {
    id: 'calfresh',
    label: 'CalFresh / Food Stamps',
    short: 'CalFresh',
    color: '#2D5A3D',
    showFields: ['hours', 'phone', 'eligibility']
  },
  {
    id: 'school_meal',
    label: 'School Meals',
    short: 'School Meals',
    color: '#D4A45B',
    showFields: ['hours', 'phone', 'eligibility', 'frequency']
  },
  {
    id: 'heating_cooling',
    label: 'Heating / Cooling Centers',
    short: 'Heat/Cool',
    color: '#C25450',
    showFields: ['hours', 'phone']
  }
];

const CATEGORIES_BY_ID = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

const DEFAULT_CATEGORY_ID = 'food_pantry';

function getCategory(id) {
  return CATEGORIES_BY_ID[id] || CATEGORIES_BY_ID[DEFAULT_CATEGORY_ID];
}