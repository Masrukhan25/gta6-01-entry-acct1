// Shared primitive geometry keeps the original low-poly fleet inexpensive to render.
import * as THREE from 'three';
const box = new THREE.BoxGeometry(1, 1, 1);
const tire = new THREE.CylinderGeometry(1, 1, 0.24, 8);
const puff = new THREE.IcosahedronGeometry(0.4, 0);
const rubber = new THREE.MeshStandardMaterial({ color: 0x233135, roughness: 0.95 });
const glass = new THREE.MeshStandardMaterial({ color: 0x385a66, metalness: 0.4, roughness: 0.25 });
const smokeMaterial = new THREE.MeshBasicMaterial({ color: 0x737d7b, transparent: true, opacity: 0.6 });
export function createVehicleMesh(type, color = type.palette[0]) {
  const root = new THREE.Group(), wheels = [];
  const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.25 });
  const [w, h, l] = type.builder.body.size;
  const part = (size, position, material = paint) => {
    const mesh = new THREE.Mesh(box, material); mesh.scale.set(...size); mesh.position.set(...position);
    mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh); return mesh;
  };
  part([w, h, l], [0, 0.65 + h / 2, 0]);
  part([w * 0.8, h * 0.7, l * 0.45], [0, 0.65 + h * 1.3, 0.1], glass);
  const wheelRadius = type.builder.wheels.radius;
  for (let i = 0; i < type.builder.wheels.count; i++) {
    const wheel = new THREE.Mesh(tire, rubber);
    wheel.scale.set(wheelRadius, 1, wheelRadius); wheel.rotation.z = Math.PI / 2;
    wheel.position.set(type.id === 'bike' ? 0 : (i % 2 ? 1 : -1) * w / 2, wheelRadius + 0.1, (i < (type.id === 'bike' ? 1 : 2) ? -1 : 1) * l * 0.32);
    root.add(wheel); wheels.push(wheel);
  }
  let rotor = null;
  if (type.canFly) {
    rotor = part(type.builder.rotor.size, [0, 3, 0], rubber);
    part([0.15, 0.7, 0.15], [0, 2.7, 0], rubber);
    part([0.5, 0.5, 4], [0, 1.2, 3]);
    for (const x of [-1.3, 1.3]) part([0.12, 0.12, 5], [x, 0.3, 0], rubber);
  }
  if (type.canFloat) part([w * 0.75, 0.5, l * 0.9], [0, 0.3, 0]);
  const smoke = new THREE.Mesh(puff, smokeMaterial); smoke.position.set(0, 2, -l * 0.3); smoke.visible = false; root.add(smoke);
  return { root, paint, update(state, dt, time = 0) {
    root.position.set(state.position.x, state.position.y, state.position.z);
    root.rotation.y = -state.heading;
    if (type.canFloat) root.position.y = -0.35 + Math.sin(time * 2) * 0.08;
    wheels.forEach(wheel => wheel.rotateY(state.speed * dt / wheelRadius));
    if (rotor) rotor.rotation.y += dt * (state.wrecked ? 0 : 35);
    smoke.visible = state.smoke;
    smoke.position.y = 2.4 + Math.sin(time * 4) * 0.4;
    smoke.scale.setScalar(1 + Math.sin(time * 3) * 0.25);
  } };
}
