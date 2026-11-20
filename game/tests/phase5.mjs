// Node-only verification: no browser, socket, or external media is involved.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createAudioEngine} from '../src/audio/procedural-web-audio.js';
import {createRadio} from '../src/audio/radio.js';
import {drawMinimap} from '../src/ui/minimap.js';
import {createHUD} from '../src/ui/hud.js';

const audio=createAudioEngine();
audio.setEngine(50,true);audio.setSiren(true);audio.gunshot();audio.click();audio.chime();audio.setAmbience();audio.setMuted(true);
audio.init();assert.equal(audio.context,undefined);audio.dispose();
let starts=0,stops=0,closed=0;
class Param {value=0;setTargetAtTime(v){this.value=v;}setValueAtTime(v){this.value=v;}linearRampToValueAtTime(v){this.value=v;}exponentialRampToValueAtTime(v){this.value=v;}}
class Node {gain=new Param();frequency=new Param();connect(){}disconnect(){}start(){starts++;}stop(){stops++;}}
class FakeAudio {
  currentTime=1;sampleRate=1000;state='running';destination=new Node();
  createGain(){return new Node();}createOscillator(){return new Node();}createBufferSource(){return new Node();}createBiquadFilter(){return new Node();}
  createBuffer(channels,length){return {getChannelData:()=>new Float32Array(length)};}
  resume(){return Promise.resolve();}close(){closed++;return Promise.resolve();}
}
globalThis.AudioContext=FakeAudio;
audio.setMuted(false);audio.init();const context=audio.context;audio.init();assert.equal(audio.context,context);
audio.setEngine(95,true);audio.setSiren(true);audio.setAmbience('Harbor',21);audio.gunshot();audio.click();audio.chime();audio.setVolume(.3);
assert.equal(audio.output.gain.value,.3);audio.setMuted(true);assert.equal(audio.output.gain.value,0);audio.setMuted(false);
const radio=createRadio(audio);
assert.deepEqual(radio.stations.map(s=>s.name),['Salt FM','Palmera Soul','Harbor Static','Neon Tide']);
for(let i=0;i<4;i++){radio.select(i);assert.match(radio.ticker(),/ — now playing: .+/);assert.equal(radio.current(),radio.stations[i]);}
radio.next();assert.equal(radio.current().name,'Salt FM');radio.select(-1);assert.equal(radio.current().name,'Salt FM');
context.currentTime+=.2;const before=starts;radio.start();radio.start();assert.ok(starts>before);radio.stop();radio.stop();audio.dispose();assert.equal(closed,1);assert.ok(stops>=4);
delete globalThis.AudioContext;
globalThis.AudioContext=class {constructor(){throw new Error('Unavailable');}};audio.init();assert.equal(audio.context,undefined);delete globalThis.AudioContext;

// Canvas operations must stay finite even with absent optional state.
let arcs=0;
const ctx=new Proxy({canvas:{width:208,height:208}}, {get(t,k){if(k in t)return t[k];return (...args)=>{if(k==='arc')arcs++;for(const a of args)if(typeof a==='number')assert.ok(Number.isFinite(a));};},set(t,k,v){t[k]=v;return true;}});
drawMinimap(ctx);drawMinimap(ctx,{player:{x:-174,z:0,heading:1},wanted:2,clock:0,objectiveTarget:{x:60,z:120},blips:{police:[{x:0,z:0}],collectibles:Array.from({length:100},()=>({x:1,z:1}))}});assert.ok(arcs<=65);
globalThis.document={getElementById:()=>null};const hud=createHUD();hud.update();hud.update({player:{},vehicle:{driving:true},mission:{objective:{text:'Test',timeLimit:20},elapsed:5},wanted:9});delete globalThis.document;

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8'),css=readFileSync(new URL('../src/ui/shell.css',import.meta.url),'utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
for(const id of ['scene','enter-city','status','game-hud','district-label','player-coordinates','minimap','controls-toggle','day-toggle','rain-toggle','cycle-toggle','time-of-day','time-output','movement-status','controls-panel','close-controls','health-bar','armor-bar','cash-label','wanted-stars','objective-tracker','objective-title','objective-text','objective-progress','radio-ticker','vehicle-panel','speed-label','damage-label','nitro-label','phone-overlay','phone-map','phone-tabs','phone-content','pause-menu','settings-panel','phone-toggle','pause-toggle'])assert.ok(ids.includes(id),id);
assert.equal((css.match(/{/g)||[]).length,(css.match(/}/g)||[]).length);
assert.ok(!/https?:\/\//.test(html+css));assert.match(html,/width="208" height="208"/);assert.match(html,/type="importmap"/);assert.match(html,/type="module"/);
console.log('Phase 5 passed: audio lifecycle, absent/throwing AudioContext, four stations, sequencing, minimap bounds, incomplete HUD state, HTML IDs and CSS structure.');
