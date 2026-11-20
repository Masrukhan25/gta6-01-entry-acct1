// Render the generated world with a fixed-step player simulation and a smooth follow camera.
import * as THREE from 'three';
import { createCity } from './city.js';
import { createInputManager } from '../input.js';
import { createPlayer } from '../player.js';
import { createHUD } from '../ui/hud.js';
import { createTraffic } from '../ai/traffic.js';
import { getType } from '../vehicles/types.js';
import { createVehicleState, updateVehicle } from '../vehicles/handling.js';
import { createVehicleMesh } from '../vehicles/mesh.js';
import { createGarage } from '../vehicles/garage.js';
import { MISSIONS, getMission } from '../missions/story.js';
import { createObjectiveTracker } from '../missions/objectives.js';
import { createSideContent } from '../missions/side-content.js';
import { loadGame, saveGame, loadSave, writeSave } from '../save/local-storage.js';
import { createWantedLevel } from '../police/wanted-level.js';
import { createPursuit } from '../police/pursuit.js';
import { createLoadout, WEAPONS } from '../combat/weapons.js';
import { createPedestrians } from '../ai/pedestrians.js';
import { createAudioEngine } from '../audio/procedural-web-audio.js';
import { createRadio } from '../audio/radio.js';
import { createPhone } from '../ui/phone.js';
import { createPauseMenu, openSettings } from '../ui/menus.js';

const FIXED_STEP = 1 / 60;
const RAIN_COUNT = 820;
const PARTICLE_CAP = { low: 150, med: 350, high: 600 };
const WEAPON_ACTIONS = ['weapon1', 'weapon2', 'weapon3'];
const SMOKE = [0.14, 0.17, 0.19];
const SPARK = [1, 0.44, 0.08];
const FLASH = [1, 0.85, 0.45];

function createParticles(scene) {
  const capacity = PARTICLE_CAP.high;
  const geometry = new THREE.BufferGeometry();
  const positions = new THREE.BufferAttribute(new Float32Array(capacity * 3), 3).setUsage(THREE.DynamicDrawUsage);
  const colors = new THREE.BufferAttribute(new Float32Array(capacity * 3), 3).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', positions);
  geometry.setAttribute('color', colors);
  geometry.setDrawRange(0, 0);
  const material = new THREE.PointsMaterial({
    size: 0.19, vertexColors: true, blending: THREE.AdditiveBlending,
    transparent: true, depthWrite: false, toneMapped: false,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);

  // Keep live slots packed. A dying particle swaps with the last slot.
  const slots = Array.from({ length: capacity }, () => ({}));
  let count = 0;
  let limit = PARTICLE_CAP.med;
  return {
    setQuality(quality) {
      limit = PARTICLE_CAP[quality] ?? PARTICLE_CAP.med;
      count = Math.min(count, limit);
      geometry.setDrawRange(0, count);
    },
    emit(x, y, z, vx, vy, vz, life, color, gravity = 0) {
      if (count >= limit) return;
      const p = slots[count++];
      p.x = x; p.y = y; p.z = z;
      p.vx = vx; p.vy = vy; p.vz = vz;
      p.life = life; p.duration = life; p.color = color; p.gravity = gravity;
    },
    burst(x, y, z, amount) {
      for (let i = 0; i < amount; i += 1) {
        this.emit(x, y, z, (Math.random() - 0.5) * 9, 1 + Math.random() * 4,
          (Math.random() - 0.5) * 9, 0.16 + Math.random() * 0.22, SPARK, 12);
      }
    },
    update(delta) {
      if (!count && !geometry.drawRange.count) return;
      let i = 0;
      while (i < count) {
        const p = slots[i];
        p.life -= delta;
        if (p.life <= 0) {
          slots[i] = slots[--count];
          slots[count] = p;
          continue;
        }
        p.vy -= p.gravity * delta;
        p.x += p.vx * delta; p.y += p.vy * delta; p.z += p.vz * delta;
        const fade = p.life / p.duration;
        positions.setXYZ(i, p.x, p.y, p.z);
        colors.setXYZ(i, p.color[0] * fade, p.color[1] * fade, p.color[2] * fade);
        i += 1;
      }
      geometry.setDrawRange(0, count);
      if (!count) return;
      positions.needsUpdate = colors.needsUpdate = true;
    },
    dispose() {
      scene.remove(points);
      geometry.dispose();
      material.dispose();
    },
  };
}

function mixColor(day, dusk, night, daylight, hour) {
  const duskAmount = Math.max(0, 1 - Math.abs(hour - 18) / 3);
  const dawnAmount = Math.max(0, 1 - Math.abs(hour - 6) / 3);
  const twilight = Math.max(duskAmount, dawnAmount);
  return new THREE.Color().lerpColors(night, day, daylight).lerp(dusk, twilight * 0.62);
}

function createRain(scene) {
  const positions = new Float32Array(RAIN_COUNT * 3);
  for (let index = 0; index < RAIN_COUNT; index += 1) {
    positions[index * 3] = (Math.random() - 0.5) * 42;
    positions[index * 3 + 1] = Math.random() * 26;
    positions[index * 3 + 2] = (Math.random() - 0.5) * 42;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color: 0xa6d4dc, size: 0.13, transparent: true, opacity: 0.62, depthWrite: false });
  const rain = new THREE.Points(geometry, material);
  rain.visible = false;
  scene.add(rain);
  return { rain, positions, geometry };
}

