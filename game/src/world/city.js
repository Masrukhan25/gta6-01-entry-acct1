// Build the city geometry and provide its collision and district data to the simulation.
import * as THREE from 'three';
import { CITY_EXTENT, DISTRICTS, getDistrictAt } from './districts.js';
import { createRoadNetwork } from './roads.js';
import { createWater } from './water.js';

const CHUNK_SIZE = 120;
const CHUNKS_PER_AXIS = 4;
const BLOCK_OFFSETS = [-30, 30];

// A separate seed per chunk makes its skyline and palette deterministic.
function seeded(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function makeDistrictSign(scene, district, x, z) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  context.fillStyle = '#15333a';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = district.color;
  context.lineWidth = 8;
  context.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
  context.fillStyle = '#fff0d7';
  context.font = 'bold 48px system-ui, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(district.name.toUpperCase(), canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(11, 2.75), new THREE.MeshStandardMaterial({ map: texture, emissive: district.color, emissiveIntensity: 0.22, roughness: 0.55, side: THREE.DoubleSide }));
  sign.position.set(x, 9, z);
  sign.rotation.y = Math.PI / 4;
  scene.add(sign);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 5, 6), new THREE.MeshStandardMaterial({ color: 0x596866, metalness: 0.4, roughness: 0.6 }));
  post.position.set(x, 2.5, z);
  scene.add(post);
}

function buildChunk(scene, column, row, colliders) {
  const random = seeded(column * 97 + row * 7919 + 403);
  const centerX = -CITY_EXTENT + (column + 0.5) * CHUNK_SIZE;
  const centerZ = -CITY_EXTENT + (row + 0.5) * CHUNK_SIZE;
  const district = getDistrictAt(centerX, centerZ);
  const buildings = [];
  const roofs = [];
  const trims = [];
  // Four blocks surround the road crossing, each with four building footprints.
  for (const blockZ of BLOCK_OFFSETS) {
    for (const blockX of BLOCK_OFFSETS) {
      for (let index = 0; index < 4; index += 1) {
        const width = 10 + random() * 5;
        const depth = 10 + random() * 5;
        const localX = blockX + (index % 2 ? 11 : -11);
        const localZ = blockZ + (index >= 2 ? 11 : -11);
        let height = 7 + random() * 9;
        if (district.id === 'glass-downtown') height = 24 + random() * 42;
        if (district.id === 'neon-strip') height = 12 + random() * 24;
        if (district.id === 'old-town' || district.id === 'boardwalk') height = 6 + random() * 10;
        if (district.id === 'suburbs' || district.id === 'hills') height = 5 + random() * 10;
        const x = centerX + localX;
        const z = centerZ + localZ;
        const tint = district.palette[Math.floor(random() * district.palette.length)];
        buildings.push({ x, y: height / 2, z, sx: width, sy: height, sz: depth, color: tint });
        roofs.push({ x, y: height + 0.45, z, sx: width + 0.8, sy: 0.65, sz: depth + 0.8, color: district.id === 'glass-downtown' ? '#d4d4bf' : '#6c5d51' });
        if (district.id === 'neon-strip') {
          trims.push({ x: x + width / 2 + 0.08, y: 3.2 + random() * 3, z, sx: 0.22, sy: 0.45, sz: depth * 0.72, color: random() > 0.5 ? '#f14ec0' : '#43def1' });
        }
        colliders.push({ minX: x - width / 2, maxX: x + width / 2, minZ: z - depth / 2, maxZ: z + depth / 2, height, low: false });
      }
    }
  }

  // Both levels use the same centered transform; colliders keep full detail at any distance.
  const detailed = new THREE.Group();
  const simplified = new THREE.Group();
  const lod = new THREE.LOD();
  lod.position.set(centerX, 0, centerZ);
  const createInstances = (geometry, material, entries, castShadow, target) => {
    const mesh = new THREE.InstancedMesh(geometry, material, entries.length);
    const transform = new THREE.Object3D();
    entries.forEach((entry, index) => {
      transform.position.set(entry.x - centerX, entry.y, entry.z - centerZ);
      transform.scale.set(entry.sx, entry.sy, entry.sz);
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
      mesh.setColorAt(index, new THREE.Color(entry.color));
    });
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    target.add(mesh);
  };
  createInstances(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: district.id === 'glass-downtown' ? 0.24 : 0.78, metalness: district.id === 'glass-downtown' ? 0.3 : 0.06 }), buildings, true, detailed);
  createInstances(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.74 }), roofs, false, detailed);
  if (trims.length) createInstances(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.8, roughness: 0.25 }), trims, false, detailed);
  const farBuildings = BLOCK_OFFSETS.flatMap((blockZ) => BLOCK_OFFSETS.map((blockX) => ({
    x: blockX,
    y: district.id === 'glass-downtown' ? 25 : 8,
    z: blockZ,
    sx: 32,
    sy: district.id === 'glass-downtown' ? 50 : 16,
    sz: 32,
    color: district.palette[0],
  })));
  createInstances(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.66 }), farBuildings, false, simplified);
  lod.addLevel(detailed, 0);
  lod.addLevel(simplified, 155);
  lod.updateMatrixWorld(true);
  scene.add(lod);
}

