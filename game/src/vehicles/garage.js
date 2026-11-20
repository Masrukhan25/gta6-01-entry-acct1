// Local-only ownership and atomic cash transactions; storage failure keeps play usable.
import { TYPES, getType } from './types.js';
import { loadSave, writeSave } from '../save/local-storage.js';
export function createGarage(saveApi = { loadSave, writeSave }) {
  const key = 'tidebreak.garage.v1';
  const saved = saveApi.loadSave(key);
  const state = saved && Array.isArray(saved.vehicles) && Number.isFinite(saved.cash) ? saved : { cash: 45000, vehicles: [], nextId: 1 };
  state.nextId = Math.max(state.nextId || 1, ...state.vehicles.map(v => Number(v.id) + 1));
  const persist = () => saveApi.writeSave(key, state);
  const find = id => state.vehicles.find(v => v.id === id);
  const spend = amount => Number.isFinite(amount) && amount >= 0 && state.cash >= amount;
  return {
    getState: () => JSON.parse(JSON.stringify(state)),
    colors: id => [...getType(id).palette],
    buy(typeId) {
      const type = TYPES.find(t => t.id === typeId);
      if (!type || !spend(type.price)) return null;
      const vehicle = { id: state.nextId++, type: type.id, color: type.palette[0], upgrades: { engine: 0, armor: 0, nitro: 0 } };
      state.cash -= type.price; state.vehicles.push(vehicle); persist(); return { ...vehicle, upgrades: { ...vehicle.upgrades } };
    },
    sell(id) {
      const v = find(id); if (!v) return false;
      state.cash += Math.floor(getType(v.type).price * 0.6 + Object.values(v.upgrades).reduce((a,b) => a+b, 0) * 500);
      state.vehicles.splice(state.vehicles.indexOf(v), 1); persist(); return true;
    },
    repaint(id, color) {
      const v = find(id); if (!v || !getType(v.type).palette.includes(color) || !spend(250)) return false;
      state.cash -= 250; v.color = color; persist(); return true;
    },
    upgradePrice(id, kind) { const v = find(id); return v && ['engine', 'armor', 'nitro'].includes(kind) && v.upgrades[kind] < 3 ? (v.upgrades[kind] + 1) * 1500 : null; },
    upgrade(id, kind) {
      const price = this.upgradePrice(id, kind); if (price === null || !spend(price)) return false;
      state.cash -= price; find(id).upgrades[kind]++; persist(); return true;
    },
  };
}
