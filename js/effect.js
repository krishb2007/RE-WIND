// src/retroAudio.js
// Use with the project's existing HTML <audio> element.

const instances = new WeakMap();

export function createRetroAudio(audioElement) {
  if (!(audioElement instanceof HTMLMediaElement)) {
    throw new Error("Pass the player's existing <audio> element.");
  }

  // A media element can only have one Web Audio source.
  if (instances.has(audioElement)) return instances.get(audioElement);

  let context;
  let source;
  let clean;
  let colored;
  let effects;
  let highPass;
  let lowPass;
  let compressor;
  let lastSeek = 0;

  const listeners = new Set();

  function readPreference(key, fallback) {
    try {
      const saved = localStorage.getItem(key);
      return saved === null ? fallback : saved === "true";
    } catch {
      return fallback;
    }
  }

  let retroEnabled = readPreference("rewind-retro", false);
  let effectsEnabled = readPreference("rewind-effects", true);

  function savePreference(key, value) {
    try {
      localStorage.setItem(key, String(value));
    } catch {
      // Audio still works if browser storage is unavailable.
    }
  }

  function notify() {
    listeners.forEach((listener) => listener());
  }

  function initialize() {
    if (context) return;

    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      throw new Error("This browser does not support Web Audio.");
    }

    context = new AudioContextClass();

    clean = context.createGain();
    colored = context.createGain();
    effects = context.createGain();

    highPass = context.createBiquadFilter();
    highPass.type = "highpass";
    highPass.frequency.value = 150;
    highPass.Q.value = 0.7;

    lowPass = context.createBiquadFilter();
    lowPass.type = "lowpass";
    lowPass.frequency.value = 5000;
    lowPass.Q.value = 0.7;

    compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -22;
    compressor.knee.value = 20;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.01;
    compressor.release.value = 0.18;

    clean.gain.value = retroEnabled ? 0 : 1;
    colored.gain.value = retroEnabled ? 0.85 : 0;
    effects.gain.value = effectsEnabled ? 0.22 : 0;

    clean.connect(context.destination);
    colored.connect(context.destination);
    effects.connect(context.destination);

    source = context.createMediaElementSource(audioElement);

    // Clean route.
    source.connect(clean);

    // Retro route.
    source.connect(highPass);
    highPass.connect(lowPass);
    lowPass.connect(compressor);
    compressor.connect(colored);
  }

  // Call from a click/tap handler so browsers allow sound.
  async function unlock() {
    initialize();

    if (context.state === "suspended") {
      await context.resume();
    }
  }

  function fade(node, value) {
    if (!context || !node) return;

    const now = context.currentTime;
    node.gain.cancelScheduledValues(now);
    node.gain.setValueAtTime(node.gain.value, now);
    node.gain.linearRampToValueAtTime(value, now + 0.04);
  }

  function setRetro(enabled) {
    retroEnabled = Boolean(enabled);
    savePreference("rewind-retro", retroEnabled);

    fade(clean, retroEnabled ? 0 : 1);
    fade(colored, retroEnabled ? 0.85 : 0);

    notify();
  }

  function setEffects(enabled) {
    effectsEnabled = Boolean(enabled);
    savePreference("rewind-effects", effectsEnabled);
    fade(effects, effectsEnabled ? 0.22 : 0);
    notify();
  }

  function tone({
    frequency = 400,
    endFrequency = frequency,
    duration = 0.05,
    volume = 0.3,
    delay = 0,
    type = "triangle",
  } = {}) {
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(1, endFrequency),
      start + duration
    );

    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(volume, start + 0.003);
    envelope.gain.exponentialRampToValueAtTime(
      0.0001,
      start + duration
    );

    oscillator.connect(envelope);
    envelope.connect(effects);

    oscillator.start(start);
    oscillator.stop(start + duration + 0.01);

    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
    };
  }

  function noise({
    duration = 0.05,
    volume = 0.3,
    frequency = 1500,
    delay = 0,
    type = "bandpass",
  } = {}) {
    const start = context.currentTime + delay;
    const buffer = context.createBuffer(
      1,
      Math.ceil(context.sampleRate * duration),
      context.sampleRate
    );

    const samples = buffer.getChannelData(0);

    for (let i = 0; i < samples.length; i++) {
      samples[i] = Math.random() * 2 - 1;
    }

    const player = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();

    player.buffer = buffer;

    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = 0.8;

    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(volume, start + 0.003);
    envelope.gain.exponentialRampToValueAtTime(
      0.0001,
      start + duration
    );

    player.connect(filter);
    filter.connect(envelope);
    envelope.connect(effects);

    player.start(start);

    player.onended = () => {
      player.disconnect();
      filter.disconnect();
      envelope.disconnect();
    };
  }

  function click(delay = 0) {
    noise({
      duration: 0.025,
      frequency: 2200,
      volume: 0.5,
      delay,
    });

    tone({
      frequency: 190,
      endFrequency: 85,
      duration: 0.035,
      volume: 0.25,
      delay,
    });
  }

  async function playEffect(name = "click") {
    if (!effectsEnabled) return;

    try {
      await unlock();

      // The preference may change while the context resumes.
      if (!effectsEnabled) return;

      switch (name) {
        case "play":
          click();
          tone({
            frequency: 90,
            endFrequency: 220,
            duration: 0.16,
            volume: 0.12,
            delay: 0.03,
          });
          break;

        case "pause":
          click();
          tone({
            frequency: 180,
            endFrequency: 65,
            duration: 0.1,
            volume: 0.1,
          });
          break;

        case "eject":
          click();
          noise({
            duration: 0.42,
            frequency: 850,
            volume: 0.25,
            delay: 0.04,
          });
          tone({
            frequency: 180,
            endFrequency: 95,
            duration: 0.4,
            volume: 0.13,
            delay: 0.04,
            type: "sawtooth",
          });
          click(0.43);
          break;

        case "insert":
          noise({
            duration: 0.32,
            frequency: 650,
            volume: 0.25,
          });
          tone({
            frequency: 100,
            endFrequency: 190,
            duration: 0.3,
            volume: 0.12,
            type: "sawtooth",
          });
          click(0.3);
          tone({
            frequency: 65,
            endFrequency: 260,
            duration: 0.35,
            volume: 0.08,
            delay: 0.34,
          });
          break;

        case "seek": {
          const now = context.currentTime;
          if (now - lastSeek < 0.12) return;
          lastSeek = now;

          noise({
            duration: 0.055,
            frequency: 3200,
            volume: 0.2,
          });
          tone({
            frequency: 900,
            endFrequency: 350,
            duration: 0.045,
            volume: 0.08,
          });
          break;
        }

        default:
          click();
      }
    } catch (error) {
      // Sound effect failures must not stop the player controls.
      console.warn("RE-WIND sound effect unavailable:", error);
    }
  }

  function mountControls(container) {
    const wrapper = document.createElement("div");
    wrapper.style.cssText =
      "display:flex;gap:10px;flex-wrap:wrap;align-items:center";

    const retroButton = document.createElement("button");
    const effectsButton = document.createElement("button");

    for (const button of [retroButton, effectsButton]) {
      button.type = "button";
      button.style.cssText = `
        padding:10px 14px;
        border:1px solid #777;
        border-radius:6px;
        background:#242424;
        color:#fff;
        font:inherit;
        cursor:pointer;
      `;
    }

    function render() {
      retroButton.textContent =
        `Retro mode: ${retroEnabled ? "ON" : "OFF"}`;
      effectsButton.textContent =
        `Sound effects: ${effectsEnabled ? "ON" : "OFF"}`;

      retroButton.setAttribute("aria-pressed", String(retroEnabled));
      effectsButton.setAttribute("aria-pressed", String(effectsEnabled));
    }

    retroButton.addEventListener("click", async () => {
      try {
        await unlock();
        setRetro(!retroEnabled);
        void playEffect("click");
      } catch (error) {
        console.warn("RE-WIND retro mode unavailable:", error);
      }
    });

    effectsButton.addEventListener("click", () => {
      setEffects(!effectsEnabled);
      if (effectsEnabled) void playEffect("click");
    });

    listeners.add(render);
    render();

    wrapper.append(retroButton, effectsButton);
    container.append(wrapper);

    // Call when a component unmounts.
    return () => {
      listeners.delete(render);
      wrapper.remove();
    };
  }

  const api = {
    unlock,
    setRetro,
    setEffects,
    playEffect,
    mountControls,
    get retroEnabled() {
      return retroEnabled;
    },
    get effectsEnabled() {
      return effectsEnabled;
    },
  };

  instances.set(audioElement, api);
  return api;
}
