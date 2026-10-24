// These buttons are for testing only. Krish can use the same engine in app.js.
const player = window.REWINDAudio;
const byId = (id) => document.getElementById(id);
const formatTime = (seconds) => {
  const whole = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};

byId('file').addEventListener('change', (event) => {
  const files = event.target.files;
  if (!files.length) return;
  player.enqueueTracks(files);
  event.target.value = '';
});
byId('play').addEventListener('click', () => { void player.play(); });
byId('pause').addEventListener('click', () => player.pause());
byId('stop').addEventListener('click', () => player.stop());
byId('mute').addEventListener('click', () => player.toggleMute());
byId('repeat-one').addEventListener('click', () => {
  player.setRepeatOne(!player.getState().repeatOne);
});
byId('skip-back').addEventListener('click', () => player.skip(-10));
byId('skip-forward').addEventListener('click', () => player.skip(10));
byId('eject').addEventListener('click', () => {
  player.unload();
  byId('file').value = '';
});
byId('next-track').addEventListener('click', () => player.nextTrack());
byId('seek').addEventListener('input', (event) => player.seek(Number(event.target.value)));
byId('volume').addEventListener('input', (event) => player.setVolume(Number(event.target.value)));

player.subscribe((state) => {
  byId('play').disabled = !state.hasTrack || state.status === 'error';
  byId('pause').disabled = !state.isPlaying;
  byId('stop').disabled = !state.hasTrack;
  byId('mute').textContent = state.muted ? 'Unmute' : 'Mute';
  byId('mute').setAttribute('aria-pressed', String(state.muted));
  byId('repeat-one').textContent = `Repeat One: ${state.repeatOne ? 'On' : 'Off'}`;
  byId('repeat-one').setAttribute('aria-pressed', String(state.repeatOne));
  byId('repeat-one').disabled = !state.hasTrack;
  byId('skip-back').disabled = !state.hasTrack || state.duration === 0;
  byId('skip-forward').disabled = !state.hasTrack || state.duration === 0;
  byId('eject').disabled = !state.hasTrack;
  byId('next-track').disabled = state.currentIndex < 0 || state.currentIndex >= state.queue.length - 1;
  byId('seek').disabled = state.duration === 0;
  byId('seek').max = state.duration;
  byId('seek').value = state.currentTime;
  byId('time').textContent = `${formatTime(state.currentTime)} / ${formatTime(state.duration)}`;
  byId('volume-value').textContent = `${Math.round(state.volume * 100)}%`;
  byId('song').textContent = state.hasTrack ? state.queue[state.currentIndex].name : 'No song selected';
  byId('queue').replaceChildren(...state.queue.map((track, index) => {
    const item = document.createElement('li');
    item.textContent = `${track.isCurrent ? 'Now playing: ' : ''}${track.name}`;
    return item;
  }));
  byId('status').textContent = state.error || `Status: ${state.status}`;
});
