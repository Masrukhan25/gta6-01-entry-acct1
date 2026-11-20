// Four original compositions, scheduled ahead on the engine's audio clock.
export function createRadio(audio) {
  const stations=[
    {name:'Salt FM',genre:'Bright coastal synth',track:'Apricot Breakwater',notes:[60,64,67,72,67,64,62,69],bpm:118,wave:'triangle'},
    {name:'Palmera Soul',genre:'Warm sunset chords',track:'Windows of Honey',notes:[53,53,57,57,60,60,55,55],bpm:82,wave:'sine'},
    {name:'Harbor Static',genre:'Mellow lo-fi instrumentals',track:'Paper Boats at Four',notes:[57,60,64,60,55,59,62,59],bpm:74,wave:'triangle'},
    {name:'Neon Tide',genre:'Driving nocturnal bass',track:'Violet Current Relay',notes:[33,33,45,33,36,33,40,31],bpm:132,wave:'sawtooth'},
  ];
  let selected=0,timer=null,step=0,nextTime=0;
  const current=()=>stations[selected],hz=n=>440*2**((n-69)/12);
  function schedule(){
    const ctx=audio.context;if(!ctx||ctx.state==='suspended')return;
    if(nextTime<ctx.currentTime)nextTime=ctx.currentTime+.02;
    while(nextTime<ctx.currentTime+.12){
      const s=current(),d=60/s.bpm/2,n=s.notes[step%s.notes.length];
      audio.tone(hz(n),d*.85,.035,s.wave,nextTime);
      if(selected===1&&step%4===0)[4,7,12].forEach(o=>audio.tone(hz(n+o),d*3.5,.018,'sine',nextTime));
      if(step%4===0)audio.tone(52,.12,.07,'sine',nextTime);
      if(step%4===2)audio.noise(.065,.035,nextTime);
      if(step%2===1)audio.noise(.02,.012,nextTime);
      step++;nextTime+=d;
    }
  }
  return {stations,current,next(){return this.select((selected+1)%4);},
    select(i){if(!Number.isInteger(i)||i<0||i>=4)return current();selected=i;step=0;nextTime=(audio.context?.currentTime??0)+.13;return current();},
    ticker(){return current().name+' — now playing: '+current().track;},
    start(){if(timer!==null)return;schedule();timer=setInterval(schedule,25);},
    stop(){if(timer!==null)clearInterval(timer);timer=null;step=0;nextTime=0;},
  };
}
