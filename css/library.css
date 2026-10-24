// =====================================================
// RE-WIND — MUSIC LIBRARY
// Member 3: Music Library & Playlist Management
// =====================================================

// SAMPLE MUSIC DATA
// Audio URLs can be added when the playback team
// supplies playable tracks.

const musicLibrary = [
  {
    id: 1,
    title: "Blinding Lights",
    artist: "The Weeknd",
    album: "After Hours",
    genre: "Synth-pop",
    duration: "3:20",
    cover: "",
    audioUrl: ""
  },
  {
    id: 2,
    title: "Get Lucky",
    artist: "Daft Punk",
    album: "Random Access Memories",
    genre: "Disco",
    duration: "4:08",
    cover: "",
    audioUrl: ""
  },
  {
    id: 3,
    title: "Take On Me",
    artist: "a-ha",
    album: "Hunting High and Low",
    genre: "Synth-pop",
    duration: "3:46",
    cover: "",
    audioUrl: ""
  },
  {
    id: 4,
    title: "Billie Jean",
    artist: "Michael Jackson",
    album: "Thriller",
    genre: "Pop",
    duration: "4:54",
    cover: "",
    audioUrl: ""
  },
  {
    id: 5,
    title: "Digital Love",
    artist: "Daft Punk",
    album: "Discovery",
    genre: "Electronic",
    duration: "4:58",
    cover: "",
    audioUrl: ""
  },
  {
    id: 6,
    title: "Stayin' Alive",
    artist: "Bee Gees",
    album: "Saturday Night Fever",
    genre: "Disco",
    duration: "4:45",
    cover: "",
    audioUrl: ""
  },
  {
    id: 7,
    title: "Everybody Wants to Rule the World",
    artist: "Tears for Fears",
    album: "Songs from the Big Chair",
    genre: "New Wave",
    duration: "4:11",
    cover: "",
    audioUrl: ""
  },
  {
    id: 8,
    title: "Sweet Dreams",
    artist: "Eurythmics",
    album: "Sweet Dreams",
    genre: "Synth-pop",
    duration: "3:36",
    cover: "",
    audioUrl: ""
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

  window.dispatchEvent(
    new CustomEvent("rewind:select-song", {
      detail: { song }
    })
  );

  return song;
}


// =====================================================
// EXPORT FUNCTIONS FOR OTHER TEAM MEMBERS
// =====================================================

window.REWINDLibrary = {
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
