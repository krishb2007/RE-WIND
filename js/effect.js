(() => {
  "use strict";

  const defaults = {
    warmth: 0,
    warp: 0.5,
    lofi: 0,
    wow: 0,
    flutter: 0,
    hiss: 0,
    vinyl: 0,
    hum: 0,
    bass: 0.5,
    mid: 0.5,
    treble: 0.5,
  };

  function createRetroAudio(audioElement) {
    if (!(audioElement instanceof HTMLMediaElement)) {
      throw new TypeError("Pass the player's existing audio element.");
    }

    const values = { ...defaults };
    let context;
    let source;
    let nodes;
    let isPlaying = false;

    function initialize() {
      if (context) return;

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error("This browser does not support Web Audio effects.");
      }

      const nextContext = new AudioContextClass();
      const input = nextContext.createGain();
      const warmth = nextContext.createBiquadFilter();
      const warmthCutoff = nextContext.createBiquadFilter();
      const bass = nextContext.createBiquadFilter();
      const mid = nextContext.createBiquadFilter();
      const treble = nextContext.createBiquadFilter();
      const bitCrusher = nextContext.createWaveShaper();
      const output = nextContext.createGain();

      warmth.type = "lowshelf";
      warmth.frequency.value = 180;
      warmthCutoff.type = "lowpass";
      warmthCutoff.frequency.value = 18000;
      bass.type = "lowshelf";
      bass.frequency.value = 130;
      mid.type = "peaking";
      mid.frequency.value = 1000;
      mid.Q.value = 0.8;
      treble.type = "highshelf";
      treble.frequency.value = 7500;
      bitCrusher.oversample = "2x";

      const delay = nextContext.createDelay(0.05);
      const wowOscillator = nextContext.createOscillator();
      const flutterOscillator = nextContext.createOscillator();
      const wowDepth = nextContext.createGain();
      const flutterDepth = nextContext.createGain();
      const wowMix = nextContext.createGain();
      delay.delayTime.value = 0.02;
      wowOscillator.frequency.value = 0.35;
      flutterOscillator.frequency.value = 5.5;

      const noiseBuffer = nextContext.createBuffer(
        1,
        nextContext.sampleRate,
        nextContext.sampleRate
      );
      const noiseSamples = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseSamples.length; i++) {
        noiseSamples[i] = Math.random() * 2 - 1;
      }

      const noiseSource = nextContext.createBufferSource();
      const hissFilter = nextContext.createBiquadFilter();
      const vinylFilter = nextContext.createBiquadFilter();
      const hissGain = nextContext.createGain();
      const vinylGain = nextContext.createGain();
      const humOscillator = nextContext.createOscillator();
      const humGain = nextContext.createGain();

      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;
      hissFilter.type = "highpass";
      hissFilter.frequency.value = 3200;
      vinylFilter.type = "bandpass";
      vinylFilter.frequency.value = 1800;
      vinylFilter.Q.value = 0.8;
      humOscillator.type = "sine";
      humOscillator.frequency.value = 60;

      input.connect(warmth);
      input.connect(delay);
      delay.connect(wowMix);
      wowMix.connect(warmth);
      warmth.connect(warmthCutoff);
      warmthCutoff.connect(bass);
      bass.connect(mid);
      mid.connect(treble);
      treble.connect(bitCrusher);
      bitCrusher.connect(output);
      output.connect(nextContext.destination);

      wowOscillator.connect(wowDepth);
      flutterOscillator.connect(flutterDepth);
      wowDepth.connect(delay.delayTime);
      flutterDepth.connect(delay.delayTime);

      noiseSource.connect(hissFilter);
      hissFilter.connect(hissGain);
      hissGain.connect(output);
      noiseSource.connect(vinylFilter);
      vinylFilter.connect(vinylGain);
      vinylGain.connect(output);
      humOscillator.connect(humGain);
      humGain.connect(output);

      const mediaSource = nextContext.createMediaElementSource(audioElement);
      mediaSource.connect(input);
      wowOscillator.start();
      flutterOscillator.start();
      noiseSource.start();
      humOscillator.start();

      context = nextContext;
      source = mediaSource;
      nodes = {
        warmth,
        warmthCutoff,
        bass,
        mid,
        treble,
        bitCrusher,
        delay,
        wowDepth,
        flutterDepth,
        wowMix,
        hissGain,
        vinylGain,
        humGain,
      };
      update();
    }

    function setParam(param, value) {
      if (!context) return;
      param.setTargetAtTime(value, context.currentTime, 0.025);
    }

    function createQuantizationCurve(amount) {
      if (amount < 0.01) return null;

      const steps = Math.round(65536 * Math.pow(32 / 65536, amount));
      const curve = new Float32Array(4096);
      for (let i = 0; i < curve.length; i++) {
        const sample = (i * 2) / (curve.length - 1) - 1;
        curve[i] = Math.round(sample * steps) / steps;
      }
      return curve;
    }

    function update() {
      if (!context || !nodes) return;

      setParam(nodes.warmth.gain, values.warmth * 4);
      setParam(
        nodes.warmthCutoff.frequency,
        18000 * Math.pow(8500 / 18000, values.warmth)
      );
      setParam(nodes.bass.gain, (values.bass - 0.5) * 14);
      setParam(nodes.mid.gain, (values.mid - 0.5) * 12);
      setParam(nodes.treble.gain, (values.treble - 0.5) * 14);
      nodes.bitCrusher.curve = createQuantizationCurve(values.lofi);
      setParam(nodes.wowDepth.gain, values.wow * 0.0025);
      setParam(nodes.flutterDepth.gain, values.flutter * 0.00055);
      setParam(nodes.wowMix.gain, (values.wow + values.flutter) * 0.06);
      setParam(nodes.hissGain.gain, isPlaying ? values.hiss * 0.018 : 0);
      setParam(nodes.vinylGain.gain, isPlaying ? values.vinyl * 0.009 : 0);
      setParam(nodes.humGain.gain, isPlaying ? values.hum * 0.004 : 0);
      audioElement.playbackRate = 0.75 + values.warp * 0.5;
    }

    async function unlock() {
      initialize();
      if (context.state === "suspended") {
        await context.resume();
      }
    }

    function set(name, value) {
      if (!Object.hasOwn(defaults, name) || !Number.isFinite(value)) {
        throw new TypeError("Unknown effect or invalid effect value.");
      }

      values[name] = Math.max(0, Math.min(1, value));
      update();
    }

    function setPlaying(playing) {
      isPlaying = Boolean(playing);
      update();
    }

    audioElement.addEventListener("playing", () => setPlaying(true));
    audioElement.addEventListener("pause", () => setPlaying(false));
    audioElement.addEventListener("ended", () => setPlaying(false));

    return {
      unlock,
      set,
      setPlaying,
      get values() {
        return { ...values };
      },
      get available() {
        return Boolean(window.AudioContext || window.webkitAudioContext);
      },
    };
  }

  window.REWINDEffects = { createRetroAudio };
})();
