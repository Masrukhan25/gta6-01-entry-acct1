// Storage is optional: privacy restrictions and malformed JSON never interrupt play.
const storage = () => globalThis.localStorage ?? globalThis.window?.localStorage;
export function loadSave(key) { try {const value=storage()?.getItem(key);return value==null?null:JSON.parse(value);}catch{return null;} }
export function writeSave(key,value) {try{const s=storage();if(!s)return false;s.setItem(key,JSON.stringify(value));return true;}catch{return false;} }
const KEY='tidebreak.save.v1';
export function saveGame(state){try{return writeSave(KEY,{version:1,cash:state.cash??0,respect:state.respect??0,rank:state.rank??1,completedMissions:state.completedMissions??[],activeMission:state.activeMission??null,collectibles:state.collectibles??[],garage:state.garage??null,character:state.character??'mara',settings:state.settings??{}});}catch{return false;}}
export function loadGame(){try{const s=loadSave(KEY);if(!s||s.version!==1||!Number.isFinite(s.cash)||!Number.isFinite(s.respect)||!Number.isFinite(s.rank)||!Array.isArray(s.completedMissions)||!s.completedMissions.every(x=>typeof x==='string')||!Array.isArray(s.collectibles)||typeof s.character!=='string'||!s.settings||typeof s.settings!=='object')return null;return s;}catch{return null;}}
