// Procedural voices share one master bus; init is called only by a user gesture.
export function createAudioEngine() {
  let context, master, motor, engine, siren, ambience, buffer, muted = false, volume = .55;
  const sources = [];
  const gain = value => { const g = context.createGain(); g.gain.value = value; g.connect(master); return g; };
  const smooth = (p,v) => p.setTargetAtTime(v,context.currentTime,.08);
  function tone(frequency,duration,level=.05,type='sine',when) {
    if (!context) return;
    const t=when??context.currentTime,g=gain(0),o=context.createOscillator();
    o.type=type;o.frequency.value=frequency;o.connect(g);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(level,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    o.start(t);o.stop(t+duration+.02);o.onended=()=>{o.disconnect();g.disconnect();};
  }
  function noise(duration=.1,level=.1,when) {
    if(!context)return;const t=when??context.currentTime,s=context.createBufferSource(),g=gain(level);
    s.buffer=buffer;s.connect(g);g.gain.setValueAtTime(level,t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    s.start(t);s.stop(t+duration);s.onended=()=>{s.disconnect();g.disconnect();};
  }
  const api = {
    get context(){return context;},get output(){return master;},tone,noise,
    init(){
      try{
        if(context){context.resume()?.catch?.(()=>{});return;}
        const Audio=globalThis.AudioContext??globalThis.webkitAudioContext;if(!Audio)return;
        context=new Audio();master=context.createGain();master.connect(context.destination);master.gain.value=muted?0:volume;
        const osc=(f,type,dest)=>{const o=context.createOscillator();o.frequency.value=f;o.type=type;o.connect(dest);o.start();sources.push(o);return o;};
        engine=gain(0);motor=osc(42,'triangle',engine);siren=gain(0);
        const alarm=osc(720,'sine',siren),mod=context.createGain();mod.gain.value=190;mod.connect(alarm.frequency);osc(1.6,'square',mod);
        buffer=context.createBuffer(1,context.sampleRate*2,context.sampleRate);
        const data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
        const s=context.createBufferSource(),f=context.createBiquadFilter();s.buffer=buffer;s.loop=true;
        f.type='lowpass';f.frequency.value=480;ambience=gain(.025);s.connect(f);f.connect(ambience);s.start();sources.push(s);
        context.resume()?.catch?.(()=>{});
      }catch{api.dispose();}
    },
    setEngine(speed=0,driving=false){if(!motor)return;smooth(motor.frequency,42+Math.min(240,Math.abs(speed))*1.5);smooth(engine.gain,driving?.045+Math.min(.08,Math.abs(speed)/1800):0);},
    setSiren(on){if(siren)smooth(siren.gain,on?.045:0);},
    gunshot(){noise(.13,.19);tone(65,.18,.22);},click(){tone(850,.045,.045);},
    chime(){if(context)[523,659,784].forEach((f,i)=>tone(f,.35,.075,'sine',context.currentTime+i*.09));},
    setAmbience(district='',hour=12){if(ambience)smooth(ambience.gain,(/harbor|boardwalk/i.test(typeof district==='string'?district:district.id)?.055:.025)*(hour>=20||hour<6?.6:1));},
    setMuted(b){muted=Boolean(b);if(master)smooth(master.gain,muted?0:volume);},
    setVolume(v){volume=Math.max(0,Math.min(1,Number(v)||0));if(master)smooth(master.gain,muted?0:volume);},
    dispose(){sources.splice(0).forEach(s=>{try{s.stop();s.disconnect();}catch{}});try{context?.close()?.catch?.(()=>{});}catch{}context=master=motor=engine=siren=ambience=undefined;},
  };return api;
}