export function createSceneRenderer(canvas, options = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const dayColor = new THREE.Color(0x68aab2);
  const duskColor = new THREE.Color(0xe8a36f);
  const nightColor = new THREE.Color(0x101c34);
  scene.background = duskColor;
  scene.fog = new THREE.Fog(duskColor, 55, 295);

  const camera = new THREE.PerspectiveCamera(58, canvas.clientWidth / Math.max(canvas.clientHeight, 1), 0.1, 600);
  const ambient = new THREE.HemisphereLight(0xf2dfbd, 0x364b50, 1.3);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffd5a0, 2.5);
  sun.position.set(-68, 84, 44);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -170;
  sun.shadow.camera.right = 170;
  sun.shadow.camera.top = 170;
  sun.shadow.camera.bottom = -170;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 280;
  sun.shadow.bias = -0.0003;
  scene.add(sun);
  scene.add(sun.target);

  const city = createCity(scene);
  const input = createInputManager(canvas);
  const savedGame = options.continue ? loadGame() : null;
  const audio = options.audio ?? createAudioEngine();
  const radio = createRadio(audio);
  const uiClick = event => { if(event.target.closest?.('button'))audio.click(); };
  document.querySelector('.game-shell')?.addEventListener('click',uiClick);
  const player = createPlayer(scene, city, savedGame?.character ?? 'mara');
  const story = createObjectiveTracker(MISSIONS);
  const sideContent = createSideContent({loadSave,writeSave});
  const wanted = createWantedLevel();
  const pursuit = createPursuit(scene,city,wanted);
  const weapons = createLoadout();
  const pedestrians = createPedestrians(city);
  let cash = savedGame?.cash ?? 0, respect = savedGame?.respect ?? 0, rank = savedGame?.rank ?? 1;
  const completedMissions = new Set(savedGame?.completedMissions ?? []);
  const persistProgress = () => saveGame({cash,respect,rank,completedMissions:[...completedMissions],activeMission:story.getCurrent()?.status==='active'?story.getCurrent().id:null,collectibles:sideContent.getState().collectibles,garage:garage?.getState?.(),character:player.getCharacter().id,settings:{timeOfDay,raining,cycling}});
  const rainSystem = createRain(scene);
  const particles = createParticles(scene);
  let trauma = 0, shakeScale = 1, shakeClock = 0, exhaustCooldown = 0, pursuitSparkCooldown = 0;
  const addTrauma = amount => { trauma = Math.min(1, trauma + amount); };
  const roadsApi = scene.userData.roadsApi;
  const traffic = createTraffic(scene, city, roadsApi);
  const garage = createGarage();
  const parked = [...roadsApi.parkedSpawns, ...roadsApi.boatDocks, roadsApi.helipad].map(spawn => {
    const type = getType(spawn.type), state = createVehicleState(type), mesh = createVehicleMesh(type);
    Object.assign(state.position, { x: spawn.x, z: spawn.z });
    scene.add(mesh.root); mesh.update(state, 0);
    return { state, mesh, traffic: false, claimed: true };
  });
  let driving = null;
  let missionToast = '';
  let missionToastTime = 0;
  let introTime = 0;
  let missionObjectiveKey = '';
  let lastSideCoinCount = savedGame?.collectibles?.length ?? 0;
  const missionMarkers = MISSIONS.map(m => { const marker=new THREE.Mesh(new THREE.OctahedronGeometry(1.15,0),new THREE.MeshStandardMaterial({color:0xf1c66f,emissive:0x50330d,emissiveIntensity:.7})); marker.position.set(m.start.x,2.2,m.start.z); marker.userData.mission=m.id; scene.add(marker); return marker; });
  const waypoint = new THREE.Mesh(new THREE.ConeGeometry(.7,3,8),new THREE.MeshStandardMaterial({color:0x61d6c8,emissive:0x14594d,emissiveIntensity:.8})); waypoint.visible=false; scene.add(waypoint);
  let vehicleClock = 0;
  let interactionMessage = '';
  // Vehicle information supplements the existing HUD and remains entirely local.
  const vehicleDisplay = document.createElement('div');
  vehicleDisplay.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:10px 18px;background:#102d32dd;color:#fff0d7;border-radius:8px;font:14px system-ui;pointer-events:none;z-index:5;display:none';
  document.body.append(vehicleDisplay);
  const missionDisplay=document.createElement('div');
  missionDisplay.style.cssText='position:fixed;top:18px;left:50%;transform:translateX(-50%);max-width:min(620px,90vw);padding:12px 18px;background:#102d32dd;color:#fff0d7;border:1px solid #79b8ac;border-radius:9px;font:14px system-ui;text-align:center;pointer-events:none;z-index:6;white-space:pre-line;display:none';
  document.body.append(missionDisplay);
  function blockedVehicle(next, state) {
    if (Math.abs(next.x) > 249 || Math.abs(next.z) > 249) return true;
    if (state.type.canFloat) return !city.water.isWater(next.x, next.z);
    if (!state.type.canFly && city.water.isWater(next.x, next.z)) return true;
    const radius = state.type.id === 'bike' ? 0.55 : 1.2;
    for (const c of city.colliders) {
      if (next.y > c.height + 1) continue;
      const x = Math.max(c.minX, Math.min(next.x, c.maxX));
      const z = Math.max(c.minZ, Math.min(next.z, c.maxZ));
      if (Math.hypot(next.x-x, next.z-z) < radius) return true;
    }
    for (const other of [...parked, ...traffic.cars]) {
      if (other.state === state || !other.mesh.root.visible) continue;
      if (Math.abs(other.state.position.y-next.y)<2 && Math.hypot(next.x-other.state.position.x,next.z-other.state.position.z)<2.5) return other;
    }
    return false;
  }
  function interactVehicle() {
    interactionMessage = '';
    if (driving) {
      const s = driving.state;
      if (Math.abs(s.speed)>3 || s.position.y>1.5) { interactionMessage = 'Slow down and land before exiting'; return false; }
      let exit = null;
      for (const angle of [Math.PI/2, -Math.PI/2, Math.PI, 0]) {
        const x=s.position.x+Math.sin(s.heading+angle)*4, z=s.position.z-Math.cos(s.heading+angle)*4;
        if (Math.abs(x)>237||Math.abs(z)>237||city.water.isWater(x,z)) continue;
        if (city.colliders.some(c=>x>c.minX-0.7&&x<c.maxX+0.7&&z>c.minZ-0.7&&z<c.maxZ+0.7)) continue;
        if ([...parked,...traffic.cars].some(v=>v!==driving&&v.mesh.root.visible&&Math.hypot(x-v.state.position.x,z-v.state.position.z)<2.5)) continue;
        exit={x,z}; break;
      }
      if (!exit) { interactionMessage='Move closer to clear, dry ground to exit'; return false; }
      s.speed=0; s.velocity.x=0; s.velocity.z=0; s.horn=false;
      player.position.set(exit.x,0,exit.z); driving=null;
      player.setVisible(true); player.setControlsEnabled(true);
    } else {
      let nearest=null, distance=6;
      for (const v of [...parked,...traffic.cars]) {
        const d=Math.hypot(player.position.x-v.state.position.x, player.position.z-v.state.position.z);
        if (v.mesh.root.visible && !v.state.wrecked && v.state.position.y<2 && d<distance) { nearest=v; distance=d; }
      }
      if (!nearest) return false;
      if (nearest.traffic && !nearest.claimed) {
        traffic.fleeDriver(nearest);
        wanted.reportCrime('carjacking', nearest.state.position);
      }
      driving=nearest; nearest.state.collisionTest=blockedVehicle;
      player.setVisible(false); player.setControlsEnabled(false);
    }
    input.consumePress('vault'); input.consumePress('jump');
    return true;
  }
  let hud;
  let timeOfDay = 17;
  let raining = false;
  let cycling = true;
  let active = false;
  let paused = false;
  let sensitivity = 1;
  const phone = createPhone({onCharacterChange:id=>player.switchCharacter(id),onRadioChange:i=>{audio.click();radio.select(i);},getGameState:()=>window.tidebreak?.getState()});
  const resume = () => { paused=false; pauseMenu.close(); radio.start(); canvas.focus(); };
  const pauseMenu = createPauseMenu({onResume:resume,onSettings:openSettings,onQuit:()=>{persistProgress();active=false;phone.close();radio.stop();window.dispatchEvent(new Event('tidebreak-quit'));}});
  const togglePause = () => { if(!active)return;if(paused){resume();return;}paused=true;phone.close();pauseMenu.open();audio.setEngine(0,false);audio.setSiren(false);radio.stop(); };
  document.querySelector('#pause-toggle')?.addEventListener('click',togglePause);
  document.querySelector('#phone-toggle')?.addEventListener('click',()=>{if(active&&!paused)phone.toggle();});
  const applySettings = ({detail:s}) => {
    audio.setVolume(s.volume);
    sensitivity=s.sensitivity??1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,s.quality==='low'?1:s.quality==='high'?2:1.5));
    renderer.shadowMap.enabled=s.quality!=='low';
    particles.setQuality(s.quality);
    shakeScale=s.quality==='low'?0.5:1;
  };
  window.addEventListener('tidebreak-settings',applySettings);
  try { const s=JSON.parse(localStorage.getItem('tidebreak.settings')??'null');if(s)applySettings({detail:s}); } catch {}
  let cameraYaw = 0;
  let cameraPitch = 0.24;
  let cameraDistance = 9.5;
  let accumulator = 0;
  let previousFrame = 0;
  let hudClock = 0;
  let animationFrame = 0;
  let disposed = false;
  const lookTarget = new THREE.Vector3();
  const cameraTarget = new THREE.Vector3();
  const followPosition = new THREE.Vector3();

  const updateTime = (value, manual = false) => {
    timeOfDay = (value + 24) % 24;
    if (manual) cycling = false;
    hud?.setTime(timeOfDay);
  };
  const updateRain = (value) => {
    raining = value;
    rainSystem.rain.visible = raining;
    hud?.setRain(raining);
  };
  const updateCycle = (value) => {
    cycling = value;
    hud?.setCycle(cycling);
  };
  hud = createHUD({ onTimeChanged: updateTime, onRainChanged: updateRain, onCycleChanged: updateCycle });
  hud.setTime(timeOfDay);
  hud.setRain(raining);
  hud.setCycle(cycling);

  function applyTime() {
    const daylight = Math.max(0, Math.sin(((timeOfDay - 6) / 12) * Math.PI));
    const background = mixColor(dayColor, duskColor, nightColor, daylight, timeOfDay);
    scene.background.copy(background);
    scene.fog.color.copy(background);
    scene.fog.far = 205 + daylight * 110;
    ambient.intensity = 0.42 + daylight * 1.02;
    sun.intensity = 0.14 + daylight * 2.8;
    sun.color.set(daylight > 0.5 ? 0xffe0b5 : 0xffa963);
    const angle = ((timeOfDay - 6) / 24) * Math.PI * 2;
    sun.position.set(Math.cos(angle) * 130, Math.max(2, daylight * 112), Math.sin(angle) * 130);
    sun.target.position.set(player.position.x, 0, player.position.z);
    renderer.toneMappingExposure = 0.9 + daylight * 0.5;
  }

  function moveRain(delta) {
    if (!raining) return;
    const center = player.position;
    for (let index = 0; index < RAIN_COUNT; index += 1) {
      const offset = index * 3;
      rainSystem.positions[offset + 1] -= 21 * delta;
      rainSystem.positions[offset + 2] -= 3.2 * delta;
      if (rainSystem.positions[offset + 1] < 0) {
        rainSystem.positions[offset] = (Math.random() - 0.5) * 42;
        rainSystem.positions[offset + 1] = 22 + Math.random() * 4;
        rainSystem.positions[offset + 2] = (Math.random() - 0.5) * 42;
      }
    }
    rainSystem.rain.position.set(center.x, center.y, center.z);
    rainSystem.geometry.attributes.position.needsUpdate = true;
  }

  function updateCamera(delta) {
    const playerState = player.getState();
    const horizontal = Math.cos(cameraPitch) * cameraDistance;
    cameraTarget.set(player.position.x + Math.sin(cameraYaw) * 3.1, player.position.y + 1.1, player.position.z - Math.cos(cameraYaw) * 3.1);
    lookTarget.set(
      player.position.x - Math.sin(cameraYaw) * horizontal,
      player.position.y + 2.4 + Math.sin(cameraPitch) * cameraDistance,
      player.position.z + Math.cos(cameraYaw) * horizontal,
    );
    followPosition.lerp(lookTarget, 0.14);
    camera.position.copy(followPosition);
    shakeClock += delta;
    const shake = trauma ** 2 * shakeScale;
    camera.position.x += Math.sin(shakeClock * 43) * 0.035 * shake;
    camera.position.y += Math.sin(shakeClock * 57) * 0.025 * shake;
    camera.lookAt(cameraTarget);
    camera.rotateZ(Math.sin(shakeClock * 49) * 0.012 * shake);
    trauma = Math.max(0, trauma - delta * 2.4);
    return playerState;
  }

  const saveMissionReward = (mission) => { if(completedMissions.has(mission.id))return; completedMissions.add(mission.id);cash+=mission.reward.cash;respect+=mission.reward.respect;rank=1+Math.floor(respect/100);missionToast=mission.title+' complete · +$'+mission.reward.cash+' · +'+mission.reward.respect+' respect';missionToastTime=5;missionObjectiveKey='';pedestrians.clearHostiles();persistProgress(); };
  story.onEvent('complete',current=>{audio.chime();saveMissionReward(current.mission);});
  story.onEvent('fail',current=>{missionToast=current.title+' failed · '+current.reason+' · Press E at its marker to retry';missionToastTime=6;pedestrians.clearHostiles();});
  const syncHostiles=()=>{const c=story.getCurrent(),o=c?.objective,key=o?.type==='defeat'?c.id+':'+c.index:'';if(key!==missionObjectiveKey){missionObjectiveKey=key;if(key)pedestrians.spawnHostiles(o.count??1,o.target);else pedestrians.clearHostiles();}};
  const startMission=id=>{const m=getMission(id);if(!m)return false;if(completedMissions.has(id)){missionToast=m.title+' complete';missionToastTime=2;return false;}if(!story.start(id))return false;player.switchCharacter(m.character);missionToast=m.title+' · '+m.briefing;missionToastTime=6;missionObjectiveKey='';syncHostiles();persistProgress();return true;};
  if(savedGame?.activeMission&&getMission(savedGame.activeMission)&&!completedMissions.has(savedGame.activeMission)){story.start(savedGame.activeMission);syncHostiles();}
  function fireWeapon() {
    const cameraDirection = camera.getWorldDirection(new THREE.Vector3());
    const origin = camera.position.clone();
    const hostiles = pedestrians.people.filter(p => p.hostile && p.health > 0);
    let direction = cameraDirection, best = null, bestScore = -1;
    for (const target of hostiles) {
      const toward = new THREE.Vector3(target.position.x - origin.x, target.position.y + 1 - origin.y, target.position.z - origin.z);
      const distance = toward.length();
      if (distance > 100 || distance < 0.01) continue;
      const dot = toward.normalize().dot(cameraDirection);
      if (dot > 0.86 && dot > bestScore) { best = target; bestScore = dot; }
    }
    if (best) direction = new THREE.Vector3(best.position.x - origin.x, best.position.y + 1 - origin.y, best.position.z - origin.z).normalize();
    const fired = weapons.fire(origin, direction, hostiles.map(t => ({
      id: t.id, health: t.health, position: { x: t.position.x, y: t.position.y + 1, z: t.position.z },
      radius: 3, takeDamage: amount => t.takeDamage(amount),
    })));
    if (!fired) return;
    audio.gunshot();
    wanted.reportCrime('shooting', player.position);
    addTrauma(0.34);
    const { x, y, z } = player.position;
    particles.emit(x + Math.sin(cameraYaw) * 1.2 + Math.cos(cameraYaw) * 0.65,
      y + 1.5, z - Math.cos(cameraYaw) * 1.2 + Math.sin(cameraYaw) * 0.65, 0, 0, 0, 0.065, FLASH);
    if (fired.hit) {
      const hit = fired.hit.target.position;
      particles.burst(hit.x, hit.y, hit.z, 15);
    }
  }
  const pointerFire=event=>{if(event.button===0&&active&&!paused&&!phone.isOpen())fireWeapon();};canvas.addEventListener('pointerdown',pointerFire);
  if(savedGame?.settings){if(Number.isFinite(savedGame.settings.timeOfDay))timeOfDay=savedGame.settings.timeOfDay;if(typeof savedGame.settings.raining==='boolean')raining=savedGame.settings.raining;if(typeof savedGame.settings.cycling==='boolean')cycling=savedGame.settings.cycling;}
  updateTime(timeOfDay);updateRain(raining);updateCycle(cycling);

  function simulate(delta) {
    // Drain these every step so a key pressed during pause cannot select on resume.
    const canSelect = active && !paused;
    if(input.consumePress('pause'))togglePause();
    for (let i = 0; i < WEAPON_ACTIONS.length; i += 1) {
      if (input.consumePress(WEAPON_ACTIONS[i]) && canSelect && !paused) {
        weapons.select(WEAPONS[i].id);
        audio.click();
      }
    }
    if(active&&!paused&&input.consumePress('phone'))phone.toggle();
    if(active&&!paused&&input.consumePress('radioNext')){audio.click();radio.next();}
    if (active && !paused) {
      const look = input.consumeLook();
      cameraYaw -= look.x * 0.0045 * sensitivity;
      cameraPitch = THREE.MathUtils.clamp(cameraPitch - look.y * 0.0035 * sensitivity, -0.1, 0.8);
      if (input.consumePress('help')) hud.togglePanel();
      if (input.consumePress('rain')) updateRain(!raining);
      if (input.consumePress('time')) updateTime(timeOfDay >= 18 || timeOfDay < 6 ? 9 : 21, true);
      if (cycling) updateTime(timeOfDay + delta * 0.015);
      const interacting = input.consumePress('interact');
      if (interacting) { const nearbyMarker=missionMarkers.find(m=>m.visible&&Math.hypot(m.position.x-player.position.x,m.position.z-player.position.z)<7); if(nearbyMarker) { input.consumePress('vault'); if(story.getCurrent()?.status==='failed'&&story.getCurrent().id===nearbyMarker.userData.mission){story.retry();missionToast='Mission restarted';missionToastTime=3;syncHostiles();} else startMission(nearbyMarker.userData.mission); } else interactVehicle(); }
      if (driving) {
        const s = driving.state;
        const previousCondition = s.damage;
        updateVehicle(s, {
          throttle: Number(input.down('forward'))-Number(input.down('backward')),
          steer: Number(input.down('right'))-Number(input.down('left')),
          nitro: input.down('sprint'), horn: input.down('horn'),
          handbrake: input.down('handbrake'), lift: input.down('handbrake'),
        }, delta);
        if (s.damage < previousCondition) {
          particles.burst(s.position.x + Math.sin(s.heading) * 1.4,
            s.position.y + 0.6, s.position.z - Math.cos(s.heading) * 1.4, 18);
          addTrauma(Math.min(0.8, 0.3 + (previousCondition - s.damage) * 0.035));
        }
        exhaustCooldown -= delta;
        if (exhaustCooldown <= 0 && (s.damage < 85 || s.speedKmh > 75)) {
          const x = s.position.x - Math.sin(s.heading) * 1.9;
          const z = s.position.z + Math.cos(s.heading) * 1.9;
          for (let i = 0; i < 3; i += 1) {
            particles.emit(x, s.position.y + 0.42, z, (Math.random() - 0.5) * 0.8,
              0.65 + Math.random() * 0.6, (Math.random() - 0.5) * 0.8, 0.7, SMOKE);
          }
          exhaustCooldown = s.damage < 35 ? 0.065 : 0.12;
        }
        player.position.set(s.position.x, s.position.y, s.position.z);
        if (!look.x) cameraYaw += Math.atan2(Math.sin(s.heading-cameraYaw), Math.cos(s.heading-cameraYaw))*0.035;
        input.consumePress('jump'); input.consumePress('vault');
      } else player.update(delta, input, cameraYaw);
      vehicleClock += delta;
      traffic.update(delta, player.position, driving);
      wanted.update(delta,player.position,false);
      const conditionBeforePursuit = driving?.state.damage;
      pursuit.update(delta,{...player.getState(),position:{x:player.position.x,y:player.position.y,z:player.position.z}},driving);
      pursuitSparkCooldown = Math.max(0, pursuitSparkCooldown - delta);
      if (driving && driving.state.damage < conditionBeforePursuit && pursuitSparkCooldown === 0) {
        const { x, y, z } = driving.state.position;
        particles.burst(x, y + 0.65, z, 8);
        addTrauma(0.25);
        pursuitSparkCooldown = 0.18;
      }
      const rivalState=pedestrians.update(delta,{x:player.position.x,y:player.position.y,z:player.position.z},driving?[driving.state.position]:[]);
      if (rivalState.damage > 0 && !player.isDown()) {
        player.takeDamage(rivalState.damage);
        addTrauma(rivalState.damage * 0.085);
      }
      weapons.update(delta);
      const missionBefore=story.getCurrent();
      const objectiveState=story.update({player:{...player.getState(),position:{x:player.position.x,y:player.position.y,z:player.position.z},down:player.isDown()},vehicle:driving?{...driving.state,position:driving.state.position,state:driving.state}:null,defeatedCount:pedestrians.defeatedCount},delta);
      if(missionBefore?.index!==objectiveState?.index||missionBefore?.status!==objectiveState?.status)syncHostiles();
      const sideState=sideContent.update({player:player.getState(),vehicle:driving?.state},delta);
      if(sideState.collectibles.length!==lastSideCoinCount){audio.chime();lastSideCoinCount=sideState.collectibles.length;persistProgress();}
      for(const marker of missionMarkers){marker.visible=!completedMissions.has(marker.userData.mission)&&story.getCurrent()?.id!==marker.userData.mission;marker.rotation.y+=delta*.8;marker.position.y=2.2+Math.sin(vehicleClock*2+marker.userData.mission.length)*.2;}
      const currentObjective=story.getCurrent();
      if(currentObjective?.status==='active'&&currentObjective.objective?.target){waypoint.visible=true;waypoint.position.set(currentObjective.objective.target.x,4+Math.sin(vehicleClock*2)*.35,currentObjective.objective.target.z);}else waypoint.visible=false;
      if(introTime>0)introTime=Math.max(0,introTime-delta);
      if(missionToastTime>0)missionToastTime=Math.max(0,missionToastTime-delta);
      if(driving&&Math.abs(driving.state.speed)>28&&pursuit.getState().cruisers>0&&Math.random()<delta*.08)wanted.reportCrime('speeding',player.position);
      for (const v of [...parked, ...traffic.cars]) if (!v.traffic || v.claimed) v.mesh.update(v.state, delta, vehicleClock);
      audio.setEngine(driving?.state.speedKmh??0,!!driving);
      audio.setSiren(wanted.getStars()>=1);
      audio.setAmbience(city.districtAt(player.position.x,player.position.z),timeOfDay);
    }
    if(paused)return;
    particles.update(delta);
    const state = updateCamera(delta);
    applyTime();
    moveRain(delta);
    hudClock += delta;
    if (hudClock > 0.1) {
      hud.update({...window.tidebreak.getState(),player:{...state,heading:driving?.state.heading??player.getObject().rotation.y},toast:missionToastTime>0?missionToast:null,weapons:weapons.list(),weaponBindings:input.bindings});
      vehicleDisplay.style.display = 'none';
      const nearby = [...parked,...traffic.cars].some(v=>v.mesh.root.visible&&Math.hypot(v.state.position.x-player.position.x,v.state.position.z-player.position.z)<6);
      vehicleDisplay.textContent = driving
        ? `${driving.state.type.name} · ${Math.round(driving.state.speedKmh)} km/h · Condition ${Math.round(driving.state.damage)} · Nitro ${Math.round(driving.state.nitro)}% · E exit · Shift boost · Q horn${driving.state.type.canFly ? ' · Space+W lift' : ' · Space handbrake'}${interactionMessage ? ' · '+interactionMessage : ''}`
        : nearby ? 'E · Enter vehicle' : 'Explore Maravela · E enter vehicle · H controls';
      const activeMission=story.getCurrent();
      missionDisplay.style.display='none';
      missionDisplay.textContent=missionToastTime>0?missionToast:(activeMission?.status==='active'?activeMission.title+' · '+(activeMission.objective?.text??'Complete')+'\n'+(activeMission.objective?.type==='defeat'?activeMission.progress+'/'+(activeMission.objective.count??1)+' rivals':'Reach the highlighted marker')+' · '+(activeMission.objective?.timeLimit?Math.max(0,Math.ceil(activeMission.objective.timeLimit-activeMission.elapsed))+'s':''):'');
      if (driving) document.querySelector('#movement-status').textContent = driving.state.wrecked ? 'Vehicle wrecked · E exit' : `Driving · ${driving.state.type.name}`;
      vehicleDisplay.textContent += ' · '+('★'.repeat(wanted.getStars()))+('☆'.repeat(5-wanted.getStars()));
      hudClock = 0;
    }
  }

  function render(timestamp) {
    if (disposed) return;
    const elapsed = previousFrame ? Math.min((timestamp - previousFrame) / 1000, 0.12) : 0;
    previousFrame = timestamp;
    accumulator += elapsed;
    while (accumulator >= FIXED_STEP) {
      simulate(FIXED_STEP);
      accumulator -= FIXED_STEP;
    }
    renderer.render(scene, camera);
    animationFrame = window.requestAnimationFrame(render);
  }

  const resize = () => {
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };
  window.addEventListener('resize', resize);
  animationFrame = window.requestAnimationFrame(render);

  // Pursuit roots are added after this snapshot; other map markers are explicit.
  const mapBaseline = new Set(scene.children);
  window.tidebreak = {
    getState() {
      const playerState = player.getState();
      return {
        player: playerState,
        vehicle: driving ? { type: driving.state.type.id, speedKmh: driving.state.speedKmh, damage: driving.state.damage, nitro: driving.state.nitro, driving: true } : null,
        district: city.districtAt(playerState.x, playerState.z).name,
        threeVersion: THREE.REVISION,
        timeOfDay,
        raining,
        cycling,
        active,
        chunks: city.chunkCount,
        districts: city.districtNames,
        renderer: { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles },
        mission: story.getCurrent()?.status==='active'?{id:story.getCurrent().id,title:story.getCurrent().title,objective:story.getCurrent().objective,progress:story.getCurrent().progress,elapsed:story.getCurrent().elapsed}:null,
        paused,completedMissions:[...completedMissions],radioTicker:radio.ticker(),radioStations:radio.stations,
        selectedWeapon:weapons.list().find(weapon=>weapon.selected)?.id,
        objectiveTarget:story.getCurrent()?.status==='active'?story.getCurrent().objective?.target:null,
        blips:{missions:missionMarkers.filter(m=>m.visible).map(m=>({x:m.position.x,z:m.position.z})),garages:[{x:0,z:-60}],collectibles:sideContent.getState().coins,police:scene.children.filter(o=>o.isGroup&&o!==player.getObject()&&!mapBaseline.has(o)).map(o=>({x:o.position.x,z:o.position.z}))},
        cash,respect,rank,wanted:wanted.getStars(),health:playerState.health,armor:playerState.armor,character:player.getCharacter(),
      };
    },
    threeVersion: THREE.REVISION,
    garage,
    setTrafficLights: state => traffic.setTrafficLights(state),
    missions:{start:startMission,list:()=>MISSIONS.map(m=>({id:m.id,title:m.title,character:m.character})),state:()=>story.getCurrent()},
    sideContent,
    weapons,
    radio,phone,
  };

  return {
    start() {},
    activate() { active = true; paused=false; audio.init();radio.start();introTime=3; hud.show(); canvas.focus(); },
    stop() {
      disposed = true;
      radio.stop();audio.dispose();phone.close();input.dispose();pursuit.dispose();
      window.removeEventListener('tidebreak-settings',applySettings);
      document.querySelector('.game-shell')?.removeEventListener('click',uiClick);
      canvas.removeEventListener('pointerdown',pointerFire);
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resize);
      vehicleDisplay.remove();
      missionDisplay.remove();
      particles.dispose();
      renderer.dispose();
    },
  };
}
