// The phone depends on callbacks only, avoiding renderer import cycles.
import {MISSIONS} from '../missions/story.js';
import {drawMinimap} from './minimap.js';
export function createPhone({onCharacterChange=()=>{},onRadioChange=()=>{},getGameState=()=>({})}={}) {
  const overlay=document.getElementById('phone-overlay'),tabs=document.getElementById('phone-tabs'),content=document.getElementById('phone-content'),canvas=document.getElementById('phone-map');
  let tab='MAP',timer=null;
  const button=(label,fn)=>{const b=document.createElement('button');b.textContent=label;b.type='button';b.onclick=fn;content.append(b);};
  function render(){
    const s=getGameState()??{};content.replaceChildren();canvas.hidden=tab!=='MAP';
    [...tabs.children].forEach(b=>b.setAttribute('aria-selected',String(b.textContent===tab)));
    if(tab==='MAP')drawMinimap(canvas.getContext('2d'),s);
    if(tab==='MISSIONS')MISSIONS.forEach((m,i)=>{
      const done=s.completedMissions?.includes(m.id),active=s.mission?.id===m.id,unlocked=i===0||s.completedMissions?.includes(MISSIONS[i-1].id);
      const row=document.createElement('p');row.textContent=m.title+' · '+(done?'done':active?'active':unlocked?'available':'locked');content.append(row);
    });
    if(tab==='STATS')for(const [k,v] of Object.entries({Cash:'$'+(s.cash??0),Respect:s.respect??0,Rank:s.rank??1,Health:s.health??s.player?.health??100,Character:typeof s.character==='object'?s.character?.name??s.character?.id:s.character??'mara'})){const p=document.createElement('p');p.textContent=k+': '+v;content.append(p);}
    if(tab==='RADIO')(s.radioStations??[]).forEach((r,i)=>button(r.name+' · '+r.genre,()=>{onRadioChange(i);render();}));
    if(tab==='CHARACTER')['mara','dario','lena'].forEach(id=>button(id.toUpperCase(),()=>{onCharacterChange(id);render();}));
  }
  for(const name of ['MAP','MISSIONS','STATS','RADIO','CHARACTER']){const b=document.createElement('button');b.textContent=name;b.type='button';b.onclick=()=>{tab=name;render();};tabs.append(b);}
  const api={open(){overlay.hidden=false;render();if(timer===null)timer=setInterval(render,1000);document.getElementById('phone-close')?.focus();},close(){overlay.hidden=true;if(timer!==null)clearInterval(timer);timer=null;},toggle(){this.isOpen()?this.close():this.open();},isOpen(){return !overlay.hidden;}};
  document.getElementById('phone-close')?.addEventListener('click',()=>api.close());return api;
}