export function createCity(scene) {
  const roadSystem = createRoadNetwork(scene);
  const water = createWater(scene);
  const colliders = [...roadSystem.colliders];
  for (let row = 0; row < CHUNKS_PER_AXIS; row += 1) {
    for (let column = 0; column < CHUNKS_PER_AXIS; column += 1) {
      buildChunk(scene, column, row, colliders);
    }
  }
  addBoardwalkProps(scene, colliders);
  addDistrictSigns(scene);
  return {
    colliders,
    water,
    districtAt: getDistrictAt,
    chunkCount: CHUNKS_PER_AXIS ** 2,
    districtNames: DISTRICTS.map((district) => district.name),
  };
}

function addBoardwalkProps(scene, colliders) {
  const palms = [];
  const leaves = [];
  for (let index = 0; index < 12; index += 1) {
    const z = -214 + index * 39;
    palms.push({ x: -205, y: 3.2, z, sx: 0.7, sy: 6.4, sz: 0.7 });
    for (let leaf = 0; leaf < 5; leaf += 1) {
      const angle = leaf * Math.PI * 0.4;
      leaves.push({ x: -205 + Math.cos(angle) * 2.1, y: 6.25, z: z + Math.sin(angle) * 2.1, sx: 1, sy: 0.25, sz: 3.5, ry: -angle });
    }
  }
  const addPropInstances = (geometry, material, entries, shadow = false) => {
    const mesh = new THREE.InstancedMesh(geometry, material, entries.length);
    const transform = new THREE.Object3D();
    entries.forEach((entry, index) => {
      transform.position.set(entry.x, entry.y, entry.z);
      transform.rotation.y = entry.ry ?? 0;
      transform.scale.set(entry.sx, entry.sy, entry.sz);
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
    });
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    mesh.instanceMatrix.needsUpdate = true;
    scene.add(mesh);
  };
  addPropInstances(new THREE.CylinderGeometry(0.5, 0.75, 1, 7), new THREE.MeshStandardMaterial({ color: 0x806047, roughness: 0.88 }), palms, true);
  addPropInstances(new THREE.ConeGeometry(0.5, 1, 5), new THREE.MeshStandardMaterial({ color: 0x47785d, roughness: 0.8, side: THREE.DoubleSide }), leaves, false);

  const barrier = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.4, 1.1), new THREE.MeshStandardMaterial({ color: 0xe2a761, roughness: 0.68 }));
  barrier.position.set(-174, 0.7, -6.5);
  barrier.castShadow = true;
  barrier.receiveShadow = true;
  scene.add(barrier);
  colliders.push({ minX: -176.1, maxX: -171.9, minZ: -7.05, maxZ: -5.95, height: 1.4, low: true });

}

function addDistrictSigns(scene) {
  // Sign labels are authored waypoints and need not match the cell under the post.
  const signSpots = [
    [-192, 76], [-72, 76], [48, 76], [168, 76],
    [-192, -44], [-72, -44], [48, -44], [168, -44],
    [-72, -164], [168, -164],
  ];
  const signDistricts = ['boardwalk', 'old-town', 'neon-strip', 'harbor', 'boardwalk', 'old-town', 'glass-downtown', 'harbor', 'highway-loop', 'airfield'];
  signSpots.forEach(([x, z], index) => makeDistrictSign(scene, DISTRICTS.find((district) => district.id === signDistricts[index]), x, z));
}
