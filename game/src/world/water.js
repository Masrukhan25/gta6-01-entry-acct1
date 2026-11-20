// Render Maravela’s western coastline and sheltered inner harbor.
import * as THREE from 'three';

export function createWater(scene) {
  const material = new THREE.MeshStandardMaterial({
    color: 0x176f83,
    roughness: 0.22,
    metalness: 0.32,
    transparent: true,
    opacity: 0.94,
  });
  // The sea plane extends beyond the playable edge to fill the horizon.
  const coastline = new THREE.Mesh(new THREE.PlaneGeometry(560, 520), material);
  coastline.rotation.x = -Math.PI / 2;
  coastline.position.set(-490, -0.035, 0);
  coastline.receiveShadow = true;
  scene.add(coastline);

  const harbor = new THREE.Mesh(new THREE.PlaneGeometry(92, 96), material.clone());
  harbor.position.set(162, -0.035, -44);
  harbor.rotation.x = -Math.PI / 2;
  harbor.receiveShadow = true;
  scene.add(harbor);

  // The shallow-water strip is visual; the swim boundaries are defined below.
  const shallowsMaterial = new THREE.MeshStandardMaterial({
    color: 0x55a5a0,
    roughness: 0.36,
    transparent: true,
    opacity: 0.55,
  });
  const shallows = new THREE.Mesh(new THREE.PlaneGeometry(42, 520), shallowsMaterial);
  shallows.rotation.x = -Math.PI / 2;
  shallows.position.set(-216, -0.02, 0);
  scene.add(shallows);

  return {
    isWater(x, z) {
      const openSea = x < -212;
      const harborBasin = x > 116 && x < 208 && z > -92 && z < 4;
      return openSea || harborBasin;
    },
  };
}
