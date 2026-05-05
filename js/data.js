// data.js - Handle Google Sheets CSV loading and parsing

let allPantries = [];

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRgEI10LtZo-npzc-jspT_mXypsj2mTUSvGkZtBO7PBU2k-L0rc3cI4e9xVEpk3fpoXfxQJeEc4YDh6/pub?gid=0&single=true&output=csv';

async function loadPantries() {
  try {
    const response = await fetch(SHEET_CSV_URL);
    const csv = await response.text();
    allPantries = parseCSV(csv).filter(isVisible);
    return allPantries;
  } catch (error) {
    console.error('Error loading pantries:', error);
    return [];
  }
}

function parseCSV(csv) {
  const lines = csv.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());

  return lines.slice(1).map((line, index) => {
    // Handle quoted fields in CSV (addresses have commas)
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^"|"$/g, ''));

    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = values[i] || '';
    });
    obj.id = index;

    // Default category for entries without one (existing pantry data)
    if (!obj.category) {
      obj.category = 'food_pantry';
    }

    return obj;
  });
}

// Hide entries explicitly marked as inactive. Heating/cooling centers and
// other seasonal resources can have `active=no` in the sheet to suppress
// them outside their season. Anything else (blank, "yes", "y", "1", "true")
// is treated as active.
function isVisible(entry) {
  const flag = (entry.active || '').toString().trim().toLowerCase();
  if (!flag) return true;
  return ['yes', 'y', '1', 'true', 'active'].includes(flag);
}