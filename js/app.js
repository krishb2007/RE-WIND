(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const pad = n => String(n).padStart(2,'0');
  const demo = [
    {title:'North Lights',artist:'Demo tape',cover:'assets/images/case-01.webp'},
    {title:'Petal Static',artist:'Demo tape',cover:'assets/images/case-02.webp'},
    {title:'Orbital Drift',artist:'Demo tape',cover:'assets/images/case-03.webp'},
    {title:'Midnight Lanes',artist:'Demo tape',cover:'assets/images/case-04.webp'},
    {title:'Tides',artist:'Demo tape',cover:'assets/images/case-05.webp'},
    {title:'Fracture Plans',artist:'Demo tape',cover:'assets/images/case-06.webp'},
    {title:'Slow Rooms',artist:'Demo tape',cover:'assets/images/case-07.webp'},
    {title:'Vacant Frequencies',artist:'Demo tape',cover:'assets/images/case-08.webp'}
  ].map((item,index) => ({...item,id:'demo-'+index,source:null,demo:true,created:index}));
  let library=[...demo],queue=demo.slice(0,4).map(x=>x.id),activeId='demo-1',windowIndex=1,playing=false,volume=.7,toastTimeout;
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
  function renderQueue(){
    const available=queue.map(id=>item(id)).filter(Boolean);
    $('queueCount').textContent=pad(available.length)+' TAPES';
    const stack=$('cassetteStack'),lines=$('queueItems');stack.replaceChildren();lines.replaceChildren();
    if(!available.length){const empty=document.createElement('p');empty.className='queue-empty';empty.textContent='Add songs from your Library';stack.append(empty);return}
    available.slice(0,4).forEach(track=>{
      const tape=document.createElement('div');tape.className='cassette-case';tape.title=track.title;
      const art=document.createElement('div');art.className='spine-image';art.style.backgroundImage=`url(${JSON.stringify(track.cover)})`;
      const title=document.createElement('strong');title.textContent=track.title;
      const label=document.createElement('small');label.textContent=songs(track).length>1?songs(track).length+' SONGS':'TAPE';
      tape.append(art,title,label);stack.append(tape);
    });
    available.forEach((track,i)=>{
      const row=document.createElement('button');row.type='button';row.className='queue-item'+(track.id===activeId?' active':'');row.title='Load '+track.title;row.setAttribute('aria-current',track.id===activeId?'true':'false');
      const n=document.createElement('span');n.className='number';n.textContent=pad(i+1);
      const t=document.createElement('span');t.className='title';t.textContent=track.title;
      const r=document.createElement('span');r.className='tape-label';r.textContent=songs(track).length>1?songs(track).length+' SONGS':'TAPE';
      row.append(n,t,r);row.onclick=()=>{if(track.id===activeId){wantsPlayback?pause():play()}else loadTrack(track.id)};lines.append(row);
    });
  }
  function renderLibrary(){
    const query=$('searchInput').value.trim().toLowerCase();let shown=library.filter(x=>(x.title+' '+x.artist+' '+songs(x).map(song=>song.name).join(' ')).toLowerCase().includes(query));
    if($('sortSelect').value==='az')shown.sort((a,b)=>a.title.localeCompare(b.title));
    if($('sortSelect').value==='za')shown.sort((a,b)=>b.title.localeCompare(a.title));
    if($('sortSelect').value==='recent')shown.sort((a,b)=>b.created-a.created);
    const grid=$('libraryGrid');grid.replaceChildren();
    if(!shown.length){const empty=document.createElement('p');empty.className='queue-empty';empty.textContent='No music matches that search.';grid.append(empty)}
    shown.forEach(track=>{
      const card=document.createElement('article');card.className='album-card';
      const select=document.createElement('button');select.className='album-art-btn';select.type='button';select.title='Add '+track.title+' to queue';select.setAttribute('aria-label','Add '+track.title+' to queue');
      const cover=document.createElement('img');cover.className='album-cover';cover.src=track.cover;cover.alt=track.title+' album artwork';
      if(track.customCover){
        const frame=document.createElement('span');frame.className='album-cover-case';
        frame.append(cover);select.append(frame);
      }else{select.append(cover)}
      select.onclick=()=>{queue.push(track.id);renderQueue();toast(track.title+' added to queue');emit('queue-change',{ids:[...queue]})};
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
    action('Remove from queue',()=>{const ix=queue.indexOf(track.id);if(ix>=0){queue.splice(ix,1);if(activeId===track.id)stop();renderQueue();emit('queue-change',{ids:[...queue]});toast('Removed from queue')}});
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
    let details=playing?' · playing':' · '+(song?.source?'ready':'visual demo · import an audio file to play');
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
    if(!song?.source){toast('This is demo artwork. Import an audio file to hear playback.');emit('play',{track,hasAudio:false});return}
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
  $('volumeBtn').onclick=()=>{volume=volume>=1?.1:Math.min(1,Math.round((volume+.1)*10)/10);audio.volume=volume;$('volumeBtn').setAttribute('aria-label','Increase volume; current volume '+Math.round(volume*100)+' percent');toast('Volume '+Math.round(volume*100)+'%');emit('volume',{value:volume})};
  $('muteButton').onclick=()=>{audio.muted=!audio.muted;updateMuteButton();emit('mute',{muted:audio.muted})};
  audio.addEventListener('volumechange',updateMuteButton);
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
  // Settings screenshot uses click-target overlays, without re-drawing your approved console.
  const settingsControls=[['Tape warmth','warmth',10.5,29,10,24,0],['Audio warp','warp',44.8,29,10,24,.5],['Lo-fi / bit depth','lofi',75.2,29,10,24,0],['Wow','wow',10.5,82,10,22,0],['Flutter','flutter',27,82,10,22,0],['Tape hiss','hiss',42.2,82,8,18,0],['Vinyl noise','vinyl',52.2,82,8,18,0],['Hum','hum',62,82,8,18,0],['Bass','bass',74,82,8,18,.5],['Mid','mid',84,82,8,18,.5],['Treble','treble',94,82,8,18,.5]];
  settingsControls.forEach(([name,key,x,y,w,h,initial])=>{const slider=document.createElement('input');slider.type='range';slider.min='0';slider.max='1';slider.step='.01';slider.value=String(initial);slider.className='settings-hotspot';slider.style.left=(x-w/2)+'%';slider.style.top=(y-h/2)+'%';slider.style.width=w+'%';slider.style.height=h+'%';slider.title=name;slider.setAttribute('aria-label',name);slider.setAttribute('aria-valuetext',Math.round(initial*100)+' percent');slider.addEventListener('input',()=>{const value=Number(slider.value);effects.set(key,value);slider.setAttribute('aria-valuetext',Math.round(value*100)+' percent');$('settingsMessage').textContent=name+': '+Math.round(value*100)+'%';emit('setting-change',{name,key,value})});$('settingsVisual').append(slider)});
  // Import dialog: each audio file sits directly beside its own editable song name.
  let coverUrl=null,trackRowId=0,returnFocus=null;
  function openModal(){hideMenu();returnFocus=document.activeElement;$('modalScrim').hidden=false;document.body.style.overflow='hidden';$('importError').textContent='';$('trackRows').replaceChildren();$('tapeTitle').value='';$('coverFile').value='';if(coverUrl)URL.revokeObjectURL(coverUrl);coverUrl=null;$('coverPreview').textContent='▧';addRow();addRow();addRow();$('modalClose').focus()}
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
      title:tapeTitle,artist:'My music',cover:img||'assets/images/case-06.webp',
      customCover:!!img,tracks,source:tracks[0].source,demo:false,created:Date.now()
    };
    library.push(imported);renderLibrary();closeModal();navigate(2);
    toast('Added '+tapeTitle+' ('+tracks.length+' song'+(tracks.length===1?'':'s')+') to Library');
    emit('library-import',{tracks:[imported],tape:imported});
  };
  window.addEventListener('beforeunload',()=>{if(coverUrl)URL.revokeObjectURL(coverUrl);const urls=new Set(library.flatMap(track=>[track.cover,track.source,...songs(track).map(song=>song.source)]).filter(url=>url?.startsWith('blob:')));urls.forEach(url=>URL.revokeObjectURL(url))});
  updateMuteButton();
  navigate(1);renderQueue();renderLibrary();refreshDeck();
})();
