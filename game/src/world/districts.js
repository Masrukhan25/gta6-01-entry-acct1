// District colors serve signs; palettes tint the generated building instances.
export const DISTRICTS = Object.freeze([
  { id: 'boardwalk', name: 'Boardwalk', color: '#d87551', palette: ['#d87551', '#e9a05f', '#efc889'] },
  { id: 'old-town', name: 'Old Town', color: '#c8794d', palette: ['#bd6c49', '#db9a64', '#e4c295'] },
  { id: 'neon-strip', name: 'Neon Strip', color: '#9b4f82', palette: ['#553b68', '#754d83', '#9a5d8e'] },
  { id: 'harbor', name: 'Harbor', color: '#4f8490', palette: ['#597a7d', '#78928a', '#bd9b6e'] },
  { id: 'glass-downtown', name: 'Glass Downtown', color: '#488696', palette: ['#3c7188', '#5793a0', '#77aeb0'] },
  { id: 'suburbs', name: 'Suburbs', color: '#9eaa77', palette: ['#c69b72', '#c7b586', '#879d79'] },
  { id: 'industrial', name: 'Industrial', color: '#8c735f', palette: ['#8b7363', '#a58c70', '#6c7773'] },
  { id: 'highway-loop', name: 'Highway Loop', color: '#647a80', palette: ['#76878a', '#a49c84', '#6e7c82'] },
  { id: 'hills', name: 'Hills', color: '#85906b', palette: ['#d0b085', '#ae9a76', '#c48d68'] },
  { id: 'airfield', name: 'Airfield', color: '#8a9892', palette: ['#a3a79b', '#c7b78e', '#88978b'] },
]);

// Rows run north to south (+Z), columns west to east (+X). Each cell spans 120 m.
const DISTRICT_GRID = Object.freeze([
  ['hills', 'suburbs', 'industrial', 'airfield'],
  ['boardwalk', 'old-town', 'glass-downtown', 'harbor'],
  ['boardwalk', 'old-town', 'neon-strip', 'harbor'],
  ['highway-loop', 'suburbs', 'industrial', 'harbor'],
]);

// Beyond the city bounds, use the nearest edge cell.
export function getDistrictAt(x, z) {
  const column = Math.max(0, Math.min(3, Math.floor((x + 240) / 120)));
  const row = Math.max(0, Math.min(3, Math.floor((z + 240) / 120)));
  const id = DISTRICT_GRID[row][column];
  return DISTRICTS.find((district) => district.id === id) ?? DISTRICTS[0];
}

export const CITY_EXTENT = 240;
