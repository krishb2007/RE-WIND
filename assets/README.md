<div align="center">

# RE-WIND

### MUSIC LIVES ON.

**Your music. Your cassette. Your sound.**

*A retro-inspired music player that brings the feel of physical audio back to the browser.*

**Built at MRUHacks** · [View the project on GitHub](https://github.com/krishb2007/RE-WIND)

</div>

---

## The idea

Music has never been easier to access, but listening can feel less personal than it used to. RE-WIND brings back some of the ritual: choosing a tape, loading it into a player, turning the knobs, and making the sound your own.

It's a browser-based music player with a tactile cassette-deck interface and analog-inspired audio effects. **RE-WIND starts with an empty library**: you bring your own audio files and build your own collection.

## Features

### 📼 A player you can *feel*
- Cassette-deck interface with physical-style playback controls and animated details.
- Play, pause, stop, eject, and move between tracks in an imported cassette or mixtape.
- Rewind and fast-forward within a track.
- Drag a cassette from your collection into the player to load it.
- Adjustable volume, with optional mechanical cassette sound effects.

### 💿 Your own music library
- Import audio files from your device—no preloaded songs or account required.
- Group multiple tracks into a tape/mixtape and name each song.
- Add optional cover art, or use the built-in artwork.
- Search, sort, and switch between grid and list views.
- Add cassettes to the playback queue and remove them when you want.

### 🎚️ Shape the sound
Experiment with analog-inspired effects in the **Settings** screen:

| Control | What it changes |
| --- | --- |
| **Tape Warmth** | Softer highs and a warmer tonal character |
| **Audio Warp** | Tape-speed-style playback changes |
| **Lo-Fi / Bit Depth** | Digital degradation and gritty texture |
| **Wow & Flutter** | Slow and fast pitch/speed fluctuations |
| **Tape Hiss, Vinyl Noise & Hum** | Adjustable background imperfections |
| **Bass, Mid & Treble** | Three-band tone shaping |

Switch between **light and dark themes** to match the mood.

## Getting started

### Use the app

1. Open RE-WIND in your browser.
2. Select **Library → Import**.
3. Add one or more audio files. Optionally name the tape and choose its cover image.
4. Add the cassette to your queue or drag it into the player.
5. Press **Play**, then open **Settings** to experiment with the sound.

> **Note:** Audio support depends on your browser and the file format. Common formats such as MP3, WAV, M4A, and OGG may be supported.

### Run locally

RE-WIND is a static web app built with HTML, CSS, and JavaScript. **No build step or package installation is required.**

```bash
git clone https://github.com/krishb2007/RE-WIND.git
cd RE-WIND
python -m http.server 8000
```

Open **http://localhost:8000** in your browser. If you do not have Python installed, you can use another local static-file server.

## Tech stack

- **HTML5 & CSS3** — interface, responsive layout, and physical-inspired controls.
- **Vanilla JavaScript** — library management, navigation, interaction, and playback.
- **Web Audio API** — sound shaping and cassette-style effects.
- **Browser File API / object URLs** — playing audio files selected on your device.

### Project structure

```text
RE-WIND/
├── index.html             # Main app interface
├── js/
│   ├── app.js             # Player, library UI, queue, and interactions
│   ├── effect.js          # Web Audio effects processing
│   └── cassette-sfx.js    # Mechanical cassette sound effects
└── assets/
    └── images/            # Player and cassette visuals
```

The repository also contains supporting scripts and assets as the project evolves.

## A note on your music

RE-WIND does **not** ship with commercial music or an online music catalogue. The app uses audio files **you select locally**; the current import flow creates temporary browser URLs rather than uploading those files to a music server.

Imported cassettes and tracks are held in memory for the current session, so **you may need to import them again after reloading the page**. Keep your original audio files on your device.

Please use audio that you own or have permission to play.

## Why we built it

RE-WIND is a small tribute to the physical side of listening: album art, cassettes, knobs, imperfections, and the feeling of putting on a record or tape on purpose.

We wanted to make listening to digital music feel like an experience—not just pressing a play button.

---

<div align="center">

**RE-WIND — MUSIC LIVES ON.**

*Made for MRUHacks.*

</div>
