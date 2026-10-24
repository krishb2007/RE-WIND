
const appState = {
  currentView: "player",
  currentAlbum: null,
  currentTrack: null,
  isPlaying: false,
  isDiscInserted: false
};

function insertDisc(album) {
  appState.currentAlbum = album;
  appState.currentTrack = album.tracks[0];
  appState.isDiscInserted = true;

  updatePlayerUI();
}

function navigateTo(view) {
  appState.currentView = view;
  updateNavigationUI();
}

