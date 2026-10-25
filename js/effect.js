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
      const crusherTone = nextContext.createBiquadFilter();
      crusherTone.type = "lowpass";
      crusherTone.frequency.value = 20000;
      const output = nextContext.createGain();
      const limiter = nextContext.createDynamicsCompressor();
      limiter.threshold.value = -6;
      limiter.knee.value = 6;
      limiter.ratio.value = 12;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.14;

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
      const humOvertone = nextContext.createOscillator();
      const humOvertone2 = nextContext.createOscillator();
      const humOvertoneGain = nextContext.createGain();
      const humOvertone2Gain = nextContext.createGain();
      humOvertone.type = humOvertone2.type = "sine";
      humOvertone.frequency.value = 120;
      humOvertone2.frequency.value = 180;
      humOvertoneGain.gain.value = 0.38;
      humOvertone2Gain.gain.value = 0.16;

      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;
      hissFilter.type = "highpass";
      hissFilter.frequency.value = 3200;
      vinylFilter.type = "bandpass";
      vinylFilter.frequency.value = 1800;
      vinylFilter.Q.value = 0.8;
      humOscillator.type = "sine";
      humOscillator.frequency.value = 60;

      // Modulate the entire signal, rather than a quiet parallel copy.
      input.connect(delay);
      delay.connect(warmth);
      warmth.connect(warmthCutoff);
      warmthCutoff.connect(bass);
      bass.connect(mid);
      mid.connect(treble);
      treble.connect(bitCrusher);
      bitCrusher.connect(crusherTone);
      crusherTone.connect(output);
      output.connect(limiter);
      limiter.connect(nextContext.destination);

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
      humOvertone.connect(humOvertoneGain);
      humOvertone2.connect(humOvertone2Gain);
      humOvertoneGain.connect(humGain);
      humOvertone2Gain.connect(humGain);
      humGain.connect(output);

      const mediaSource = nextContext.createMediaElementSource(audioElement);
      mediaSource.connect(input);
      // Vintage tape warp shifts pitch along with tape speed.
      if ("preservesPitch" in audioElement) audioElement.preservesPitch = false;
      if ("webkitPreservesPitch" in audioElement) audioElement.webkitPreservesPitch = false;
      wowOscillator.start();
      flutterOscillator.start();
      noiseSource.start();
      humOscillator.start();
      humOvertone.start();
      humOvertone2.start();

      context = nextContext;
      source = mediaSource;
      nodes = {
        warmth,
        warmthCutoff,
        bass,
        mid,
        treble,
        bitCrusher,
        crusherTone,
        delay,
        wowDepth,
        flutterDepth,
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
      if (amount < 0.005) return null;
      // The low end of the knob is subtle; the maximum is unmistakably 2-bit.
      const bits = Math.max(2, Math.round(16 - 14 * Math.pow(amount, 0.65)));
      const levels = Math.pow(2, bits) - 1;
      const curve = new Float32Array(8192);
      for (let i = 0; i < curve.length; i++) {
        const sample = (i * 2) / (curve.length - 1) - 1;
        curve[i] = (Math.round((sample + 1) * 0.5 * levels) / levels) * 2 - 1;
      }
      return curve;
    }

    function update() {
      if (!context || !nodes) return;

      setParam(nodes.warmth.gain, values.warmth * 9);
      setParam(
        nodes.warmthCutoff.frequency,
        18000 * Math.pow(4200 / 18000, values.warmth)
      );
      setParam(nodes.bass.gain, (values.bass - 0.5) * 24);
      setParam(nodes.mid.gain, (values.mid - 0.5) * 24);
      setParam(nodes.treble.gain, (values.treble - 0.5) * 24);
      nodes.bitCrusher.curve = createQuantizationCurve(values.lofi);
      setParam(
        nodes.crusherTone.frequency,
        20000 * Math.pow(1400 / 20000, values.lofi)
      );
      setParam(nodes.wowDepth.gain, values.wow * 0.009);
      setParam(nodes.flutterDepth.gain, values.flutter * 0.0018);
      setParam(nodes.hissGain.gain, isPlaying ? values.hiss * 0.045 : 0);
      setParam(nodes.vinylGain.gain, isPlaying ? values.vinyl * 0.035 : 0);
      setParam(nodes.humGain.gain, isPlaying && values.hum > 0
        ? 0.004 + values.hum * 0.047 : 0);
      const warpRate = values.warp < 0.5
        ? 1 - (0.5 - values.warp) * 0.76
        : 1 + (values.warp - 0.5) * 0.96;
      if (Math.abs(audioElement.playbackRate - warpRate) > 0.001) {
        audioElement.playbackRate = warpRate;
      }
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
