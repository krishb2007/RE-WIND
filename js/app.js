
/*
  RE-WIND
  Member 4 — Application Logic
*/

const state = {
  currentView: "player",
  currentAlbum: null,
  trackIndex: 0,
  isPlaying: false,
  isDiscInserted: false
};

// Get the currently selected song
function getCurrentTrack() {
  return state.currentAlbum?.tracks?.[state.trackIndex] ?? null;
}

// Tell other parts of the application what happened
function emit(action) {
  document.dispatchEvent(
    new CustomEvent(`rewind:${action}`, {
      detail: {
        album: state.currentAlbum,
        track: getCurrentTrack(),
        trackIndex: state.trackIndex,
        isPlaying: state.isPlaying
      }
    })
  );
}

// Update the displayed player information
function render() {
  const track = getCurrentTrack();

  const title = document.getElementById("track-title");
  const artist = document.getElementById("artist-name");
  const cover = document.getElementById("disc-art");

  if (title) title.textContent = track?.title ?? "No disc";
  if (artist) artist.textContent = state.currentAlbum?.artist ?? "";

  if (cover) {
    const image = state.currentAlbum?.cover;
    if (image) cover.src = image;
    cover.hidden = !image;
  }

  document.querySelectorAll("[data-view]").forEach(el => {
    el.hidden = el.dataset.view !== state.currentView;
  });

  if (document.body) {
    document.body.dataset.playing = String(state.isPlaying);
    document.body.dataset.discInserted =
      String(state.isDiscInserted);
  }
}

// Navigate between windows
function navigateTo(view) {
  state.currentView = view;
  render();
}

// Insert a CD
function insertDisc(album) {
  if (!album?.tracks?.length) return;

  if (state.isPlaying) emit("stop");

  state.currentAlbum = album;
  state.trackIndex = 0;
  state.isDiscInserted = true;
  state.isPlaying = false;

  navigateTo("player");
  emit("insert");
  emit("trackchange");
}

// Play
function play() {
  if (!getCurrentTrack()) return;

  state.isPlaying = true;
  render();
  emit("play");
}

// Pause
function pause() {
  state.isPlaying = false;
  render();
  emit("pause");
}

// Next song
function nextTrack() {
  if (!state.currentAlbum) return;

  state.trackIndex =
    (state.trackIndex + 1) % state.currentAlbum.tracks.length;

  render();
  emit("trackchange");

  if (state.isPlaying) emit("play");
}

// Previous song
function previousTrack() {
  if (!state.currentAlbum) return;

  const length = state.currentAlbum.tracks.length;

  state.trackIndex = (state.trackIndex - 1 + length) % length;

  render();
  emit("trackchange");

  if (state.isPlaying) emit("play");
}

// Eject the CD
function ejectDisc() {
  emit("stop");

  state.currentAlbum = null;
  state.trackIndex = 0;
  state.isPlaying = false;
  state.isDiscInserted = false;

  render();
  emit("eject");
}

// Allow other project files to use your functions
window.REWIND = {
  state,
  navigateTo,
  insertDisc,
  play,
  pause,
  nextTrack,
  previousTrack,
  ejectDisc,
  getCurrentTrack
};

// Connect visual buttons to application logic
document.addEventListener("click", event => {
  const button = event.target.closest(
    "[data-action], [data-go-to]"
  );

  if (!button) return;

  if (button.dataset.goTo) {
    navigateTo(button.dataset.goTo);
    return;
  }

  const actions = {
    play,
    pause,
    next: nextTrack,
    previous: previousTrack,
    eject: ejectDisc
  };

  actions[button.dataset.action]?.();
});

// Initialize when the page loads
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", render);
} else {
  render();
}

