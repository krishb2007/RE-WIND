# RE-WIND — Simplified Cassette UI (Member 1)

Open `index.html` in Chrome, Safari, or Firefox. No server, dependencies, build tooling, or Node installation needed.

**Included:** Three sliding screens (Settings ← Player → Library), cassette-player appearance and clickable button zones, cassette queue displayed as aligned physical cases, four-across library with hover lift, search and sorting, and Import Music popup with per-file song names + optional cover art. Real playback works for audio files imported in this browser session (Play/Pause/Stop/±10s/Eject). The demo cassettes do not contain audio.

## Put it in GitHub

Upload **`index.html` and the entire `assets/` folder together** at the repository root. You can edit `index.html` on GitHub's website. Keep the asset names/paths unchanged.

## Collaboration hooks

The frontend emits browser `document` CustomEvents with names like `rewind:play`, `rewind:pause`, `rewind:stop`, `rewind:eject`, `rewind:queue-change`, `rewind:library-import`, `rewind:setting-change`, and `rewind:navigate`. Teammates can listen using `document.addEventListener('rewind:play', e => { ... })`, or replace the demo handlers with their own audio engine, library manager and audio effects.

Settings controls currently change a visual readout; wire `rewind:setting-change` into Member 5's effects processing later. Local imported audio uses object URLs, so it does not survive refreshing the page. Persistent music storage would need separate browser database or a backend.

The device and album visuals are edited assets of the team's agreed mockups. All click areas, dialogs, text, queue, and navigation are real editable HTML/CSS/JS.
