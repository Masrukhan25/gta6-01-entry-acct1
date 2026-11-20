// Build a damp, walkable street grid with sidewalks, lane paint, a raised loop, and lamps.
import * as THREE from 'three';

const EXTENT = 240;
const STEP = 60;

function addInstances(scene, geometry, material, entries, castShadow = false) {
  if (!entries.length) return null;
  const mesh = new THREE.InstancedMesh(geometry, material, entries.length);
  const transform = new THREE.Object3D();
  entries.forEach((entry, index) => {
    transform.position.set(entry.x, entry.y, entry.z);
    transform.rotation.set(entry.rx ?? 0, entry.ry ?? 0, entry.rz ?? 0);
    transform.scale.set(entry.sx ?? 1, entry.sy ?? 1, entry.sz ?? 1);
    transform.updateMatrix();
    mesh.setMatrixAt(index, transform.matrix);
    if (entry.color) mesh.setColorAt(index, new THREE.Color(entry.color));
  });
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  mesh.instanceMatrix.needsUpdate = true;
  scene.add(mesh);
  return mesh;
}

export function createRoadNetwork(scene) {
  const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x303b3d, roughness: 0.2, metalness: 0.32 });
  const sidewalkMaterial = new THREE.MeshStandardMaterial({ color: 0xc2ae8f, roughness: 0.88 });
  const laneMaterial = new THREE.MeshStandardMaterial({ color: 0xf0d99f, emissive: 0x342712, roughness: 0.58 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(520, 520), new THREE.MeshStandardMaterial({ color: 0x657c6e, roughness: 0.96 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.08;
  ground.receiveShadow = true;
  scene.add(ground);

  const roads = [];
  const sidewalks = [];
  const markings = [];
  for (let coordinate = -EXTENT; coordinate <= EXTENT; coordinate += STEP) {
    roads.push({ x: coordinate, y: 0, z: 0, sx: 15, sy: 0.13, sz: 500 });
    roads.push({ x: 0, y: 0.005, z: coordinate, sx: 500, sy: 0.13, sz: 15 });
    sidewalks.push({ x: coordinate - 10, y: 0.015, z: 0, sx: 4, sy: 0.15, sz: 500 });
    sidewalks.push({ x: coordinate + 10, y: 0.015, z: 0, sx: 4, sy: 0.15, sz: 500 });
    sidewalks.push({ x: 0, y: 0.02, z: coordinate - 10, sx: 500, sy: 0.15, sz: 4 });
    sidewalks.push({ x: 0, y: 0.02, z: coordinate + 10, sx: 500, sy: 0.15, sz: 4 });
    for (let dash = -225; dash <= 225; dash += 22) {
      markings.push({ x: coordinate, y: 0.075, z: dash, sx: 0.18, sy: 0.035, sz: 7 });
      markings.push({ x: dash, y: 0.078, z: coordinate, sx: 7, sy: 0.035, sz: 0.18 });
    }
  }
  addInstances(scene, new THREE.BoxGeometry(1, 1, 1), roadMaterial, roads);
  addInstances(scene, new THREE.BoxGeometry(1, 1, 1), sidewalkMaterial, sidewalks);
  addInstances(scene, new THREE.BoxGeometry(1, 1, 1), laneMaterial, markings);

  const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x32464a, metalness: 0.48, roughness: 0.44 });
  const lampMaterial = new THREE.MeshStandardMaterial({ color: 0xf6c374, emissive: 0xf5a94a, emissiveIntensity: 1.2, roughness: 0.24 });
  const poles = [];
  const bulbs = [];
  for (let z = -210; z <= 210; z += 60) {
    for (let x = -210; x <= 210; x += 60) {
      poles.push({ x: x + 13, y: 2.8, z: z + 13, sx: 0.16, sy: 5.6, sz: 0.16 });
      bulbs.push({ x: x + 13, y: 5.55, z: z + 13, sx: 0.7, sy: 0.22, sz: 0.7 });
    }
  }
  addInstances(scene, new THREE.CylinderGeometry(0.5, 0.5, 1, 6), poleMaterial, poles, true);
  addInstances(scene, new THREE.SphereGeometry(0.5, 8, 6), lampMaterial, bulbs);

  const bridge = new THREE.Mesh(new THREE.BoxGeometry(120, 0.9, 20), new THREE.MeshStandardMaterial({ color: 0x586467, roughness: 0.38, metalness: 0.3 }));
  bridge.position.set(118, 3.2, -44);
  bridge.receiveShadow = true;
  bridge.castShadow = true;
  scene.add(bridge);
  // Docks and helipad are authored safe access points, outside building footprints.
  for (const dock of boatDocks) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(7, 0.3, 3), sidewalkMaterial);
    mesh.position.set(dock.x + 4, 0.12, dock.z); scene.add(mesh);
  }
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 0.12, 24), laneMaterial);
  pad.position.set(helipad.x, 0.12, helipad.z); scene.add(pad);
  // Visible signals share one material per aspect/axis; updateLights changes them in place.
  const signalMaterials = Object.fromEntries(['x', 'z'].map(axis => [axis, new THREE.MeshStandardMaterial({ color: 0x51d394, emissive: 0x51d394 })]));
  for (const light of trafficLights) for (const axis of ['x', 'z']) {
    const signal = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.2, 0.5), signalMaterials[axis]);
    signal.position.set(light.x + (axis === 'x' ? 8 : -8), 3, light.z + 8); scene.add(signal);
  }
  return scene.userData.roadsApi = { colliders: [], roads: ROADS, getLanePath, nearestRoad, trafficLights, parkedSpawns, boatDocks, helipad,
    updateLights(time, override) {
      for (const axis of ['x', 'z']) {
        const phase = typeof override === 'string' ? override : override?.[axis] ?? lightPhase(time, axis);
        const color = phase === 'green' ? 0x51d394 : phase === 'yellow' ? 0xffc653 : 0xe94b50;
        signalMaterials[axis].color.setHex(color); signalMaterials[axis].emissive.setHex(color);
      }
    },
  };
}

