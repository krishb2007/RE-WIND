# RE-WIND

Open `index.html` in a current Chrome, Edge, Safari, or Firefox browser. No server, dependencies, build tooling, or Node installation is required.

## Features

- Three sliding screens: Settings, Player, and Library.
- Import local audio tracks and optional cover art, then queue and play them in the current browser session.
- Playback controls for play/pause, stop with position preservation, ±10-second seeking, volume, mute, and eject.
- Adjustable tape warmth, playback speed/warp, lo-fi bit depth, wow, flutter, tape hiss, vinyl noise, hum, bass, mid, and treble effects.
- Search, sorting, grid/list views, and a cassette-style queue.

Demo tapes are artwork only and do not include audio. Imported audio and cover art are held in temporary browser object URLs; they are removed when the page is closed and do not survive a refresh.

## Assets

Keep the `assets/images/` folder beside `index.html`. The demo cassette covers use `case-01.webp` through `case-08.webp`; the player and settings screens use `cassette-player.webp` and `settings-controls.webp`.

## Audio effects

The settings sliders use the Web Audio API. Playback remains available without Web Audio support, but the audio effects will be unavailable. `index.html` loads the active UI from `js/app.js` and audio processing from `js/effect.js`. `js/audio.js` and `js/library.js` are optional standalone helpers and are not loaded by the current page.

The app emits `rewind:*` browser `CustomEvent`s for integrations, including playback, queue, import, setting, and navigation changes. For example:

```js
document.addEventListener("rewind:setting-change", event => {
  console.log(event.detail.name, event.detail.value);
});
```
