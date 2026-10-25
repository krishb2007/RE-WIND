// =====================================================
// RE-WIND — MUSIC LIBRARY
// Member 3: Music Library & Playlist Management
// =====================================================

const musicLibrary = [
  {
    id: 1,
    title: "North Lights",
    artist: "North Lights",
    album: "North Lights",
    genre: "Synth-pop",
    duration: "",
    cover: "./assets/images/case-01.webp",
    audioUrl: null
  },
  {
    id: 2,
    title: "Petal Static",
    artist: "Petal Static",
    album: "Petal Static",
    genre: "Dream pop",
    duration: "",
    cover: "./assets/images/case-02.webp",
    audioUrl: null
  },
  {
    id: 3,
    title: "Orbital Drift",
    artist: "Orbital Drift",
    album: "Orbital Drift",
    genre: "Synth-pop",
    duration: "",
    cover: "./assets/images/case-03.webp",
    audioUrl: null
  },
  {
    id: 4,
    title: "Midnight Lanes",
    artist: "Midnight Lanes",
    album: "Midnight Lanes",
    genre: "Indie pop",
    duration: "",
    cover: "./assets/images/case-04.webp",
    audioUrl: null
  },
  {
    id: 5,
    title: "Tides",
    artist: "Tides",
    album: "Tides",
    genre: "Ambient",
    duration: "",
    cover: "./assets/images/case-05.webp",
    audioUrl: null
  },
  {
    id: 6,
    title: "Fracture Plans",
    artist: "Fracture Plans",
    album: "Fracture Plans",
    genre: "Electronic",
    duration: "",
    cover: "./assets/images/case-06.webp",
    audioUrl: null
  },
  {
    id: 7,
    title: "Slow Rooms",
    artist: "Slow Rooms",
    album: "Slow Rooms",
    genre: "Lo-fi",
    duration: "",
    cover: "./assets/images/case-07.webp",
    audioUrl: null
  },
  {
    id: 8,
    title: "Vacant Frequencies",
    artist: "Vacant Frequencies",
    album: "Vacant Frequencies",
    genre: "Synth-pop",
    duration: "",
    cover: "./assets/images/case-08.webp",
    audioUrl: null
  }
];


// =====================================================
// MUSIC LIBRARY FUNCTIONS
// =====================================================

// Get all songs
function getAllSongs() {
  return [...musicLibrary];
}

// Search songs by title, artist, album, or genre
function searchSongs(query) {
  const search = String(query ?? "").toLowerCase().trim();

  return musicLibrary.filter(song =>
    song.title.toLowerCase().includes(search) ||
    song.artist.toLowerCase().includes(search) ||
    song.album.toLowerCase().includes(search) ||
    song.genre.toLowerCase().includes(search)
  );
}

// Get songs by album
function getSongsByAlbum(album) {
  return musicLibrary.filter(song =>
    song.album.toLowerCase() === String(album).toLowerCase()
  );
}

// Get songs by artist
function getSongsByArtist(artist) {
  return musicLibrary.filter(song =>
    song.artist.toLowerCase() === String(artist).toLowerCase()
  );
}

// Get songs by genre
function getSongsByGenre(genre) {
  return musicLibrary.filter(song =>
    song.genre.toLowerCase() === String(genre).toLowerCase()
  );
}

// Get song by ID
function getSongById(id) {
  return musicLibrary.find(song => song.id === Number(id)) || null;
}

// Get all unique albums
function getAllAlbums() {
  return [...new Set(musicLibrary.map(song => song.album))];
}

// Get all unique artists
function getAllArtists() {
  return [...new Set(musicLibrary.map(song => song.artist))];
}


// =====================================================
// FAVORITES SYSTEM
// =====================================================

const FAVORITES_KEY = "rewind-favorites";

function loadFavorites() {
  try {
    const stored = JSON.parse(localStorage.getItem(FAVORITES_KEY));
    return Array.isArray(stored)
      ? stored.map(Number).filter(Number.isFinite)
      : [];
  } catch {
    return [];
  }
}

let favorites = loadFavorites();

// Add song to favorites
function addToFavorites(songId) {
  const id = Number(songId);

  if (!getSongById(id)) return false;

  if (!favorites.includes(id)) {
    favorites.push(id);
    saveFavorites();
  }

  return true;
}

// Remove song from favorites
function removeFromFavorites(songId) {
  favorites = favorites.filter(id => id !== Number(songId));
  saveFavorites();
}

// Toggle favorite
function toggleFavorite(songId) {
  const id = Number(songId);

  if (favorites.includes(id)) {
    removeFromFavorites(id);
    return false;
  }

  return addToFavorites(id);
}

// Get favorite songs
function getFavoriteSongs() {
  return favorites
    .map(id => getSongById(id))
    .filter(Boolean);
}

// Check if song is favorite
function isFavorite(songId) {
  return favorites.includes(Number(songId));
}

// Save favorites
function saveFavorites() {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}


// =====================================================
// PLAYLIST MANAGEMENT
// =====================================================

const PLAYLISTS_KEY = "rewind-playlists";

