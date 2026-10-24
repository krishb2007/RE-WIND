(() => {
  "use strict";

  const library = window.REWINDLibrary;
  if (!library) {
    throw new Error("Load js/library.js before js/player.js.");
  }

  const $ = id => document.getElementById(id);
  const audio = $("audio");
  const albums = library.albums;
  const localFiles = new Map();
  let current = 0;
  let queue = [1, 2, 3];
  let shuffle = false;
  let repeat = false;
  let view = "player";
  let generation = 0;
  let playbackMode = "STOPPED";

  function setStatus(message) {
    $("status").textContent = message;
  }

  function navigate(name) {
    if (!["settings", "player", "library"].includes(name)) return;

    view = name;
    ["settings", "player", "library"].forEach(id => {
      $(id).hidden = id !== name;
    });
    document.querySelectorAll("[data-view]").forEach(button => {
      if (button.dataset.view === name) {
        button.setAttribute("aria-current", "page");
      } else {
        button.removeAttribute("aria-current");
      }
    });
  }

  function setPlaybackState(mode) {
    playbackMode = mode;
    $("deck").classList.toggle("playing", mode === "PLAYING");
    $("play").setAttribute("aria-pressed", String(mode === "PLAYING"));
    const symbols = {
      PLAYING: "▶ ",
      PAUSED: "Ⅱ ",
      STOPPED: "■ ",
      LOADING: "… ",
      "NO AUDIO": "○ "
    };
    $("mode").textContent = `${symbols[mode] || ""}${mode}`;
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
  }

  function updateProgress() {
    const duration = audio.duration;
    const currentTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
    const hasDuration = Number.isFinite(duration) && duration > 0;

    $("elapsed").textContent = formatTime(currentTime);
    $("duration").textContent = formatTime(duration);
    $("counter").textContent = String(Math.floor(currentTime)).padStart(4, "0");
    $("seek").disabled = !hasDuration;
    $("seek").value = hasDuration ? String(currentTime / duration * 100) : "0";
  }

  function select(index) {
    if (!Number.isInteger(index) || index < 0 || index >= albums.length) return;

    generation += 1;
    audio.pause();
    current = index;
    const album = albums[current];

    audio.removeAttribute("src");
    audio.load();

    $("tapeTitle").textContent = $("nowTitle").textContent = album.title;
    $("nowArtist").textContent = album.artist;
    $("cover").src = album.cover;
    $("cover").alt = `${album.title} album cover`;
    $("cover").style.opacity = "1";
    $("trackNumber").textContent = `TAPE ${String(index + 1).padStart(2, "0")}`;
    setPlaybackState("STOPPED");
    updateProgress();
    setStatus(`Loaded ${album.title}. Press play.`);
  }

  async function play() {
    const token = generation;
    const source = localFiles.get(current) || albums[current].audio;
    setPlaybackState("LOADING");
    setStatus(`Loading ${albums[current].title}…`);

    try {
      if (source && audio.getAttribute("src") !== source) {
        audio.src = source;
        audio.load();
      }
      await audio.play();
      if (token !== generation) return;
    } catch (error) {
      if (token !== generation || error.name === "AbortError") return;
      setPlaybackState("NO AUDIO");
      setStatus(
        `Audio unavailable. Add assets/audio/track${current + 1}.mp3 or choose a local file in Settings.`
      );
    }
  }

  function togglePlayback() {
    if (audio.paused) {
      void play();
    } else {
      audio.pause();
    }
  }

  function renderQueue() {
    const list = $("queue");
    list.replaceChildren();

    queue.forEach((albumIndex, queueIndex) => {
      const album = albums[albumIndex];
      if (!album) return;

      const item = document.createElement("li");
      const load = document.createElement("button");
      const remove = document.createElement("button");
      load.type = remove.type = "button";
      load.className = "load";
      load.textContent = `${String(queueIndex + 1).padStart(2, "0")} · ${album.title}`;
      load.setAttribute("aria-label", `Play ${album.title} from queue`);
      load.addEventListener("click", () => {
        queue.splice(queueIndex, 1);
        renderQueue();
        select(albumIndex);
        navigate("player");
      });
      remove.className = "remove";
      remove.textContent = "×";
      remove.setAttribute("aria-label", `Remove ${album.title} from queue`);
      remove.addEventListener("click", () => {
        queue.splice(queueIndex, 1);
        renderQueue();
      });
      item.append(load, remove);
      list.append(item);
    });

    if (!queue.length) {
      const item = document.createElement("li");
      item.className = "note";
      item.textContent = "Queue is empty. Add tapes from Library.";
      list.append(item);
    }
  }

  function next(autoplay = false) {
    let nextIndex;
    if (queue.length) {
      nextIndex = queue.shift();
      renderQueue();
    } else if (shuffle && albums.length > 1) {
      const offset = 1 + Math.floor(Math.random() * (albums.length - 1));
      nextIndex = (current + offset) % albums.length;
    } else {
      nextIndex = (current + 1) % albums.length;
    }

    select(nextIndex);
    if (autoplay) void play();
  }

  function skip(seconds) {
    if (!Number.isFinite(audio.duration)) {
      setStatus("Load an audio file to rewind or fast-forward.");
      return;
    }

    audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + seconds));
    updateProgress();
  }

  function renderLibrary() {
    const count = library.renderAlbums($("albums"), $("search").value);
    $("libraryCount").textContent = `${count} tape${count === 1 ? "" : "s"}`;
  }

  document.querySelectorAll("[data-view]").forEach(button => {
    button.addEventListener("click", () => navigate(button.dataset.view));
  });

  $("play").addEventListener("click", togglePlayback);
  $("stop").addEventListener("click", () => {
    generation += 1;
    audio.pause();
    if (Number.isFinite(audio.duration)) audio.currentTime = 0;
    setPlaybackState("STOPPED");
    updateProgress();
    setStatus("Stopped. Tape rewound to the beginning.");
  });
  $("previous").addEventListener("click", () => {
    const resume = !audio.paused;
    select((current + albums.length - 1) % albums.length);
    if (resume) void play();
  });
  $("next").addEventListener("click", () => next(!audio.paused));
  $("rewind").addEventListener("click", () => skip(-10));
  $("forward").addEventListener("click", () => skip(10));
  $("seek").addEventListener("input", () => {
    if (Number.isFinite(audio.duration)) {
      audio.currentTime = Number($("seek").value) / 100 * audio.duration;
    }
  });
  $("volume").addEventListener("input", () => {
    audio.volume = Number($("volume").value) / 100;
  });
  $("mute").addEventListener("click", () => {
    audio.muted = !audio.muted;
    $("mute").textContent = audio.muted ? "Unmute" : "Mute";
    $("mute").setAttribute("aria-pressed", String(audio.muted));
  });
  $("speed").addEventListener("change", () => {
    audio.playbackRate = Number($("speed").value);
  });
  $("motion").addEventListener("change", () => {
    document.body.classList.toggle("no-motion", !$("motion").checked);
  });
  $("shuffle").addEventListener("click", () => {
    shuffle = !shuffle;
    $("shuffle").textContent = `Shuffle ${shuffle ? "on" : "off"}`;
    $("shuffle").setAttribute("aria-pressed", String(shuffle));
  });
  $("repeat").addEventListener("click", () => {
    repeat = !repeat;
    $("repeat").textContent = `Repeat ${repeat ? "on" : "off"}`;
    $("repeat").setAttribute("aria-pressed", String(repeat));
  });
  $("clear").addEventListener("click", () => {
    queue = [];
    renderQueue();
  });
  $("search").addEventListener("input", renderLibrary);
  $("albums").addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const albumIndex = Number(button.dataset.albumId) - 1;
    if (!Number.isInteger(albumIndex) || !albums[albumIndex]) return;

    if (button.dataset.action === "load-tape") {
      select(albumIndex);
      navigate("player");
    } else if (button.dataset.action === "queue-tape") {
      queue.push(albumIndex);
      renderQueue();
      button.textContent = "Added ✓";
      window.setTimeout(() => {
        if (button.isConnected) button.textContent = "+ Queue";
      }, 900);
    }
  });
  $("localAudio").addEventListener("change", event => {
    const file = event.target.files[0];
    if (!file) return;

    const previousUrl = localFiles.get(current);
    if (previousUrl) URL.revokeObjectURL(previousUrl);
    localFiles.set(current, URL.createObjectURL(file));
    select(current);
    setStatus(`Attached ${file.name}. Press play.`);
    navigate("player");
    event.target.value = "";
  });

  audio.addEventListener("playing", () => {
    setPlaybackState("PLAYING");
    setStatus(`Now playing · ${albums[current].title}`);
  });
  audio.addEventListener("pause", () => {
    if (!audio.ended && playbackMode !== "NO AUDIO") {
      setPlaybackState(audio.currentTime > 0 ? "PAUSED" : "STOPPED");
    }
  });
  audio.addEventListener("waiting", () => setPlaybackState("LOADING"));
  audio.addEventListener("error", () => {
    setPlaybackState("NO AUDIO");
    setStatus(
      `Audio unavailable. Add assets/audio/track${current + 1}.mp3 or choose a local file in Settings.`
    );
  });
  audio.addEventListener("loadedmetadata", () => {
    audio.playbackRate = Number($("speed").value);
    updateProgress();
  });
  audio.addEventListener("timeupdate", updateProgress);
  audio.addEventListener("durationchange", updateProgress);
  audio.addEventListener("ended", () => {
    if (repeat) {
      audio.currentTime = 0;
      void play();
    } else if ($("autonext").checked) {
      next(true);
    } else {
      setPlaybackState("STOPPED");
      setStatus("Tape finished.");
    }
  });
  $("cover").addEventListener("error", () => {
    $("cover").style.opacity = "0.25";
    $("cover").removeAttribute("src");
  });

  document.addEventListener("keydown", event => {
    if (
      view !== "player" ||
      !(event.target instanceof Element) ||
      event.target.closest("input, select, textarea, button") ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    ) {
      return;
    }

    if (event.code === "Space") {
      event.preventDefault();
      togglePlayback();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      skip(-10);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      skip(10);
    }
  });

  window.addEventListener("beforeunload", () => {
    localFiles.forEach(url => URL.revokeObjectURL(url));
  });

  audio.volume = Number($("volume").value) / 100;
  renderLibrary();
  renderQueue();
  select(0);
})();
