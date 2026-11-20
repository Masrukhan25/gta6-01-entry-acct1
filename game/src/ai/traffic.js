// Bounded local traffic and pedestrian pools: no per-frame mesh allocation.
import * as THREE from 'three';
import { getType } from '../vehicles/types.js';
import { createVehicleState, updateVehicle } from '../vehicles/handling.js';
import { createVehicleMesh } from '../vehicles/mesh.js';
import { lightPhase } from '../world/roads.js';
export function createTraffic(scene, city, roadsApi) {
  const cars = [], pedestrians = [];
  let time = 0, lights = null, serial = 0;
  const personGeometry = new THREE.CapsuleGeometry(0.24, 0.8, 2, 5);
  const personMaterial = new THREE.MeshStandardMaterial({ color: 0xc5a46e });
  const waterAt = (x,z) => city.water.isWater(x,z);
  function spawn(car, center) {
    // Try nearby lanes, excluding the harbor basin and open sea.
    for (let attempt = 0; attempt < 100; attempt++) {
      const road = roadsApi.roads[(serial++ * 7) % roadsApi.roads.length];
      const path = roadsApi.getLanePath(road, serial % 2 ? 'left' : 'right');
      const along = Math.max(10, Math.min(470, (road.axis === 'x' ? center.x : center.z) + 240 + (Math.random() - 0.5) * 180));
      const f = along / path.length;
      const x = path.start.x + (path.end.x - path.start.x) * f;
      const z = path.start.z + (path.end.z - path.start.z) * f;
      if (waterAt(x,z) || Math.hypot(x-center.x,z-center.z) < 25 || Math.hypot(x-center.x,z-center.z) > 190 || cars.some(other => other !== car && Math.hypot(x-other.state.position.x,z-other.state.position.z) < 10)) continue;
      car.path = path; car.progress = along; car.claimed = false; car.state.speed = 0;
      car.state.velocity.x = 0; car.state.velocity.z = 0;
      car.state.position = { x, y: 0, z };
      car.state.heading = road.axis === 'x' ? path.lane.direction * Math.PI / 2 : path.lane.direction > 0 ? Math.PI : 0;
      car.mesh.root.visible = true; return true;
    }
    car.mesh.root.visible = false; return false;
  }
  for (let i=0; i<14; i++) {
    const type = getType(['sedan','suv','muscle','truck','sports'][i%5]);
    const car = { state: createVehicleState(type), mesh: createVehicleMesh(type, type.palette[i%type.palette.length]), traffic: true, claimed: false };
    scene.add(car.mesh.root); cars.push(car); spawn(car, {x:-174,z:0});
  }
  for (let i=0; i<20; i++) {
    const mesh = new THREE.Mesh(personGeometry, personMaterial); scene.add(mesh);
    pedestrians.push({ mesh, x: -190 + (i%5)*35, z: -10 + Math.floor(i/5)*60, flee: 0, dx: 1, dz: 0 });
  }
  function fleeDriver(car) {
    // Reuse an ambient pedestrian slot for the departing driver.
    const p = pedestrians[serial++ % pedestrians.length];
    p.x = car.state.position.x + 2.5; p.z = car.state.position.z; p.flee = 5;
    p.dx = Math.cos(car.state.heading); p.dz = Math.sin(car.state.heading);
    car.claimed = true;
  }
  return { cars, pedestrians, fleeDriver,
    setTrafficLights(state) { lights = state; },
    update(dt, playerPos, playerVehicle) {
      time += dt; roadsApi.updateLights?.(time, lights);
      for (const car of cars) {
        if (car.claimed) continue;
        const s = car.state;
        if (!car.mesh.root.visible || Math.hypot(s.position.x-playerPos.x,s.position.z-playerPos.z)>210 || car.progress > 470) {
          if (!spawn(car, playerPos)) continue;
        }
        const axis = car.path.road.axis, direction = car.path.lane.direction;
        const current = axis === 'x' ? s.position.x : s.position.z;
        let stop = false;
        const phase = typeof lights === 'string' ? lights : lights?.[axis] ?? lightPhase(time, axis);
        for (const light of roadsApi.trafficLights) {
          if (Math.abs((axis === 'x' ? light.z : light.x)-car.path.road.coordinate)>1) continue;
          const ahead = ((axis === 'x' ? light.x : light.z)-current)*direction;
          if (phase !== 'green' && ahead > 8 && ahead < 12 + s.speed*s.speed/20) stop = true;
        }
        for (const other of [...cars, ...(playerVehicle ? [playerVehicle] : [])]) {
          if (other === car || (!other.claimed && other.mesh && !other.mesh.root.visible)) continue;
          const p = other.state?.position ?? other.position; if (!p) continue;
          const ahead = ((axis === 'x' ? p.x : p.z)-current)*direction;
          const across = Math.abs(axis === 'x' ? p.z-s.position.z : p.x-s.position.x);
          if (across<3.3 && ahead>0 && ahead<7+Math.abs(s.speed)*0.9) stop = true;
        }
        // Do not drive traffic into the harbor water surface.
        if (waterAt(s.position.x + Math.sin(s.heading)*12, s.position.z-Math.cos(s.heading)*12)) stop = true;
        updateVehicle(s, { throttle: stop ? (s.speed>0.3 ? -1 : 0) : s.speed<12 ? 1 : 0 }, dt);
        if (stop && Math.abs(s.speed)<0.5) { s.speed=0; s.velocity.x=0; s.velocity.z=0; }
        car.progress += Math.abs(s.speed)*dt; car.mesh.update(s,dt,time);
      }
      for (const p of pedestrians) {
        if (Math.hypot(p.x-playerPos.x,p.z-playerPos.z)>170) {
          p.x=Math.max(-230,Math.min(230,playerPos.x+(Math.random()-0.5)*120));
          p.z=Math.round(playerPos.z/60)*60+10; p.flee=0;
        }
        for (const car of playerVehicle ? [...cars, playerVehicle] : cars) {
          const s=car.state ?? car, distance=Math.hypot(p.x-s.position.x,p.z-s.position.z);
          if (distance<9 && (Math.abs(s.speed)>4 || distance<3)) {
            p.flee=2; p.dx=(p.x-s.position.x)/(distance||1); p.dz=(p.z-s.position.z)/(distance||1);
          }
        }
        p.flee=Math.max(0,p.flee-dt);
        const nx=p.x+p.dx*dt*(p.flee?5:0.6), nz=p.z+p.dz*dt*(p.flee?5:0.6);
        const blocked=waterAt(nx,nz)||Math.abs(nx)>236||Math.abs(nz)>236||city.colliders.some(c=>nx>c.minX-0.4&&nx<c.maxX+0.4&&nz>c.minZ-0.4&&nz<c.maxZ+0.4);
        if (!blocked) { p.x=nx; p.z=nz; } else { p.dx=-p.dx; p.dz=-p.dz; }
        p.mesh.position.set(p.x,0.85,p.z);
      }
    },
  };
}