// Each boulevard has two opposing lanes. Paths are traversed from start to end.
const eastNames = ['Saltwind Way', 'Palmera Avenue', 'Lantern Street', 'Foundry Road', 'Solana Boulevard', 'Coral Walk', 'Market Street', 'Festival Avenue', 'Tidebreak Drive'];
const northNames = ['Coastline Road', 'Brisa Street', 'Cedar Avenue', 'Old Bell Road', 'Maravela Spine', 'Glass Avenue', 'Harbor Road', 'Kestrel Street', 'Marea Road'];
export const ROADS = Array.from({ length: 9 }, (_, i) => ['x', 'z'].map((axis, j) => ({
  id: `${axis}-${i}`, name: (j ? northNames : eastNames)[i], axis, coordinate: -240 + i * 60, length: 480,
  lanes: [{ id: 'right', offset: 3.3, direction: 1 }, { id: 'left', offset: -3.3, direction: -1 }],
}))).flat();
export function getLanePath(id, laneId = 'right') {
  const road = typeof id === 'object' ? id : ROADS.find(r => r.id === id) ?? ROADS[0];
  const lane = road.lanes.find(l => l.id === laneId) ?? road.lanes[0];
  const point = along => road.axis === 'x' ? { x: along, z: road.coordinate + lane.offset } : { x: road.coordinate + lane.offset, z: along };
  return { road, lane, start: point(-240 * lane.direction), end: point(240 * lane.direction), length: 480 };
}
export function nearestRoad(position, z) {
  const x = typeof position === 'number' ? position : position.x;
  z = typeof position === 'number' ? z : position.z;
  return ROADS.reduce((best, road) => Math.abs((road.axis === 'x' ? z : x) - road.coordinate) < Math.abs((best.axis === 'x' ? z : x) - best.coordinate) ? road : best);
}
export const trafficLights = [-180, -120, -60, 0, 60, 120, 180].flatMap(x => [-180, -120, -60, 0, 60, 120, 180].map(z => ({ x, z, green: 12, yellow: 3, red: 15, cycle: 30 })));
export function lightPhase(time, axis = 'x') {
  const phase = ((time + (axis === 'z' ? 15 : 0)) % 30 + 30) % 30;
  return phase < 12 ? 'green' : phase < 15 ? 'yellow' : 'red';
}
export const parkedSpawns = [
  { x: -174, z: 5, type: 'sedan' }, { x: -168, z: 5, type: 'sports' },
  { x: -162, z: 5, type: 'muscle' }, { x: -150, z: 5, type: 'suv' },
  { x: -138, z: 5, type: 'truck' }, { x: -128, z: 5, type: 'bike' },
];
export const boatDocks = [{ x: -216, z: 60, type: 'boat' }, { x: -216, z: -60, type: 'boat' }];
export const helipad = { x: 180, z: -180, type: 'helicopter' };
