// A small original low-poly runner with fixed-step walking, collision, jump, vault, and swim states.
import * as THREE from 'three';

export const CHARACTERS = Object.freeze([{id:'mara',name:'Mara Voss',backstory:'Ex-courier who knows every shortcut.',walkSpeed:5.1,sprintSpeed:9.2,maxHealth:100,drivingBonus:0,jacketColor:0xd66a42},{id:'dario',name:'Dario Hale',backstory:'Ex-mechanic with a practiced hand on the wheel.',walkSpeed:5.1,sprintSpeed:8.7,maxHealth:105,drivingBonus:.15,jacketColor:0x4a9890},{id:'lena',name:'Lena Kade',backstory:'Ex-harbor guard built to stay in the fight.',walkSpeed:4.9,sprintSpeed:8.6,maxHealth:135,drivingBonus:0,jacketColor:0x745c95}]);
function createCharacter(palette) {
  const root = new THREE.Group();
  const jacket = new THREE.MeshStandardMaterial({ color: palette.jacketColor, roughness: 0.8 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x22393c, roughness: 0.78 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xd9a77d, roughness: 0.9 });
  const teal = new THREE.MeshStandardMaterial({ color: 0x3e9a9a, roughness: 0.62, metalness: 0.12 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 0.56, 3, 7), jacket);
  torso.position.y = 1.12;
  torso.castShadow = true;
  root.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), skin);
  head.position.set(0, 1.86, 0.03);
  head.castShadow = true;
  root.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.255, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.48), dark);
  hair.position.set(0, 1.94, 0.02);
  root.add(hair);
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.56, 0.22), teal);
  pack.position.set(0, 1.18, 0.34);
  pack.castShadow = true;
  root.add(pack);
  const arms = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.105, 0.42, 2, 6), jacket);
    arm.position.set(side * 0.45, 1.18, 0);
    arm.castShadow = true;
    root.add(arm);
    arms.push(arm);
  }
  const legs = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.44, 2, 6), dark);
    leg.position.set(side * 0.18, 0.48, 0);
    leg.castShadow = true;
    root.add(leg);
    legs.push(leg);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.15, 0.43), teal);
    shoe.position.set(side * 0.18, 0.13, -0.08);
    root.add(shoe);
  }
  return { root, arms, legs };
}

function overlaps(x, z, collider, radius) {
  const nearestX = Math.max(collider.minX, Math.min(x, collider.maxX));
  const nearestZ = Math.max(collider.minZ, Math.min(z, collider.maxZ));
  return Math.hypot(x - nearestX, z - nearestZ) < radius;
}

