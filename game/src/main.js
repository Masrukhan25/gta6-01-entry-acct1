// Rebuild only the local shell on quit so old control listeners cannot linger.
import {createSceneRenderer} from './world/scene-renderer.js';
import {createTitleScreen} from './ui/menus.js';
import {createAudioEngine} from './audio/procedural-web-audio.js';
const initialCanvas=document.querySelector('#scene');
if(!(initialCanvas instanceof HTMLCanvasElement))throw new Error('The Maravela scene canvas is missing.');
const originalShell=document.querySelector('.game-shell').cloneNode(true);
let scene;
function bindTitle(){
  const canvas=document.querySelector('#scene');
  const loading=document.querySelector('#loading');
  if(!(canvas instanceof HTMLCanvasElement))throw new Error('The Maravela scene canvas is missing.');
  createTitleScreen({
    button:document.querySelector('#enter-city'),status:document.querySelector('#status'),
    onEnter:options=>{
      try{sessionStorage.setItem('tidebreak.continue',options?.continue?'1':'0');}catch{}
      if(scene){scene.activate(options);return;}
      if(!loading.hidden)return;
      loading.hidden=false;
      const audio=createAudioEngine();
      audio.init();
      // The first frame paints the overlay; scene construction runs on the next one.
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        try{
          scene=createSceneRenderer(canvas,{continue:!!options?.continue,audio});
          scene.start();
          scene.activate(options);
        }catch(error){
          if(scene){scene.stop();scene=null;}else audio.dispose();
          document.querySelector('#status').textContent='Maravela could not load.';
          document.querySelector('.title-card').hidden=false;
          console.error(error);
        }finally{
          loading.hidden=true;
        }
      }));
    },
  });
}
window.addEventListener('tidebreak-quit',()=>{
  scene?.stop();scene=null;
  document.querySelector('.game-shell').replaceWith(originalShell.cloneNode(true));
  bindTitle();
});
bindTitle();
