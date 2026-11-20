// Pure arcade simulation: heading zero faces -Z; damage is remaining condition.
import { getType } from './types.js';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function createVehicleState(type) {
  type = typeof type === 'string' ? getType(type) : type;
  return { type, position: { x: 0, y: 0, z: 0 }, heading: 0, speed: 0, speedKmh: 0,
    velocity: { x: 0, z: 0 }, damage: 100, nitro: 100, horn: false, smoke: false, wrecked: false,
    upgrades: { engine: 0, armor: 0, nitro: 0 }, onCollision: null, collisionTest: null, altitude: 0 };
}
export function updateVehicle(s, input = {}, delta = 0) {
  const dt = clamp(delta, 0, 0.05), t = s.type;
  s.damage = clamp(s.damage, 0, 100); s.wrecked = s.damage <= 0; s.smoke = s.damage < 35;
  s.horn = !!input.horn;
  const throttle = clamp(Number(input.throttle ?? 0), -1, 1);
  const boosting = input.nitro && s.nitro > 0 && throttle > 0 && !s.wrecked;
  s.nitro = clamp(s.nitro + (boosting ? -28 : 4) * dt, 0, 100);
  const power = (0.4 + s.damage * 0.006) * (1 + s.upgrades.engine * 0.12);
  if (!s.wrecked) {
    const braking = throttle * s.speed < -0.1;
    s.speed += throttle * (braking ? t.braking : t.acceleration * power * (boosting ? 1.65 + s.upgrades.nitro * 0.1 : 1)) * dt;
  }
  const drag = input.handbrake && !t.canFly ? 10 : throttle && !s.wrecked ? 0.35 : 1.7;
  s.speed = Math.sign(s.speed) * Math.max(0, Math.abs(s.speed) - drag * dt);
  s.speed = clamp(s.speed, -t.topSpeed * 0.28, t.topSpeed * power * (boosting ? 1.35 : 1));
  s.heading += clamp(input.steer || 0, -1, 1) * t.steering * (1 / (1 + Math.abs(s.speed) / 18)) * clamp(s.speed / 5, -1, 1) * dt;
  const grip = 1 - Math.exp(-t.grip * (input.handbrake ? 0.15 : 1) * dt);
  s.velocity.x += (Math.sin(s.heading) * s.speed - s.velocity.x) * grip;
  s.velocity.z += (-Math.cos(s.heading) * s.speed - s.velocity.z) * grip;
  if (t.canFly) s.altitude = clamp(s.altitude + (input.lift && throttle > 0 && !s.wrecked ? 7 : -3) * dt, 0, 70);
  const next = { x: s.position.x + s.velocity.x * dt, y: s.altitude, z: s.position.z + s.velocity.z * dt };
  const hit = s.collisionTest?.(next, s);
  if (hit) {
    const impact = Math.hypot(s.velocity.x, s.velocity.z);
    s.damage = clamp(s.damage - Math.max(0, impact - 2) * 1.8 / (1 + s.upgrades.armor * 0.4), 0, 100);
    s.speed *= -0.18; s.velocity.x *= -0.18; s.velocity.z *= -0.18;
    s.onCollision?.({ impact, hit, state: s });
  } else Object.assign(s.position, next);
  s.speedKmh = Math.abs(s.speed) * 3.6;
  s.wrecked = s.damage <= 0; s.smoke = s.damage < 35;
  return s;
}
export const updateHandling = updateVehicle;