export function createPlayer(scene, city, characterId = 'mara') {
  let stats = CHARACTERS.find(c => c.id === characterId) ?? CHARACTERS[0];
  let health = stats.maxHealth, armor = 25;
  let character = createCharacter(stats);
  scene.add(character.root);
  const position = new THREE.Vector3(-174, 0, 0);
  character.root.position.copy(position);
  const velocity = new THREE.Vector3();
  const forward = new THREE.Vector3();
  let controlsEnabled = true;
  let grounded = true;
  let swimming = false;
  let jumpCount = 0;
  let vaultCount = 0;
  let runPhase = 0;
  let vaultTimer = 0;

  function blocked(x, z, y) {
    if (Math.abs(x) > 237 || Math.abs(z) > 237) return true;
    return city.colliders.some((collider) => {
      if (collider.low && y > 1.55) return false;
      return overlaps(x, z, collider, 0.62);
    });
  }

  function update(delta, input, cameraYaw) {
    // The renderer owns position during driving; do not consume walking actions then.
    if (!controlsEnabled) { character.root.position.copy(position); return this.getState(); }
    const water = city.water.isWater(position.x, position.z);
    swimming = water;
    const moveForward = Number(input.down('forward')) - Number(input.down('backward'));
    const moveSide = Number(input.down('right')) - Number(input.down('left'));
    const directionLength = Math.hypot(moveForward, moveSide);
    if (directionLength > 0) {
      const forwardX = Math.sin(cameraYaw);
      const forwardZ = -Math.cos(cameraYaw);
      const rightX = Math.cos(cameraYaw);
      const rightZ = Math.sin(cameraYaw);
      forward.set(forwardX * moveForward + rightX * moveSide, 0, forwardZ * moveForward + rightZ * moveSide).normalize();
      const speed = swimming ? 2.35 : input.down('sprint') ? stats.sprintSpeed : stats.walkSpeed;
      const distance = speed * delta;
      const nextX = position.x + forward.x * distance;
      const nextZ = position.z + forward.z * distance;
      if (!blocked(nextX, position.z, position.y)) position.x = nextX;
      if (!blocked(position.x, nextZ, position.y)) position.z = nextZ;
      character.root.rotation.y = Math.atan2(forward.x, -forward.z);
    }

    if (input.consumePress('jump') && !swimming && grounded) {
      velocity.y = 6.6;
      grounded = false;
      jumpCount += 1;
    }
    if (input.consumePress('vault') && !swimming && grounded) {
      velocity.y = 7.6;
      forward.multiplyScalar(0);
      forward.set(Math.sin(character.root.rotation.y), 0, -Math.cos(character.root.rotation.y));
      const vaultX = position.x + forward.x * 0.95;
      const vaultZ = position.z + forward.z * 0.95;
      if (!blocked(vaultX, vaultZ, 1.6)) {
        position.x = vaultX;
        position.z = vaultZ;
      }
      grounded = false;
      vaultTimer = 0.45;
      vaultCount += 1;
    }

    if (swimming) {
      grounded = true;
      velocity.y = 0;
      position.y = THREE.MathUtils.damp(position.y, -0.48, 7, delta);
    } else if (!grounded) {
      velocity.y -= 17 * delta;
      position.y += velocity.y * delta;
      if (position.y <= 0) {
        position.y = 0;
        velocity.y = 0;
        grounded = true;
      }
    }
    vaultTimer = Math.max(0, vaultTimer - delta);
    runPhase += directionLength ? delta * (input.down('sprint') ? 13 : 8) : -delta * 8;
    character.legs.forEach((leg, index) => { leg.rotation.x = directionLength && !swimming ? Math.sin(runPhase + index * Math.PI) * 0.5 : 0; });
    character.arms.forEach((arm, index) => { arm.rotation.x = directionLength && !swimming ? Math.sin(runPhase + index * Math.PI + Math.PI) * 0.42 : 0; });
    character.root.position.copy(position);
    return { position, swimming, grounded, jumpCount, vaultCount, vaulting: vaultTimer > 0, moving: directionLength > 0 };
  }

  return {
    update,
    position,
    getState() { return { x: position.x, y: position.y, z: position.z, position, swimming, grounded, jumpCount, vaultCount, vaulting: vaultTimer > 0, health, armor, down: health <= 0, character: stats.id }; },
    takeDamage(amount) { let rest=Math.max(0,Number(amount)||0); const absorbed=Math.min(armor,rest); armor-=absorbed; health=Math.max(0,health-(rest-absorbed)); return health; },
    heal(amount) { health=Math.min(stats.maxHealth,health+Math.max(0,Number(amount)||0)); return health; },
    isDown() { return health<=0; },
    getCharacter() { return {...stats}; },
    switchCharacter(id) { const next=CHARACTERS.find(c=>c.id===id); if(!next)return false; const parent=character.root.parent; parent?.remove(character.root); character= createCharacter(next); parent?.add(character.root); character.root.position.copy(position); stats=next; health=Math.min(health,stats.maxHealth); return true; },
    getObject() { return character.root; },
    setVisible(value) { character.root.visible = !!value; },
    setControlsEnabled(value) {
      controlsEnabled = !!value; velocity.set(0, 0, 0); swimming = false;
      if (controlsEnabled) { grounded = position.y <= 0; character.root.position.copy(position); }
    },
  };
}
