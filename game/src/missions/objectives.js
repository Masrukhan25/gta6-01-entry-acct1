// Pure ordered objective tracking. A new start/retry clears timers, inventory and kill baselines.
export function createObjectiveTracker(missions) {
 let current=null, inventory=new Set(), baseline=null; const listeners=new Map();
 const emit=(type,data)=>{ for(const fn of listeners.get(type)||[]) fn(data); };
 const api={
 start(id){const mission=missions.find(m=>m.id===id); if(!mission)return false; inventory=new Set();baseline=null;current={id,title:mission.title,mission,index:0,objective:mission.objectives[0],progress:0,elapsed:0,status:'active',reason:null};emit('start',api.getCurrent());return true;},
 retry(){return current ? api.start(current.id):false;},
 onEvent(type,fn){if(typeof fn!=='function')return ()=>{};if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);return ()=>listeners.get(type).delete(fn);},
 update(state,delta){if(!current||current.status!=='active')return api.getCurrent();const o=current.objective,p=state.vehicle?.position??state.player?.position??state.player??state.position;const v=state.vehicle?.state??state.vehicle;const kills=state.defeatedCount??0;if(baseline===null)baseline=kills;current.elapsed+=Math.max(0,delta||0);
 const reason=state.player?.down||state.player?.isDown||state.player?.health<=0?'player down':(o.requiresVehicle||o.type==='drive')&&v?.wrecked?'vehicle wrecked':o.timeLimit&&current.elapsed>o.timeLimit?'timer expired':null;
 if(reason){current.status='failed';current.reason=reason;emit('fail',api.getCurrent());return api.getCurrent();}
 const near=p&&o.target&&Math.hypot(p.x-o.target.x,p.z-o.target.z)<=(o.radius??6), riding=!!v;let done=false;
 if(o.type==='defeat'){current.progress=Math.max(0,kills-baseline);done=current.progress>=(o.count??1);}
 else if(near&&(!(o.requiresVehicle||o.type==='drive')||riding)){done=o.type!=='deliver'||!o.item||inventory.has(o.item);if(done&&o.type==='pickup'&&o.item)inventory.add(o.item);if(done&&o.type==='deliver')inventory.delete(o.item);current.progress=done?1:0;}
 if(done){emit('objective',api.getCurrent());current.index++;current.elapsed=0;current.progress=0;baseline=kills;if(current.index>=current.mission.objectives.length){current.status='complete';current.objective=null;emit('complete',api.getCurrent());}else current.objective=current.mission.objectives[current.index];}return api.getCurrent();},
 getCurrent(){return current?{...current,inventory:[...inventory]}:null;}
 };return api;
}
