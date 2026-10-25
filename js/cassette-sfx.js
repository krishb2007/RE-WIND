/*
 * RE-WIND mechanical cassette Foley
 * Generated with Web Audio (no sound files or third-party dependencies).
 * Triggered by user actions; does not alter the music/audio effects chain.
 */
(() => {
  'use strict';

  const toggle=document.getElementById('cassetteSfxToggle');
  const player=document.getElementById('audioPlayer');
  if(!toggle||!player)return;

  const STORAGE_KEY='rewind-cassette-sfx-v1';
  let enabled=true;
  try{enabled=localStorage.getItem(STORAGE_KEY)!=='off'}catch(_){}
  let ctx=null;
  let bus=null;
  let noiseBuffer=null;
  let lastInsert=-10000;
  let lastButtonAt=-10000;

  function updateButton(){
    toggle.textContent=enabled?'SFX ON':'SFX OFF';
    toggle.setAttribute('aria-pressed',String(enabled));
    toggle.setAttribute('aria-label',enabled?'Disable cassette sound effects':'Enable cassette sound effects');
    toggle.title=enabled?'Turn cassette sound effects off':'Turn cassette sound effects on';
  }
  updateButton();

  function setup(){
    if(!enabled||player.muted||player.volume<=0)return false;
    const AudioContext=window.AudioContext||window.webkitAudioContext;
    if(!AudioContext)return false;
    try{
      if(!ctx){
        ctx=new AudioContext();
        bus=ctx.createGain();
        bus.gain.value=0.17*player.volume;
        bus.connect(ctx.destination);
      }
      if(ctx.state==='suspended')ctx.resume().catch(()=>{});
      return true;
    }catch(error){
      console.warn('Cassette SFX unavailable:',error);
      return false;
    }
  }
  function updateMaster(){
    if(bus&&ctx)bus.gain.setTargetAtTime(enabled&&!player.muted?0.17*player.volume:0,ctx.currentTime,.012);
  }
  // A browser gesture unlocks Web Audio on iOS/Android before the event emits.
  document.addEventListener('pointerdown',event=>{
    if(event.target.closest?.('#cassetteSfxToggle'))return;
    setup();
  },{capture:true,passive:true});
  document.addEventListener('keydown',event=>{
    if((event.key==='Enter'||event.key===' ')&&enabled)setup();
  },{capture:true});
  player.addEventListener('volumechange',updateMaster);

  // Hand-made short sounds: filtered white-noise for plastic/metal surface
  // texture plus quick pitched vibrations for latches and tape mechanisms.
  function noise(seconds,volume=0.15,frequency=1400,delay=0){
    if(!ctx||!bus)return;
    const time=ctx.currentTime+delay;
    const duration=Math.max(.012,seconds);
    if(!noiseBuffer){
      noiseBuffer=ctx.createBuffer(1,Math.floor(ctx.sampleRate*.45),ctx.sampleRate);
      const data=noiseBuffer.getChannelData(0);
      for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
    }
    const source=ctx.createBufferSource();
    source.buffer=noiseBuffer;
    const filter=ctx.createBiquadFilter();
    filter.type='bandpass';
    filter.frequency.value=frequency;
    filter.Q.value=.85;
    const envelope=ctx.createGain();
    envelope.gain.setValueAtTime(.0001,time);
    envelope.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),time+.004);
    envelope.gain.exponentialRampToValueAtTime(.0001,time+duration);
    source.connect(filter);filter.connect(envelope);envelope.connect(bus);
    source.start(time);source.stop(time+duration+.008);
  }
  function tone(frequency,seconds,volume=.11,delay=0,kind='triangle',endFrequency=null){
    if(!ctx||!bus)return;
    const time=ctx.currentTime+delay;
    const oscillator=ctx.createOscillator();
    oscillator.type=kind;
    oscillator.frequency.setValueAtTime(frequency,time);
    if(endFrequency)oscillator.frequency.exponentialRampToValueAtTime(Math.max(24,endFrequency),time+seconds);
    const envelope=ctx.createGain();
    envelope.gain.setValueAtTime(.0001,time);
    envelope.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),time+.003);
    envelope.gain.exponentialRampToValueAtTime(.0001,time+seconds);
    oscillator.connect(envelope);envelope.connect(bus);
    oscillator.start(time);oscillator.stop(time+seconds+.006);
  }
  function render(type){
    if(!setup())return;
    switch(type){
      case 'pickup':
        noise(.028,.14,2200);
        tone(820,.028,.045,.012,'triangle',510);
        break;
      case 'queue-add':
        noise(.027,.09,2700);
        noise(.02,.075,1600,.045);
        break;
      case 'insert':
        noise(.095,.125,850);
        tone(140,.11,.30,.055,'triangle',64);
        noise(.032,.19,2700,.095);
        tone(550,.043,.115,.109,'square',300);
        noise(.026,.12,1800,.156);
        break;
      case 'eject':
        tone(420,.036,.13,0,'square',280);
        noise(.06,.18,2300,.012);
        noise(.11,.13,850,.08);
        tone(175,.085,.20,.103,'triangle',90);
        break;
      case 'play':
        noise(.028,.17,3400);
        tone(560,.033,.10,.018,'square',290);
        tone(105,.14,.045,.045,'sine',175); // starting reel motor
        break;
      case 'pause':
      case 'stop':
        noise(.04,.15,1700);
        tone(type==='stop'?125:290,.06,.15,.018,'triangle',65);
        break;
      case 'rewind':
      case 'forward':
        noise(.07,.10,1500);
        for(let n=0;n<4;n++)tone(type==='forward'?680:480,.019,.075,.015+n*.033,'square',type==='forward'?350:225);
        break;
      case 'remove':
        noise(.035,.17,2100);
        tone(360,.045,.085,.017,'triangle',175);
        break;
      default: break;
    }
  }

  toggle.addEventListener('click',()=>{
    enabled=!enabled;
    try{localStorage.setItem(STORAGE_KEY,enabled?'on':'off')}catch(_){}
    updateButton();
    updateMaster();
    if(enabled)render('pickup');
  });
  document.addEventListener('rewind:tape-pickup',()=>render('pickup'));
  document.addEventListener('rewind:tape-queue-add',()=>render('queue-add'));
  document.addEventListener('rewind:tape-remove',()=>render('remove'));
  // loadTrack() emits load first; a drag/drop then emits tape-insert.
  // Debounce to avoid playing the insertion clunk twice.
  document.addEventListener('rewind:load',()=>{
    lastInsert=performance.now();
    render('insert');
  });
  document.addEventListener('rewind:tape-insert',()=>{
    if(performance.now()-lastInsert>200){
      lastInsert=performance.now();
      render('insert');
    }
  });
  document.addEventListener('rewind:eject',()=>render('eject'));
  document.addEventListener('rewind:stop',()=>render('stop'));
  document.addEventListener('rewind:pause',()=>{
    if(performance.now()-lastButtonAt>150)render('pause');
  });
  // Listen at the document level so player buttons work with mouse,
  // keyboard, and touch as well as the app's existing onclick handlers.
  document.addEventListener('click',event=>{
    const button=event.target.closest?.('button');
    if(!button)return;
    if(button.id==='playButton'){
      lastButtonAt=performance.now();
      render('play');
    }else if(button.id==='rewButton')render('rewind');
    else if(button.id==='forwardButton')render('forward');
    // Stop and Eject come from rewind:stop/eject; no double clicks.
  });
  // Stop generating sounds once the page is backgrounded;
  // the independent SFX graph remains silent until another gesture.
  window.addEventListener('pagehide',()=>{
    if(ctx&&ctx.state==='running')ctx.suspend().catch(()=>{});
  });
})();
