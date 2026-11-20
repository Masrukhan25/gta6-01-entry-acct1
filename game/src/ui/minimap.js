// Shared world-space map for the HUD and phone. North is negative Z.
import { getDistrictAt } from '../world/districts.js';
export function drawMinimap(ctx, view = {}) {
  if(!ctx)return;
  const w=ctx.canvas.width,h=ctx.canvas.height,player=view.player??{},px=x=>(x+270)/540*w,py=z=>(z+270)/540*h;
  ctx.clearRect(0,0,w,h);ctx.fillStyle='#164b60';ctx.fillRect(0,0,w,h);
  for(let row=0;row<4;row++)for(let col=0;col<4;col++){
    ctx.fillStyle=getDistrictAt(-180+col*120,-180+row*120).color;
    ctx.globalAlpha=.7;ctx.fillRect(px(-240+col*120),py(-240+row*120),120/540*w,120/540*h);
  }
  ctx.globalAlpha=1;
  // Match the western coast and sheltered harbor basin used by the world.
  ctx.fillStyle='#164b60';ctx.fillRect(0,0,px(-212),h);ctx.fillRect(px(116),py(-92),92/540*w,96/540*h);
  ctx.strokeStyle='#e2d6b477';ctx.lineWidth=Math.max(1,w/130);
  const line=(a,b)=>{ctx.beginPath();ctx.moveTo(px(a.x),py(a.z));ctx.lineTo(px(b.x),py(b.z));ctx.stroke();};
  if(view.roads?.length)view.roads.forEach(r=>{if(r.from&&r.to)line(r.from,r.to);});
  else for(let n=-240;n<=240;n+=60){line({x:n,z:-240},{x:n,z:240});line({x:-240,z:n},{x:240,z:n});}
  const target=view.objectiveTarget??view.mission?.objective?.target;
  if(target){ctx.strokeStyle='#ffe17c';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(px(player.x??0),py(player.z??0));ctx.lineTo(px(target.x),py(player.z??0));ctx.lineTo(px(target.x),py(target.z));ctx.stroke();}
  const dot=(p,color,r=3)=>{if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.z))return;ctx.fillStyle=color;ctx.beginPath();ctx.arc(px(p.x),py(p.z),r,0,Math.PI*2);ctx.fill();};
  (view.blips?.missions??[]).forEach(p=>dot(p,'#ffe17c'));
  (view.blips?.garages??[{x:0,z:-60}]).forEach(p=>dot(p,'#56baff',4));
  (view.blips?.collectibles??[]).slice(0,60).forEach(p=>dot(p,'#def4d4',1.5));
  if((view.wanted??0)>0&&Math.floor((view.clock??Date.now()/1000)*4)%2===0)(view.blips?.police??[]).forEach(p=>dot(p,'#ff536a',4));
  dot(target,'#ffe17c',4);
  ctx.save();ctx.translate(px(player.x??0),py(player.z??0));ctx.rotate(player.heading??player.rotation??0);
  ctx.beginPath();ctx.moveTo(0,-7);ctx.lineTo(5,6);ctx.lineTo(0,3);ctx.lineTo(-5,6);ctx.closePath();ctx.fillStyle='#fff';ctx.strokeStyle='#122d35';ctx.lineWidth=2;ctx.fill();ctx.stroke();ctx.restore();
  ctx.fillStyle='#fff';ctx.font='bold 10px system-ui';ctx.fillText('N',6,13);
}
export function createMinimap(canvas){const ctx=canvas?.getContext('2d');return {update(view){drawMinimap(ctx,view);}};}
