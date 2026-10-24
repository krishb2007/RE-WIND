
const appState = {
  currentView: "player",
  currentAlbum: null,
  trackIndex: 0,
  isPlaying: false,
  isDiscInserted: false
};

// Change between Player, Library and Settings
function navigateTo(view) {
  appState.currentView = view;

  document.querySelectorAll("[data-view]")
    .forEach(element => {
      element.hidden = element.dataset.view !== view;
    });
}

// Update song information on the screen
function updatePlayerDisplay() {
  const album = appState.currentAlbum;
  const track = album?.tracks[appState.trackIndex];

  const title = document.getElementById("track-title");
  const artist = document.getElementById("artist-name");
  const cover = document.getElementById("disc-art");

  if (title) title.textContent = track?.title ?? "No disc";
  if (artist) artist.textContent = album?.artist ?? "";

  if (cover) {
    if (album?.cover) {
      cover.src = album.cover;
      cover.hidden = false;
    } else {
      cover.hidden = true;
    }
  }
}

// Insert an album into the player
function insertDisc(album) {
  if (!album?.tracks?.length) return;

  appState.currentAlbum = album;
  appState.trackIndex = 0;
  appState.isPlaying = false;
  appState.isDiscInserted = true;

  updatePlayerDisplay();
  navigateTo("player");
}

// Move to the next track
function nextTrack() {
  const album = appState.currentAlbum;
  if (!album) return;

  appState.trackIndex =
    (appState.trackIndex + 1) % album.tracks.length;

  appState.isPlaying = false;
  updatePlayerDisplay();
}

// Move to the previous track
function previousTrack() {
  const album = appState.currentAlbum;
  if (!album) return;

  appState.trackIndex =
    (appState.trackIndex - 1 + album.tracks.length)
    % album.tracks.length;

  appState.isPlaying = false;
  updatePlayerDisplay();
}

// Remove a disc
function ejectDisc() {
  appState.currentAlbum = null;
  appState.trackIndex = 0;
  appState.isPlaying = false;
  appState.isDiscInserted = false;

  updatePlayerDisplay();
}

// Make functions accessible to other scripts
window.REWIND = {
  appState,
  navigateTo,
  insertDisc,
  nextTrack,
  previousTrack,
  ejectDisc
};

// Connect HTML buttons to JavaScript
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-go-to]")
    .forEach(button => {
      button.addEventListener("click", () => {
        navigateTo(button.dataset.goTo);
      });
    });

  document.getElementById("next-btn")
    ?.addEventListener("click", nextTrack);

  document.getElementById("previous-btn")
    ?.addEventListener("click", previousTrack);

  document.getElementById("eject-btn")
    ?.addEventListener("click", ejectDisc);

  navigateTo("player");
  updatePlayerDisplay();
});
