// Missing state fields are safe during loading and when walking.
import {getDistrictAt} from '../world/districts.js';
import {createMinimap} from './minimap.js';
import {labelFor} from '../input.js';
export function createHUD({onTimeChanged=()=>{},onRainChanged=()=>{},onCycleChanged=()=>{}}={}) {
  const el=id=>document.getElementById(id),text=(id,v)=>{if(el(id))el(id).textContent=v;};
  const map=createMinimap(el('minimap'));let time=17,rain=false,cycle=true,lastHealth=100;
  const weaponRows=Array.from(el('weapon-wheel')?.children??[], row=>({
    row, key:row.children[0], name:row.children[1], ammo:row.children[2],
  }));
  const panel=open=>{if(el('controls-panel'))el('controls-panel').hidden=!open;el('controls-toggle')?.setAttribute('aria-expanded',String(open));};
  const togglePanel=()=>panel(el('controls-panel')?.hidden??true);
  el('controls-toggle')?.addEventListener('click',togglePanel);el('close-controls')?.addEventListener('click',()=>panel(false));
  el('time-of-day')?.addEventListener('input',e=>onTimeChanged(Number(e.target.value),true));
  el('day-toggle')?.addEventListener('click',()=>onTimeChanged(time>=18||time<6?9:21,false));
  el('rain-toggle')?.addEventListener('click',()=>onRainChanged(!rain));el('cycle-toggle')?.addEventListener('click',()=>onCycleChanged(!cycle));
  const bar=(id,value)=>{const n=Math.max(0,Math.min(100,Number(value)||0)),e=el(id);if(e){e.setAttribute('aria-valuenow',String(n));if(e.firstElementChild)e.firstElementChild.style.width=n+'%';}};
  return {
    show(){if(el('game-hud'))el('game-hud').hidden=false;},togglePanel,
    setTime(v){time=v;if(el('time-of-day'))el('time-of-day').value=v;text('time-output',String(Math.floor(v)%24).padStart(2,'0')+':'+String(Math.floor(v%1*60)).padStart(2,'0'));text('day-toggle',v>=18||v<6?'Day · N':'Night · N');el('day-toggle')?.setAttribute('aria-pressed',String(v>=18||v<6));},
    setRain(v){rain=v;text('rain-toggle','Rain: '+(v?'on':'off')+' · R');el('rain-toggle')?.setAttribute('aria-pressed',String(v));},
    setCycle(v){cycle=v;text('cycle-toggle','Cycle: '+(v?'on':'off'));el('cycle-toggle')?.setAttribute('aria-pressed',String(v));},
    flashDamage(){const e=el('damage-flash');if(e){e.classList.remove('hit');void e.offsetWidth;e.classList.add('hit');}},
    update(state={}){
      const p=state.player??{},health=state.health??p.health??100;
      if(health<lastHealth)this.flashDamage();lastHealth=health;
      bar('health-bar',health);bar('armor-bar',state.armor??p.armor??0);
      text('district-label',typeof state.district==='string'?state.district:getDistrictAt(p.x??0,p.z??0).name);
      text('player-coordinates',Math.round(p.x??0)+', '+Math.round(p.z??0));
      text('cash-label','$'+Math.floor(state.cash??0).toLocaleString('en-US'));
      text('respect-label','Respect '+(state.respect??0)+' · Rank '+(state.rank??1));
      const stars=Math.max(0,Math.min(5,Math.floor(state.wanted??0)));text('wanted-stars','★'.repeat(stars)+'☆'.repeat(5-stars));
      el('wanted-stars')?.setAttribute('aria-label','Wanted level '+stars+' of 5');
      const m=state.mission,o=m?.objective; if(el('objective-tracker'))el('objective-tracker').hidden=!m&&!state.toast;
      text('objective-title',m?.title??(state.toast?'Maravela dispatch':''));
      text('objective-text',(typeof o==='string'?o:o?.text)??state.toast??'');
      text('objective-progress',m?String(m.progress??0)+(o?.count?' / '+o.count:'')+(o?.timeLimit?' · '+Math.max(0,Math.ceil(o.timeLimit-(m.elapsed??0)))+'s':''):'');
      text('radio-ticker',state.radioTicker??'Radio · C to tune');
      state.weapons?.forEach((weapon,index)=>{
        const slot=weaponRows[index];
        if(!slot)return;
        const key=state.weaponBindings?.['weapon'+(index+1)];
        if(key)slot.key.textContent=labelFor(key);
        slot.name.textContent=weapon.name;
        slot.ammo.textContent=weapon.ammo;
        slot.row.setAttribute('aria-current',String(weapon.selected));
      });
      const v=state.vehicle;if(el('vehicle-panel'))el('vehicle-panel').hidden=!v?.driving;
      text('speed-label',Math.round(Math.abs(v?.speedKmh??0))+' km/h');text('damage-label','Condition '+Math.round(v?.damage??100)+'%');text('nitro-label','Nitro '+Math.round(v?.nitro??0)+'%');
      text('movement-status',v?.driving?'Driving · E exit · Shift nitro · Q horn':p.down?'Recovering':p.swimming?'Swimming':p.vaulting?'Vaulting':p.grounded===false?'Airborne':'On foot · E interact');
      map.update(state);
    },
  };
}
