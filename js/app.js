(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const pad = n => String(n).padStart(2,'0');
  // Cover assets are fallbacks only; no sample music is added to the library.
  const defaultCovers=Array.from({length:8},(_,i)=>'assets/images/case-'+pad(i+1)+'.webp');
  let nextDefaultCover=0;
  function defaultCover(){return defaultCovers[nextDefaultCover%defaultCovers.length]}
  function takeDefaultCover(){const cover=defaultCover();nextDefaultCover++;return cover}
  function previewDefaultCover(){const image=document.createElement('img');image.alt='Default cover for this import';image.src=defaultCover();$('coverPreview').replaceChildren(image)}
  let library=[],queue=[],activeId=null,windowIndex=1,playing=false,volume=.7,toastTimeout;
  let playRequest=0,wantsPlayback=false;
  let activeSongIndex=0; // A cassette can contain several audio tracks.
  const resumePositions=new Map();
  const audio=$('audioPlayer');audio.volume=volume;
  const effects=window.REWINDEffects.createRetroAudio(audio);
  function item(id){return library.find(t=>t.id===id)}
  function songs(tape){return tape?.tracks?.length?tape.tracks:(tape?[{name:tape.title,source:tape.source}]:[])}
  function currentSong(){return songs(item(activeId))[activeSongIndex]||null}
  function currentPositionKey(){return activeId?activeId+':'+activeSongIndex:null}
  function emit(event,detail={}){document.dispatchEvent(new CustomEvent('rewind:'+event,{detail}))}
  function toast(message){const el=$('toast');el.textContent=message;el.classList.add('visible');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>el.classList.remove('visible'),2800)}
  function navigate(n){windowIndex=Math.max(0,Math.min(2,n));$('track').style.transform=`translateX(-${windowIndex*100/3}%)`;document.querySelectorAll('.navtab').forEach((b,i)=>{b.classList.toggle('active',i===windowIndex);if(i===windowIndex)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});$('navPrev').disabled=windowIndex===0;$('navNext').disabled=windowIndex===2;emit('navigate',{screen:['settings','player','library'][windowIndex]})}
  $('navPrev').onclick=()=>navigate(windowIndex-1);$('navNext').onclick=()=>navigate(windowIndex+1);
  document.querySelectorAll('.navtab').forEach((b,i)=>b.onclick=()=>navigate(i));
  $('gearBtn').onclick=()=>navigate(0);$('aboutBtn').onclick=()=>toast('RE-WIND — Music Lives On · Local cassette player with tape effects');
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('modalScrim').hidden)closeModal();hideMenu();return}if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||!$('modalScrim').hidden)return;if(e.key==='ArrowLeft'){e.preventDefault();navigate(windowIndex-1)}if(e.key==='ArrowRight'){e.preventDefault();navigate(windowIndex+1)}});
  // Remove exactly one queue occurrence; keep the cassette in the Library.
  // If it is playing, playback can finish without being interrupted.
  function removeFromQueue(index){
    if(index<0||index>=queue.length)return;
    const removed=item(queue[index]);
    queue.splice(index,1);
    renderQueue();
    emit('queue-change',{ids:[...queue]});
    toast((removed?.title||'Cassette')+' removed from queue');
  }

  // Drag cassette covers or queued tapes into the stereo. The source remains
  // available in the Library, while the inserted cassette is loaded in the deck.
  let draggedTapeId=null,dragOrigin=1,dragDropped=false,dragNavigateTimer=null;
  let touchTapeDrag=null,lastTouchDragAt=0;
  const cassetteDevice=$('cassetteDevice');
  function dropVisual(ready,over=false){
    cassetteDevice.classList.toggle('drop-ready',ready);
    cassetteDevice.classList.toggle('drag-over',ready&&over);
  }
  function insertIntoDeck(id){
    const tape=item(id);
    if(!tape)return;
    if(!queue.includes(id)){
      queue.push(id);
      emit('queue-change',{ids:[...queue]});
    }
    loadTrack(id);
    navigate(1);
    toast(tape.title+' inserted — press PLAY to listen');
    emit('tape-insert',{id,tape});
  }
  function clearDesktopDrag(restoreView=false){
    clearTimeout(dragNavigateTimer);
    dragNavigateTimer=null;
    const previous=dragOrigin;
    draggedTapeId=null;
    dropVisual(false);
    if(restoreView&&previous===2)navigate(2);
  }
  function pointOverDeck(x,y){
    const box=cassetteDevice.getBoundingClientRect();
    return x>=box.left&&x<=box.right&&y>=box.top&&y<=box.bottom;
  }
  function attachTapeDrag(element,id){
    element.draggable=true;
    element.title=(element.title?element.title+' · ':'')+'Drag into the boombox to insert';
    element.addEventListener('dragstart',event=>{
      if(!item(id)){event.preventDefault();return}
      draggedTapeId=id;
      dragOrigin=windowIndex;
      dragDropped=false;
      if(event.dataTransfer){
        event.dataTransfer.effectAllowed='copy';
        event.dataTransfer.setData('text/plain',id);
        event.dataTransfer.setData('application/x-rewind-cassette',id);
      }
      hideMenu();
      dropVisual(true);
      clearTimeout(dragNavigateTimer);
      if(windowIndex!==1){
        // The Library is a separate slide: reveal the stereo during dragging.
        dragNavigateTimer=setTimeout(()=>{if(draggedTapeId===id)navigate(1)},190);
      }
    });
    element.addEventListener('dragend',()=>{
      if(draggedTapeId!==null)clearDesktopDrag(!dragDropped);
    });
    // Native browser drag-and-drop doesn't work reliably on touchscreens.
    // A small sideways drag instead switches to the player with a floating tape.
    element.addEventListener('pointerdown',event=>{
      if(event.pointerType==='mouse'||event.button!==0||touchTapeDrag)return;
      touchTapeDrag={id,pointerId:event.pointerId,x:event.clientX,y:event.clientY,
        origin:windowIndex,started:false,ghost:null};
      try{element.setPointerCapture(event.pointerId)}catch{}
    });
    element.addEventListener('pointermove',event=>{
      const drag=touchTapeDrag;
      if(!drag||drag.pointerId!==event.pointerId)return;
      if(!drag.started&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>14){
        drag.started=true;
        const tape=item(drag.id);
        const ghost=document.createElement('div');
        ghost.className='tape-drag-ghost';
        const image=document.createElement('img');
        image.src=tape.cover;image.alt='';
        const name=document.createElement('span');
        name.textContent=tape.title;
        ghost.append(image,name);
        document.body.append(ghost);
        drag.ghost=ghost;
        hideMenu();
        dropVisual(true);
        navigate(1);
      }
      if(!drag.started)return;
      event.preventDefault();
      drag.ghost.style.left=event.clientX+'px';
      drag.ghost.style.top=event.clientY+'px';
      dropVisual(true,pointOverDeck(event.clientX,event.clientY));
    });
    function endTouchDrag(event,cancelled){
      const drag=touchTapeDrag;
      if(!drag||drag.pointerId!==event.pointerId)return;
      touchTapeDrag=null;
      if(!drag.started)return;
      lastTouchDragAt=Date.now();
      event.preventDefault();
      drag.ghost?.remove();
      const valid=!cancelled&&pointOverDeck(event.clientX,event.clientY);
      dropVisual(false);
      if(valid)insertIntoDeck(drag.id);
      else{
        if(drag.origin===2)navigate(2);
        if(!cancelled)toast('Drop the cassette onto the boombox to insert');
      }
    }
    element.addEventListener('pointerup',event=>endTouchDrag(event,false));
    element.addEventListener('pointercancel',event=>endTouchDrag(event,true));
  }
  cassetteDevice.addEventListener('dragenter',event=>{
    if(draggedTapeId){event.preventDefault();dropVisual(true,true)}
  });
  cassetteDevice.addEventListener('dragover',event=>{
    if(!draggedTapeId)return;
    event.preventDefault();
    if(event.dataTransfer)event.dataTransfer.dropEffect='copy';
    dropVisual(true,true);
  });
  cassetteDevice.addEventListener('dragleave',event=>{
    if(draggedTapeId&&!cassetteDevice.contains(event.relatedTarget))dropVisual(true,false);
  });
  cassetteDevice.addEventListener('drop',event=>{
    if(!draggedTapeId)return;
    event.preventDefault();
    const id=draggedTapeId;
    dragDropped=true;
    clearDesktopDrag(false);
    insertIntoDeck(id);
  });
  document.addEventListener('dragover',event=>{
    if(draggedTapeId&&event.target.closest?.('#playerWindow'))event.preventDefault();
  });
  function renderQueue(){
    // Preserve original queue indices even when two entries use the same cassette.
    const available=queue.map((id,index)=>({track:item(id),index})).filter(entry=>!!entry.track);
    $('queueCount').textContent=pad(available.length)+' TAPES';
    const stack=$('cassetteStack'),lines=$('queueItems');stack.replaceChildren();lines.replaceChildren();
    if(!available.length){const empty=document.createElement('p');empty.className='queue-empty';empty.textContent='Add songs from your Library';stack.append(empty);return}
    available.slice(0,4).forEach(({track})=>{
      const tape=document.createElement('div');tape.className='cassette-case';tape.title=track.title;
      const art=document.createElement('div');art.className='spine-image';art.style.backgroundImage=`url(${JSON.stringify(track.cover)})`;
      const title=document.createElement('strong');title.textContent=track.title;
      const label=document.createElement('small');label.textContent=songs(track).length>1?songs(track).length+' SONGS':'TAPE';
      tape.append(art,title,label);attachTapeDrag(tape,track.id);stack.append(tape);
    });
    available.forEach(({track,index},i)=>{
      const wrapper=document.createElement('div');wrapper.className='queue-row';
      const row=document.createElement('button');row.type='button';row.className='queue-item'+(track.id===activeId?' active':'');row.title='Load '+track.title;row.setAttribute('aria-current',track.id===activeId?'true':'false');
      const n=document.createElement('span');n.className='number';n.textContent=pad(i+1);
      const t=document.createElement('span');t.className='title';t.textContent=track.title;
      const r=document.createElement('span');r.className='tape-label';r.textContent=songs(track).length>1?songs(track).length+' SONGS':'TAPE';
      row.append(n,t,r);
      attachTapeDrag(row,track.id);
      row.onclick=()=>{if(Date.now()-lastTouchDragAt<500)return;if(track.id===activeId){wantsPlayback?pause():play()}else loadTrack(track.id)};
      const remove=document.createElement('button');remove.type='button';remove.className='queue-remove';remove.textContent='×';
      remove.title='Remove '+track.title+' from queue';
      remove.setAttribute('aria-label','Remove '+track.title+' from queue');
      remove.onclick=()=>removeFromQueue(index);
      wrapper.append(row,remove);lines.append(wrapper);
    });
  }
  function renderLibrary(){
    const query=$('searchInput').value.trim().toLowerCase();let shown=library.filter(x=>(x.title+' '+x.artist+' '+songs(x).map(song=>song.name).join(' ')).toLowerCase().includes(query));
    if($('sortSelect').value==='az')shown.sort((a,b)=>a.title.localeCompare(b.title));
    if($('sortSelect').value==='za')shown.sort((a,b)=>b.title.localeCompare(a.title));
    if($('sortSelect').value==='recent')shown.sort((a,b)=>b.created-a.created);
    const grid=$('libraryGrid');grid.replaceChildren();
    if(!shown.length){
      const empty=document.createElement('div');empty.className='library-empty';
      const heading=document.createElement('h2');heading.textContent=library.length?'No matching music':'Your library is empty';
      const hint=document.createElement('p');hint.textContent=library.length?'Try another song or artist name.':'Import a song or album to create your first tape.';
      empty.append(heading,hint);
      if(!library.length){const button=document.createElement('button');button.type='button';button.className='btn btn-dark';button.textContent='Import your first tape';button.onclick=openModal;empty.append(button)}
      grid.append(empty);
    }
    shown.forEach(track=>{
      const card=document.createElement('article');card.className='album-card';
      const select=document.createElement('button');select.className='album-art-btn';select.type='button';select.title='Add '+track.title+' to queue';select.setAttribute('aria-label','Add '+track.title+' to queue');
      const cover=document.createElement('img');cover.className='album-cover';cover.src=track.cover;cover.alt=track.title+' album artwork';
      if(track.customCover){
        const frame=document.createElement('span');frame.className='album-cover-case';
        frame.append(cover);select.append(frame);
      }else{select.append(cover)}
      cover.draggable=false;
      attachTapeDrag(select,track.id);
      select.onclick=()=>{if(Date.now()-lastTouchDragAt<500)return;queue.push(track.id);renderQueue();toast(track.title+' added to queue');emit('queue-change',{ids:[...queue]})};
      const info=document.createElement('div');info.className='album-meta';
      const texts=document.createElement('div');texts.className='album-text';const title=document.createElement('strong');title.textContent=track.title;const caption=document.createElement('small');caption.textContent=songs(track).length>1?songs(track).length+' TRACKS':'TAPE';texts.append(title,caption);
      const more=document.createElement('button');more.className='album-more';more.textContent='⋮';more.setAttribute('aria-label','More actions for '+track.title);more.onclick=e=>{e.stopPropagation();showMenu(e.currentTarget,track)};
      info.append(texts,more);card.append(select,info);grid.append(card);
    });
    $('libraryCount').textContent=pad(library.length)+' '+(library.length===1?'ALBUM':'ALBUMS');
  }
  function showMenu(button,track){const menu=$('contextMenu');menu.replaceChildren();
    function action(label,run){const b=document.createElement('button');b.textContent=label;b.onclick=()=>{hideMenu();run()};menu.append(b)}
    action('Add to queue',()=>{queue.push(track.id);renderQueue();emit('queue-change',{ids:[...queue]});toast(track.title+' added to queue')});
    action('Load in Player',()=>{if(!queue.includes(track.id)){queue.push(track.id);emit('queue-change',{ids:[...queue]})}loadTrack(track.id);navigate(1)});
    action('Remove from queue',()=>removeFromQueue(queue.indexOf(track.id)));
    if(!track.demo)action('Remove imported track',()=>{if(activeId===track.id){resetCurrent();activeId=null;audio.removeAttribute('src');audio.load()}library=library.filter(t=>t.id!==track.id);const oldQueueLength=queue.length;queue=queue.filter(id=>id!==track.id);if(queue.length!==oldQueueLength)emit('queue-change',{ids:[...queue]});releaseTrack(track);renderQueue();renderLibrary();refreshDeck();toast('Track removed')});
    const rect=button.getBoundingClientRect();menu.hidden=false;menu.style.top=Math.min(rect.bottom+7,innerHeight-180)+'px';menu.style.left=Math.max(8,Math.min(rect.left-154,innerWidth-201))+'px';
  }
  function hideMenu(){$('contextMenu').hidden=true}
  function releaseTrack(track){
    const urls=new Set([track.source,...songs(track).map(song=>song.source)].filter(url=>url?.startsWith('blob:')));
    urls.forEach(url=>URL.revokeObjectURL(url));
    if(track.cover?.startsWith('blob:')&&!library.some(item=>item.cover===track.cover))URL.revokeObjectURL(track.cover);
  }
  document.addEventListener('click',e=>{if(!$('contextMenu').contains(e.target)&&!e.target.closest('.album-more'))hideMenu()});
  $('searchInput').addEventListener('input',renderLibrary);$('sortSelect').addEventListener('change',renderLibrary);
  $('gridView').onclick=()=>{$('libraryGrid').classList.remove('list-mode');$('gridView').classList.add('active');$('listView').classList.remove('active')};
  $('listView').onclick=()=>{$('libraryGrid').classList.add('list-mode');$('listView').classList.add('active');$('gridView').classList.remove('active')};
  function refreshDeck(){
    const tape=item(activeId),song=currentSong(),count=songs(tape).length;
    $('tapeLabel').textContent=tape?tape.title:'Mix Tape';
    $('ejectedVisual').hidden=!!tape;
    $('playerWindow').classList.toggle('is-playing',playing);
    $('playbackStatus').replaceChildren();
    const strong=document.createElement('strong');strong.textContent=tape?tape.title:'Empty deck';
    let details=playing?' · playing':' · '+(song?.source?'ready':'import music, then load a tape from your Library');
    if(count>1)details=' · '+pad(activeSongIndex+1)+'/'+pad(count)+' '+song.name+details;
    $('playbackStatus').append(strong,document.createTextNode(details));renderQueue();
  }
  function loadTrack(id){
    const tape=item(id);if(!tape)return;
    if(id===activeId){refreshDeck();toast(tape.title+' is already loaded');return}
    resetCurrent();activeId=id;activeSongIndex=0;
    const song=currentSong();
    if(song?.source){audio.src=song.source;audio.load()}
    else{audio.removeAttribute('src');audio.load()}
    refreshDeck();emit('load',{track:tape});toast(tape.title+' loaded into player');
  }
  function rememberPosition(trackId=currentPositionKey()){const position=Number(audio.currentTime);if(trackId&&Number.isFinite(position)&&position>=0&&!audio.ended)resumePositions.set(trackId,position);return position}
  function restorePosition(trackId=currentPositionKey()){const position=resumePositions.get(trackId)||0;if(position<=0||Math.abs(audio.currentTime-position)<=.08)return position;const duration=Number(audio.duration);if(Number.isFinite(duration)&&position>=duration)return position;try{audio.currentTime=position}catch{}return position}
  function metadataReady(){if(audio.readyState>=1)return Promise.resolve();return new Promise((resolve,reject)=>{const done=()=>{cleanup();resolve()};const fail=()=>{cleanup();reject(new Error('metadata'))};const cleanup=()=>{audio.removeEventListener('loadedmetadata',done);audio.removeEventListener('error',fail)};audio.addEventListener('loadedmetadata',done,{once:true});audio.addEventListener('error',fail,{once:true})})}
  async function play(){
    const track=item(activeId),song=currentSong();
    if(!track){toast('Load a cassette from the queue first');return}
    if(!song?.source){toast('This tape has no playable audio. Import a song to continue.');emit('play',{track,hasAudio:false});return}
    wantsPlayback=true;const request=++playRequest;
    const trackId=activeId,index=activeSongIndex;
    try{
      try{await effects.unlock()}catch(effectError){console.warn('RE-WIND audio effects unavailable:',effectError)}
      await metadataReady();
      if(request!==playRequest||activeId!==trackId||activeSongIndex!==index||!wantsPlayback)return;
      const resumeAt=restorePosition();
      await audio.play();
      if(request!==playRequest||activeId!==trackId||activeSongIndex!==index||!wantsPlayback)return;
      if(resumeAt>0&&audio.currentTime+0.08<resumeAt)audio.currentTime=resumeAt;
      playing=true;refreshDeck();emit('play',{track,song,index,hasAudio:true,currentTime:audio.currentTime});
    }catch(error){
      if(request===playRequest){wantsPlayback=false;playing=false;effects.setPlaying(false);refreshDeck();toast(error.name==='NotAllowedError'?'Your browser blocked playback. Click Play again.':'Could not play this audio file. Try another format.')}
    }
  }
  function updateMuteButton(){const button=$('muteButton');button.textContent=audio.muted?'UNMUTE':'MUTE';button.setAttribute('aria-label',audio.muted?'Unmute audio':'Mute audio');button.setAttribute('aria-pressed',String(audio.muted))}
  function pause(){wantsPlayback=false;playRequest++;const position=rememberPosition();audio.pause();playing=false;effects.setPlaying(false);refreshDeck();emit('pause',{track:item(activeId),currentTime:position})}
  function stop(){wantsPlayback=false;playRequest++;const position=rememberPosition();audio.pause();playing=false;effects.setPlaying(false);refreshDeck();emit('stop',{track:item(activeId),currentTime:position})}
  function resetCurrent(){wantsPlayback=false;playRequest++;audio.pause();try{audio.currentTime=0}catch{}if(activeId)resumePositions.delete(currentPositionKey());playing=false}
  $('playButton').onclick=()=>wantsPlayback?pause():play();$('stopButton').onclick=()=>{stop();toast('Stopped — position saved; press Play to resume')};
  function moveSong(direction,autoplay=false){
    const tape=item(activeId),playlist=songs(tape),next=activeSongIndex+direction;
    if(!tape||playlist.length<=1||next<0||next>=playlist.length)return false;
    const shouldPlay=autoplay||wantsPlayback;
    wantsPlayback=false;playRequest++;audio.pause();effects.setPlaying(false);playing=false;
    activeSongIndex=next;
    const song=playlist[next];audio.src=song.source;audio.load();
    refreshDeck();
    toast(pad(next+1)+'/'+pad(playlist.length)+' · '+song.name);
    emit('song-change',{tapeId:activeId,index:next,song});
    if(shouldPlay)play();
    return true;
  }
  $('rewButton').onclick=()=>{
    if(songs(item(activeId)).length>1){
      if(!moveSong(-1))toast('First song on this tape');
    }else{if(audio.src)audio.currentTime=Math.max(0,audio.currentTime-10);toast('Rewind ◀◀');emit('rewind',{seconds:10})}
  };
  $('forwardButton').onclick=()=>{
    if(songs(item(activeId)).length>1){
      if(!moveSong(1))toast('Last song on this tape');
    }else{if(audio.src&&Number.isFinite(audio.duration))audio.currentTime=Math.min(audio.duration,audio.currentTime+10);toast('Fast forward ▶▶');emit('forward',{seconds:10})}
  };
  $('ejectButton').onclick=()=>{resetCurrent();activeId=null;audio.removeAttribute('src');audio.load();refreshDeck();toast('Tape ejected');emit('eject',{})};
  const volumeButton=$('volumeBtn');
  function syncVolumeControl(){
    const percent=Math.round(volume*100);
    const angle=-135+volume*270;
    volumeButton.style.setProperty('--knob-angle',angle+'deg');
    volumeButton.setAttribute('aria-valuenow',String(percent));
    volumeButton.setAttribute('aria-valuetext',percent+' percent');
    volumeButton.title='Volume: '+percent+'%';
  }
  function setVolume(value,{announce=true}={}){
    const next=Math.max(0,Math.min(1,Math.round(value*100)/100));
    const changed=Math.abs(next-volume)>.0001;
    volume=next;
    if(Math.abs(audio.volume-next)>.0001)audio.volume=next;
    syncVolumeControl();
    if(changed){if(announce)toast('Volume '+Math.round(next*100)+'%');emit('volume',{value:next})}
  }
  let volumeDrag=null;
  volumeButton.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;
    event.preventDefault();
    volumeButton.focus();
    volumeDrag={id:event.pointerId,x:event.clientX,y:event.clientY,start:volume,moved:false};
    volumeButton.classList.add('is-dragging');
    try{volumeButton.setPointerCapture(event.pointerId)}catch{}
  });
  volumeButton.addEventListener('pointermove',event=>{
    if(!volumeDrag||event.pointerId!==volumeDrag.id)return;
    const delta=(volumeDrag.y-event.clientY)+(event.clientX-volumeDrag.x);
    if(Math.abs(delta)>2)volumeDrag.moved=true;
    setVolume(volumeDrag.start+delta/160,{announce:false});
  });
  function finishVolumeDrag(event,cancelled=false){
    if(!volumeDrag||event.pointerId!==volumeDrag.id)return;
    const moved=volumeDrag.moved;
    volumeDrag=null;
    volumeButton.classList.remove('is-dragging');
    try{volumeButton.releasePointerCapture(event.pointerId)}catch{}
    if(cancelled)return;
    if(!moved)setVolume(volume+.1);
    else toast('Volume '+Math.round(volume*100)+'%');
  }
  volumeButton.addEventListener('pointerup',event=>finishVolumeDrag(event));
  volumeButton.addEventListener('pointercancel',event=>finishVolumeDrag(event,true));
  volumeButton.addEventListener('wheel',event=>{
    event.preventDefault();
    setVolume(volume+(event.deltaY<0||event.deltaX>0 ? .05 : -.05));
  },{passive:false});
  volumeButton.addEventListener('keydown',event=>{
    const steps={ArrowUp:.05,ArrowRight:.05,ArrowDown:-.05,ArrowLeft:-.05,PageUp:.1,PageDown:-.1};
    let next;
    if(event.key in steps)next=volume+steps[event.key];
    else if(event.key==='Home')next=0;
    else if(event.key==='End')next=1;
    else if(event.key==='Enter'||event.key===' ')next=volume+.1;
    else return;
    event.preventDefault();event.stopPropagation();setVolume(next);
  });
  $('muteButton').onclick=()=>{audio.muted=!audio.muted;updateMuteButton();emit('mute',{muted:audio.muted})};
  audio.addEventListener('volumechange',()=>{volume=audio.volume;syncVolumeControl();updateMuteButton()});
  audio.addEventListener('playing',()=>{playing=true;effects.setPlaying(true);refreshDeck()});
  audio.addEventListener('pause',()=>{playing=false;effects.setPlaying(false);refreshDeck()});
  audio.addEventListener('error',()=>{playing=false;effects.setPlaying(false);refreshDeck();if(audio.error)toast('This audio file could not be loaded. Try another file.')});
  audio.addEventListener('timeupdate',()=>{if(!audio.paused)rememberPosition()});
  audio.addEventListener('loadedmetadata',()=>restorePosition(activeId));
  audio.onended=()=>{
    playing=false;wantsPlayback=false;effects.setPlaying(false);
    resumePositions.delete(currentPositionKey());
    // Automatically continue through all songs on this cassette first.
    if(moveSong(1,true))return;
    const idx=queue.indexOf(activeId);
    if(idx>=0&&idx+1<queue.length){
      loadTrack(queue[idx+1]);
      if(currentSong()?.source)play();
    }else refreshDeck();
  };
  // Separate rotary faces cover the baked-in knobs, while fixed hit areas prevent overlap.
  const rotarySettings=[
    {name:'Tape warmth',key:'warmth',x:8,y:29,size:8.5,initial:0},
    {name:'Audio warp',key:'warp',x:43.6,y:29,size:8.5,initial:.5},
    {name:'Lo-fi / bit depth',key:'lofi',x:74.5,y:29,size:8.5,initial:0},
    {name:'Wow',key:'wow',x:8.55,y:82,size:7.7,initial:0},
    {name:'Flutter',key:'flutter',x:24.95,y:82,size:7.7,initial:0},
    {name:'Bass',key:'bass',x:73.25,y:82.6,size:6.4,initial:.5},
    {name:'Mid',key:'mid',x:83.97,y:82.6,size:6.4,initial:.5},
    {name:'Treble',key:'treble',x:94.42,y:82.6,size:6.4,initial:.5}
  ];
  function configureSettingSlider(slider,control){
    slider.type='range';slider.min='0';slider.max='1';slider.step='.01';slider.value=String(control.initial);
    slider.title=control.name;slider.dataset.effect=control.key;slider.setAttribute('aria-label',control.name);
    slider.setAttribute('aria-valuetext',Math.round(control.initial*100)+' percent');
  }
  function applySetting(control,slider,wrapper){
    const value=Number(slider.value),percent=Math.round(value*100);
    effects.set(control.key,value);
    slider.setAttribute('aria-valuetext',percent+' percent');
    if(wrapper)wrapper.style.setProperty('--knob-angle',(-135+value*270)+'deg');
    $('settingsMessage').textContent=control.name+': '+percent+'%';if(control.key==='lofi'){const readout=$('rwBitDepth');if(readout)readout.textContent=String(Math.round(16-value*12))}
    emit('setting-change',{name:control.name,key:control.key,value});
  }
  rotarySettings.forEach(control=>{
    const wrapper=document.createElement('div');wrapper.className='settings-control';
    wrapper.classList.add('rw-dial');
    wrapper.style.setProperty('--knob-angle',(-135+control.initial*270)+'deg');
    const face=document.createElement('span');face.className='settings-knob-face';face.setAttribute('aria-hidden','true');
    const slider=document.createElement('input');slider.className='settings-hotspot';configureSettingSlider(slider,control);
    slider.addEventListener('input',()=>applySetting(control,slider,wrapper));
    wrapper.append(face,slider);const slot=document.querySelector('[data-setting-slot="'+control.key+'"]');if(slot)slot.append(wrapper);
  });
  const toggleSettings=[
    {name:'Tape hiss',key:'hiss',x:40.3,y:84.4,w:6.5,h:18,initial:0},
    {name:'Vinyl noise',key:'vinyl',x:50.63,y:84.4,w:6.5,h:18,initial:0},
    {name:'Hum',key:'hum',x:60.77,y:84.4,w:6.5,h:18,initial:0}
  ];
  toggleSettings.forEach(control=>{
    const unit=document.createElement('div');unit.className='noise-unit';
    unit.classList.add('rw-noise-unit');
    const led=document.createElement('span');led.className='noise-led';led.setAttribute('aria-hidden','true');
    const button=document.createElement('button');button.type='button';button.className='noise-switch-button';
    button.setAttribute('role','switch');button.setAttribute('aria-label',control.name+' on or off');
    button.setAttribute('aria-checked','false');button.title=control.name+': off';
    const lever=document.createElement('span');lever.className='noise-lever';lever.setAttribute('aria-hidden','true');
    const socket=document.createElement('span');socket.className='rw-switch-socket';socket.setAttribute('aria-hidden','true');button.append(socket,lever);
    const slider=document.createElement('input');slider.className='noise-level';
    configureSettingSlider(slider,control);slider.value='.45';
    slider.setAttribute('aria-label',control.name+' fine tuning');
    let enabled=false;
    function update(){
      unit.classList.toggle('is-on',enabled);
      button.setAttribute('aria-checked',String(enabled));
      button.title=control.name+': '+(enabled?'on':'off');
      const level=Number(slider.value);
      const value=enabled?level:0;
      effects.set(control.key,value);
      slider.setAttribute('aria-valuetext',Math.round(level*100)+' percent');
      $('settingsMessage').textContent=control.name+': '+(enabled?'ON · '+Math.round(level*100)+'%':'OFF');
      emit('setting-change',{name:control.name,key:control.key,value});
    }
    button.addEventListener('click',()=>{enabled=!enabled;update()});
    slider.addEventListener('input',update);
    const on=document.createElement('span');on.className='rw-switch-mark';on.textContent='ON';const off=document.createElement('span');off.className='rw-switch-mark';off.textContent='OFF';const fine=document.createElement('span');fine.className='rw-switch-fine';fine.textContent='INTENSITY';unit.append(on,button,off,fine,slider);const slot=document.querySelector('[data-noise-slot="'+control.key+'"]');if(slot)slot.append(unit);
  });
  // Import dialog: each audio file sits directly beside its own editable song name.
  let coverUrl=null,trackRowId=0,returnFocus=null;
  function openModal(){hideMenu();returnFocus=document.activeElement;$('modalScrim').hidden=false;document.body.style.overflow='hidden';$('importError').textContent='';$('trackRows').replaceChildren();$('tapeTitle').value='';$('coverFile').value='';if(coverUrl)URL.revokeObjectURL(coverUrl);coverUrl=null;previewDefaultCover();addRow();addRow();addRow();$('modalClose').focus()}
  function closeModal(){if(coverUrl){URL.revokeObjectURL(coverUrl);coverUrl=null}$('modalScrim').hidden=true;document.body.style.overflow='';if(returnFocus?.focus)returnFocus.focus()}
  function addRow(){trackRowId++;const row=document.createElement('div');row.className='track-entry';row.dataset.row=String(trackRowId);
    const input=document.createElement('input');input.type='file';input.accept='audio/*,.mp3,.wav,.flac,.m4a,.ogg,.aac,.opus,.aiff,.aif';input.hidden=true;
    const picker=document.createElement('button');picker.className='file-picker';picker.type='button';picker.setAttribute('aria-label','Choose song file for track '+trackRowId);picker.innerHTML='<span class="file-note">♫</span><span style="min-width:0"><span class="file-name">Choose song file</span><span class="file-types">MP3, WAV, FLAC, M4A, OGG, AAC</span></span>';picker.onclick=()=>input.click();
    const labelBox=document.createElement('div');labelBox.className='name-box';const label=document.createElement('label');label.textContent='Song name';const name=document.createElement('input');name.type='text';name.placeholder='Song name';name.maxLength=110;labelBox.append(label,name);
    const remove=document.createElement('button');remove.type='button';remove.className='remove-track';remove.textContent='×';remove.title='Remove this row';remove.setAttribute('aria-label','Remove this track row');remove.onclick=()=>{if($('trackRows').children.length>1)row.remove();else{input.value='';name.value='';picker.querySelector('.file-name').textContent='Choose song file'}};
    input.onchange=()=>{const file=input.files[0];if(file){picker.querySelector('.file-name').textContent=file.name;if(!name.value.trim())name.value=file.name.replace(/\.[^.]+$/,'').replace(/[_-]/g,' ')}else picker.querySelector('.file-name').textContent='Choose song file'};
    row.append(picker,labelBox,remove,input);$('trackRows').append(row);
  }
  $('importBtn').onclick=openModal;$('modalClose').onclick=closeModal;$('cancelImport').onclick=closeModal;$('addTrackBtn').onclick=addRow;
  $('modalScrim').addEventListener('mousedown',e=>{if(e.target===$('modalScrim'))closeModal()});
  $('chooseCover').onclick=()=>$('coverFile').click();
  $('coverFile').onchange=()=>{const file=$('coverFile').files[0];if(!file)return;if(!isImageFile(file)){$('importError').textContent='Choose a JPG, PNG, GIF, or WebP image.';$('coverFile').value='';return}if(coverUrl)URL.revokeObjectURL(coverUrl);coverUrl=URL.createObjectURL(file);const image=document.createElement('img');image.alt='Selected cover preview';image.src=coverUrl;$('coverPreview').replaceChildren(image)};
  function isAudioFile(file){return file.type.startsWith('audio/')||/\.(mp3|wav|flac|m4a|ogg|aac|opus|aiff?)$/i.test(file.name)}
  function isImageFile(file){return file.type.startsWith('image/')||/\.(jpe?g|png|gif|webp|avif)$/i.test(file.name)}
  $('confirmImport').onclick=()=>{
    $('importError').textContent='';const rows=[...$('trackRows').children];const entries=[];
    for(const row of rows){const f=row.querySelector('input[type=file]').files[0];const n=row.querySelector('input[type=text]').value.trim();if(f){if(!isAudioFile(f)){$('importError').textContent='Choose a supported audio file (MP3, WAV, FLAC, M4A, OGG, AAC, or AIFF).';return}if(!n){$('importError').textContent='Please give every selected audio file a song name.';return}entries.push({file:f,name:n})}}
    if(!entries.length){$('importError').textContent='Choose at least one audio file to import.';return}
    const img=coverUrl;coverUrl=null;
    const tracks=entries.map(({file,name})=>({name,source:URL.createObjectURL(file)}));
    const typedTitle=$('tapeTitle').value.trim();
    const tapeTitle=typedTitle||(tracks.length===1?tracks[0].name:'My Mixtape');
    const imported={
      id:'tape-'+Date.now()+'-'+Math.random().toString(36).slice(2),
      title:tapeTitle,artist:'My music',cover:img||takeDefaultCover(),
      customCover:!!img,tracks,source:tracks[0].source,demo:false,created:Date.now()
    };
    library.push(imported);$('searchInput').value='';renderLibrary();closeModal();navigate(2);
    toast('Added '+tapeTitle+' ('+tracks.length+' song'+(tracks.length===1?'':'s')+') to Library');
    emit('library-import',{tracks:[imported],tape:imported});
  };
  window.addEventListener('beforeunload',()=>{if(coverUrl)URL.revokeObjectURL(coverUrl);const urls=new Set(library.flatMap(track=>[track.cover,track.source,...songs(track).map(song=>song.source)]).filter(url=>url?.startsWith('blob:')));urls.forEach(url=>URL.revokeObjectURL(url))});
  syncVolumeControl();updateMuteButton();
  navigate(1);renderQueue();renderLibrary();refreshDeck();
})();
