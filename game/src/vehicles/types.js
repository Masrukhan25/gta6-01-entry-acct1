// Original Maravela catalogue. Dimensions are metres; speeds are metres per second.
// Builder parts describe THREE Box/Cylinder primitives without coupling tuning to rendering.
const model = (id, name, topSpeed, acceleration, braking, steering, grip, mass, seats, dimensions, palette, extra = {}) => ({
  id, name, topSpeed, acceleration, braking, steering, grip, mass, seats, seatCount: seats,
  canFly: false, canFloat: false, palette, colors: palette, price: Math.round(mass * topSpeed / 3),
  builder: { body: { primitive: 'BoxGeometry', size: dimensions }, wheels: { primitive: 'CylinderGeometry', radius: id === 'bike' ? 0.38 : 0.36, count: id === 'bike' ? 2 : 4 }, rotor: null }, ...extra,
});
export const TYPES = Object.freeze([
  model('sedan', 'Maravela Solana', 39, 8, 15, 1.8, 7, 1350, 4, [1.85, 0.7, 4.2], ['#d4b684', '#488b94', '#e5e0cd']),
  model('sports', 'Brisa Veloce', 62, 14, 21, 2.1, 9, 1180, 2, [1.9, 0.52, 4.1], ['#ed7753', '#43bcb9', '#ecd878']),
  model('muscle', 'Candela Rumbler', 51, 12, 16, 1.6, 4.5, 1690, 2, [2, 0.75, 4.7], ['#8c517a', '#d5a64b', '#344d57']),
  model('suv', 'Sierra Palmera', 36, 7, 14, 1.5, 7, 2100, 6, [2.1, 1.1, 4.5], ['#65826c', '#d3b18a', '#384653']),
  model('truck', 'Marea Hauler', 30, 5, 11, 1.2, 6, 3200, 3, [2.3, 1.3, 5.6], ['#c68c4f', '#4b777f', '#c6c9ad']),
  model('bike', 'Lucero Swift', 48, 13, 18, 2.5, 8, 240, 2, [0.55, 0.55, 1.8], ['#e5b64e', '#d65e65', '#5cc1b9']),
  model('boat', 'Bahia Skimmer', 32, 6, 8, 1.05, 2, 1800, 4, [2.5, 0.65, 5.4], ['#f2dfad', '#62b9c0', '#e67e59'], { canFloat: true }),
  model('helicopter', 'Cielo Kestrel', 56, 9, 12, 1.4, 4, 2400, 4, [2.1, 1.4, 4.8], ['#efbc5d', '#558e99', '#b96d65'], { canFly: true }),
]);
TYPES.forEach(type => {
  if (type.canFloat || type.canFly) type.builder.wheels.count = 0;
  if (type.canFly) type.builder.rotor = { primitive: 'BoxGeometry', size: [10, 0.08, 0.23] };
});
export const VEHICLE_TYPES = TYPES;
export function getType(id) { return TYPES.find(type => type.id === id) ?? TYPES[0]; }