function loadPlaylists() {
  try {
    const stored = JSON.parse(localStorage.getItem(PLAYLISTS_KEY));
    return Array.isArray(stored)
      ? stored.filter(p =>
          p &&
          typeof p.id === "string" &&
          typeof p.name === "string" &&
          Array.isArray(p.songs)
        )
      : [];
  } catch {
    return [];
  }
}

let playlists = loadPlaylists();

// Save playlists
function savePlaylists() {
  localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
}

// Create playlist
function createPlaylist(name) {
  const playlistName = String(name ?? "").trim();

  if (!playlistName) return null;

  const playlist = {
    id: crypto.randomUUID(),
    name: playlistName,
    songs: [],
    createdAt: new Date().toISOString()
  };

  playlists.push(playlist);
  savePlaylists();

  return playlist;
}

// Delete playlist
function deletePlaylist(playlistId) {
  const originalLength = playlists.length;

  playlists = playlists.filter(p => p.id !== playlistId);
  savePlaylists();

  return playlists.length < originalLength;
}

// Add song to playlist
function addSongToPlaylist(playlistId, songId) {
  const playlist = playlists.find(p => p.id === playlistId);
  const id = Number(songId);

  if (!playlist || !getSongById(id)) return false;

  if (!playlist.songs.includes(id)) {
    playlist.songs.push(id);
    savePlaylists();
  }

  return true;
}

// Remove song from playlist
function removeSongFromPlaylist(playlistId, songId) {
  const playlist = playlists.find(p => p.id === playlistId);

  if (!playlist) return false;

  playlist.songs = playlist.songs.filter(
    id => Number(id) !== Number(songId)
  );

  savePlaylists();
  return true;
}

// Get all playlists
function getAllPlaylists() {
  return playlists.map(p => ({
    ...p,
    songs: [...p.songs]
  }));
}

// Get playlist songs
function getPlaylistSongs(playlistId) {
  const playlist = playlists.find(p => p.id === playlistId);

  if (!playlist) return [];

  return playlist.songs
    .map(id => getSongById(id))
    .filter(Boolean);
}

// Rename playlist
function renamePlaylist(playlistId, newName) {
  const playlist = playlists.find(p => p.id === playlistId);
  const name = String(newName ?? "").trim();

  if (!playlist || !name) return false;

  playlist.name = name;
  savePlaylists();

  return true;
}


// =====================================================
// MUSIC PLAYER INTEGRATION
// =====================================================

// Select song and notify the rest of the application.
// Member 2 can listen for the "rewind:select-song" event.

function selectSong(songId) {
  const song = getSongById(songId);

  if (!song) return null;

  document.dispatchEvent(
    new CustomEvent("rewind:select-song", {
      detail: { song }
    })
  );

  return song;
}

const albums = musicLibrary.map(song => ({
  id: song.id,
  title: song.title,
  artist: song.artist,
  cover: song.cover,
  audio: song.audioUrl
}));

function renderAlbums(container, query = "") {
  if (!container) return 0;

  const matches = albums.filter(album =>
    `${album.title} ${album.artist}`.toLowerCase().includes(
      String(query).toLowerCase().trim()
    )
  );

  container.replaceChildren();

  if (!matches.length) {
    const empty = document.createElement("p");
    empty.className = "empty-library";
    empty.textContent = "No tapes match that search.";
    container.append(empty);
    return 0;
  }

  matches.forEach(album => {
    const card = document.createElement("article");
    card.className = "album";
    const cover = document.createElement("img");
    cover.src = album.cover;
    cover.alt = `${album.title} album cover`;
    cover.loading = "lazy";

    const title = document.createElement("h2");
    title.textContent = album.title;
    const artist = document.createElement("p");
    artist.textContent = album.artist;
    const actions = document.createElement("div");
    actions.className = "album-actions";

    const load = document.createElement("button");
    load.type = "button";
    load.dataset.action = "load-tape";
    load.dataset.albumId = String(album.id);
    load.textContent = "Load tape";

    const queue = document.createElement("button");
    queue.type = "button";
    queue.dataset.action = "queue-tape";
    queue.dataset.albumId = String(album.id);
    queue.textContent = "+ Queue";

    actions.append(load, queue);
    card.append(cover, title, artist, actions);
    container.append(card);
  });

  return matches.length;
}


// =====================================================
// EXPORT FUNCTIONS FOR OTHER TEAM MEMBERS
// =====================================================

window.REWINDLibrary = {
  albums,
  renderAlbums,
  getAllSongs,
  searchSongs,
  getSongsByAlbum,
  getSongsByArtist,
  getSongsByGenre,
  getSongById,
  getAllAlbums,
  getAllArtists,

  addToFavorites,
  removeFromFavorites,
  toggleFavorite,
  getFavoriteSongs,
  isFavorite,

  createPlaylist,
  deletePlaylist,
  addSongToPlaylist,
  removeSongFromPlaylist,
  getAllPlaylists,
  getPlaylistSongs,
  renamePlaylist,

  selectSong
};

console.log("RE-WIND Music Library Loaded Successfully!");