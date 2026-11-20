// Menus use existing DOM IDs and share settings through local events.
import {loadGame} from '../save/local-storage.js';
import {DEFAULT_BINDINGS,labelFor} from '../input.js';
let settingsBound;
export function openSettings(){
  const panel=document.getElementById('settings-panel');if(!panel)return;panel.hidden=false;
  if(settingsBound===panel)return;settingsBound=panel;
  let saved={};try{saved=JSON.parse(localStorage.getItem('tidebreak.settings')??'{}');}catch{}
  const emit=()=>{const settings={volume:Number(document.getElementById('master-volume').value),quality:document.getElementById('quality').value,sensitivity:Number(document.getElementById('mouse-sensitivity').value)};try{localStorage.setItem('tidebreak.settings',JSON.stringify(settings));}catch{}window.dispatchEvent(new CustomEvent('tidebreak-settings',{detail:settings}));};
  for(const [id,key] of [['master-volume','volume'],['quality','quality'],['mouse-sensitivity','sensitivity']]){const e=document.getElementById(id);if(saved[key]!=null)e.value=saved[key];e.addEventListener('input',emit);}
  document.getElementById('reset-controls').onclick=()=>window.dispatchEvent(new Event('controls-reset'));
  document.getElementById('settings-close').onclick=()=>{panel.hidden=true;};emit();
}
export function createTitleScreen({button,status,onEnter}){
  const card=document.querySelector('.title-card'),resume=document.getElementById('continue-city');
  const refresh=()=>{if(resume)resume.disabled=!loadGame();};
  const enter=continuing=>{status.textContent='Welcome to Maravela.';card.hidden=true;onEnter({continue:continuing});};
  button.addEventListener('click',()=>enter(false));resume?.addEventListener('click',()=>{if(loadGame())enter(true);});
  document.getElementById('title-settings')?.addEventListener('click',openSettings);
  document.getElementById('title-help')?.addEventListener('click',()=>{document.getElementById('controls-panel').hidden=false;});
  document.getElementById('close-controls')?.addEventListener('click',()=>{document.getElementById('controls-panel').hidden=true;});
  // Show the default guide before the live input manager is created.
  document.querySelectorAll('[data-bind]').forEach(b=>{b.textContent=labelFor(DEFAULT_BINDINGS[b.dataset.bind]);});
  refresh();return {show(){card.hidden=false;refresh();}};
}
export function createPauseMenu({onResume=()=>{},onQuit=()=>{},onSettings=openSettings}={}){
  const panel=document.getElementById('pause-menu');
  const api={open(){panel.hidden=false;document.getElementById('pause-resume')?.focus();},close(){panel.hidden=true;document.getElementById('settings-panel').hidden=true;},isOpen(){return !panel.hidden;}};
  document.getElementById('pause-resume')?.addEventListener('click',()=>{api.close();onResume();});
  document.getElementById('pause-settings')?.addEventListener('click',onSettings);
  document.getElementById('pause-quit')?.addEventListener('click',()=>{api.close();onQuit();});
  return api;
}
