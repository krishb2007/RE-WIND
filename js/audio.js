// Member 2: reusable playback engine. The final interface calls REWINDAudio.
(() => {
  'use strict';
  const audio = new Audio();
  audio.preload = 'metadata';
  audio.volume = 0.7;
  const listeners = new Set();
  let objectUrl = null;
  let status = 'empty';
  let error = '';
  let generation = 0;
  let shouldPlay = false;
  let repeatOne = false;

  function getState() {
    return {
      status, error, hasTrack: Boolean(objectUrl),
      isPlaying: !audio.paused && !audio.ended,
      currentTime: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
      duration: Number.isFinite(audio.duration) ? audio.duration : 0,
      volume: audio.volume,
      muted: audio.muted,
      repeatOne,
    };
  }

  function notify() {
    const state = getState();
    listeners.forEach((callback) => {
      try { callback(state); } catch (cause) { console.error(cause); }
    });
  }

  function loadTrack(file) {
    if (!(file instanceof Blob)) throw new TypeError('Choose a local audio file.');
    generation++;
    shouldPlay = false;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(file);
    error = '';
    status = 'loading';
    audio.src = objectUrl;
    audio.load();
    notify();
  }

  async function play() {
    if (!objectUrl) {
      error = 'Choose a song first.';
      notify();
      return false;
    }
    const attempt = ++generation;
    shouldPlay = true;
    error = '';
    try {
      await audio.play();
      if (attempt !== generation) {
        if (!shouldPlay && !audio.paused) audio.pause();
        return false;
      }
      status = 'playing';
      notify();
      return true;
    } catch (cause) {
      if (attempt !== generation) return false;
      shouldPlay = false;
      status = audio.error ? 'error' : 'paused';
      error = cause.name === 'NotAllowedError'
        ? 'Your browser blocked playback. Click Play again.'
        : 'Could not play this file. Try another MP3.';
      notify();
      return false;
    }
  }

  function pause() {
    generation++;
    shouldPlay = false;
    audio.pause();
    if (objectUrl && !audio.error) status = 'paused';
    notify();
  }

  function stop() {
    generation++;
    shouldPlay = false;
    audio.pause();
    audio.currentTime = 0;
    if (objectUrl && !audio.error) status = 'stopped';
    notify();
  }

  function seek(seconds) {
    if (!Number.isFinite(seconds) || !getState().duration) return;
    audio.currentTime = Math.max(0, Math.min(seconds, audio.duration));
    if (audio.paused && !audio.ended) status = 'paused';
    notify();
  }

  function skip(seconds) {
    if (!Number.isFinite(seconds)) return;
    seek(getState().currentTime + seconds);
  }

  function setVolume(value) {
    if (!Number.isFinite(value)) return;
    audio.volume = Math.max(0, Math.min(1, value));
    notify();
  }

  function setMuted(value) {
    if (typeof value !== 'boolean') return;
    audio.muted = value;
    notify();
  }

  function toggleMute() {
    setMuted(!audio.muted);
  }

  function setRepeatOne(value) {
    if (typeof value !== 'boolean') return;
    repeatOne = value;
    audio.loop = repeatOne;
    notify();
  }

  function unload() {
    generation++;
    shouldPlay = false;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = null;
    error = '';
    status = 'empty';
    notify();
  }

  audio.addEventListener('loadedmetadata', () => {
    if (status === 'loading') status = 'ready';
    notify();
  });
  audio.addEventListener('playing', () => {
    if (!shouldPlay) { audio.pause(); return; }
    if (!audio.paused) { status = 'playing'; error = ''; notify(); }
  });
  audio.addEventListener('waiting', () => {
    if (!audio.paused) { status = 'buffering'; notify(); }
  });
  audio.addEventListener('pause', () => {
    if (status === 'playing' || status === 'buffering') status = 'paused';
    notify();
  });
  audio.addEventListener('ended', () => {
    shouldPlay = false;
    status = 'finished';
    notify();
  });
  audio.addEventListener('error', () => {
    if (!audio.error) return;
    status = 'error';
    error = 'This audio file could not be loaded. Choose another MP3.';
    notify();
  });
  ['timeupdate', 'durationchange', 'volumechange'].forEach((event) => {
    audio.addEventListener(event, notify);
  });

  window.REWINDAudio = {
    audio, loadTrack, play, pause, stop, seek, skip, setVolume,
    setMuted, toggleMute, setRepeatOne, unload, getState,
    subscribe(callback) {
      listeners.add(callback);
      callback(getState());
      return () => listeners.delete(callback);
    },
  };
})();