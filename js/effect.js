(function () {
  'use strict';

  const clamp = (value, min = 0, max = 1) =>
    Math.min(max, Math.max(min, Number.isFinite(Number(value)) ? Number(value) : min));

  const lerp = (a, b, t) => a + (b - a) * t;

  function normalizeUnit(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    if (n > 1 && n <= 100) return clamp(n / 100, 0, 1);
    return clamp(n, 0, 1);
  }

  function makeDriveCurve(amount = 1) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const k = Math.max(1, amount * 40);
    const deg = Math.PI / 180;

    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }

    return curve;
  }

  function makeNoiseBuffer(ctx, seconds = 2) {
    const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    return buffer;
  }

  function makeBitCrusher(ctx) {
    const input = ctx.createGain();
    const processor = ctx.createScriptProcessor(2048, 2, 2);
    const output = ctx.createGain();

    let bits = 16;
    let normfreq = 1;
    let mix = 0;
    let phase = 0;
    let lastL = 0;
    let lastR = 0;

    input.connect(processor);
    processor.connect(output);

    processor.onaudioprocess = event => {
      const inputBuffer = event.inputBuffer;
      const outputBuffer = event.outputBuffer;

      const inL = inputBuffer.getChannelData(0);
      const outL = outputBuffer.getChannelData(0);

      const hasR = inputBuffer.numberOfChannels > 1 && outputBuffer.numberOfChannels > 1;
      const inR = hasR ? inputBuffer.getChannelData(1) : inL;
      const outR = hasR ? outputBuffer.getChannelData(1) : outL;

      const steps = Math.max(2, Math.pow(2, bits));

      for (let i = 0; i < inL.length; i++) {
        phase += normfreq;

        if (phase >= 1) {
          phase -= 1;
          lastL = Math.round(inL[i] * steps) / steps;
          lastR = Math.round(inR[i] * steps) / steps;
        }

        outL[i] = inL[i] * (1 - mix) + lastL * mix;
        if (hasR) outR[i] = inR[i] * (1 - mix) + lastR * mix;
      }
    };

    function setAmount(value) {
      const amount = normalizeUnit(value);
      mix = amount;
      bits = Math.round(lerp(16, 4, amount));
      normfreq = lerp(1, 0.08, amount);
    }

    function setBits(value) {
      const numeric = Number(value);

      if (Number.isFinite(numeric) && numeric > 1.5 && numeric <= 24) {
        bits = Math.round(clamp(numeric, 4, 16));
        mix = clamp((16 - bits) / 12, 0, 1);
        normfreq = lerp(1, 0.08, mix);
      } else {
        setAmount(value);
      }
    }

    setAmount(0);

    return { input, output, setAmount, setBits };
  }

  function createRetroAudio(audioElement) {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextCtor) {
      console.warn('Web Audio API is not supported in this browser.');
      return {
        destroy() {},
        applyState() {},
        setSetting() {}
      };
    }

    const ctx = new AudioContextCtor();
    const source = ctx.createMediaElementSource(audioElement);

    const input = ctx.createGain();
    const master = ctx.createGain();
    master.gain.value = 1;

    // -----------------------------
    // Audio Warp
    // -----------------------------
    const warpDrive = ctx.createGain();
    const warpShaper = ctx.createWaveShaper();
    const warpHighpass = ctx.createBiquadFilter();
    const warpLowpass = ctx.createBiquadFilter();

    warpHighpass.type = 'highpass';
    warpLowpass.type = 'lowpass';

    // -----------------------------
    // Tape Warmth
    // -----------------------------
    const warmthShaper = ctx.createWaveShaper();
    const warmthLowShelf = ctx.createBiquadFilter();
    const warmthHighShelf = ctx.createBiquadFilter();

    warmthLowShelf.type = 'lowshelf';
    warmthHighShelf.type = 'highshelf';
    warmthLowShelf.frequency.value = 180;
    warmthHighShelf.frequency.value = 3600;

    // -----------------------------
    // Wow & Flutter
    // -----------------------------
    const wowFlutterDelay = ctx.createDelay(0.1);
    const delayBase = ctx.createConstantSource();
    const wowLfo = ctx.createOscillator();
    const wowDepth = ctx.createGain();
    const flutterLfo = ctx.createOscillator();
    const flutterDepth = ctx.createGain();

    wowLfo.type = 'sine';
    wowLfo.frequency.value = 0.65;

    flutterLfo.type = 'sine';
    flutterLfo.frequency.value = 7.5;

    delayBase.offset.value = 0.0055;
    wowDepth.gain.value = 0;
    flutterDepth.gain.value = 0;

    // -----------------------------
    // Lo-Fi / Bit Depth
    // -----------------------------
    const bitCrusher = makeBitCrusher(ctx);

    // -----------------------------
    // Output Tone
    // -----------------------------
    const bass = ctx.createBiquadFilter();
    const mid = ctx.createBiquadFilter();
    const treble = ctx.createBiquadFilter();

    bass.type = 'lowshelf';
    mid.type = 'peaking';
    treble.type = 'highshelf';

    bass.frequency.value = 120;
    mid.frequency.value = 1000;
    treble.frequency.value = 4500;
    mid.Q.value = 0.9;

    // -----------------------------
    // Noise buses
    // -----------------------------
    const noiseMaster = ctx.createGain();
    noiseMaster.gain.value = 1;

    // Tape hiss
    const hissSource = ctx.createBufferSource();
    hissSource.buffer = makeNoiseBuffer(ctx, 2.5);
    hissSource.loop = true;

    const hissFilter = ctx.createBiquadFilter();
    hissFilter.type = 'highpass';
    hissFilter.frequency.value = 5200;

    const hissGain = ctx.createGain();
    hissGain.gain.value = 0;

    // Vinyl noise
    const vinylSource = ctx.createBufferSource();
    vinylSource.buffer = makeNoiseBuffer(ctx, 2.5);
    vinylSource.loop = true;

    const vinylFilter = ctx.createBiquadFilter();
    vinylFilter.type = 'bandpass';
    vinylFilter.frequency.value = 1900;
    vinylFilter.Q.value = 0.7;

    const vinylNoiseGain = ctx.createGain();
    vinylNoiseGain.gain.value = 0;

    // Crackle
    const crackleNode = ctx.createScriptProcessor(2048, 1, 1);
    const crackleGain = ctx.createGain();
    crackleGain.gain.value = 0;

    crackleNode.onaudioprocess = event => {
      const out = event.outputBuffer.getChannelData(0);

      for (let i = 0; i < out.length; i++) {
        const random = Math.random();

        if (random > 0.9991) out[i] = (Math.random() * 2 - 1) * 0.7;
        else if (random > 0.9978) out[i] = (Math.random() * 2 - 1) * 0.25;
        else out[i] = (Math.random() * 2 - 1) * 0.002;
      }
    };

    // Hum
    const humFundamental = ctx.createOscillator();
    const humSecond = ctx.createOscillator();
    const humThird = ctx.createOscillator();

    humFundamental.type = 'sine';
    humSecond.type = 'sine';
    humThird.type = 'sine';

    humFundamental.frequency.value = 60;
    humSecond.frequency.value = 120;
    humThird.frequency.value = 180;

    const humGain = ctx.createGain();
    humGain.gain.value = 0;

    const humTone = ctx.createBiquadFilter();
    humTone.type = 'lowpass';
    humTone.frequency.value = 250;

    const humFundGain = ctx.createGain();
    const humSecondGain = ctx.createGain();
    const humThirdGain = ctx.createGain();

    humFundGain.gain.value = 0.8;
    humSecondGain.gain.value = 0.35;
    humThirdGain.gain.value = 0.15;

    // -----------------------------
    // Main routing
    // -----------------------------
    source.connect(input);

    input.connect(warpDrive);
    warpDrive.connect(warpShaper);
    warpShaper.connect(warpHighpass);
    warpHighpass.connect(warpLowpass);
    warpLowpass.connect(warmthLowShelf);
    warmthLowShelf.connect(warmthHighShelf);
    warmthHighShelf.connect(warmthShaper);
    warmthShaper.connect(wowFlutterDelay);
    wowFlutterDelay.connect(bitCrusher.input);
    bitCrusher.output.connect(bass);
    bass.connect(mid);
    mid.connect(treble);
    treble.connect(master);
    master.connect(ctx.destination);

    delayBase.connect(wowFlutterDelay.delayTime);
    wowLfo.connect(wowDepth);
    wowDepth.connect(wowFlutterDelay.delayTime);
    flutterLfo.connect(flutterDepth);
    flutterDepth.connect(wowFlutterDelay.delayTime);

    hissSource.connect(hissFilter);
    hissFilter.connect(hissGain);
    hissGain.connect(noiseMaster);

    vinylSource.connect(vinylFilter);
    vinylFilter.connect(vinylNoiseGain);
    vinylNoiseGain.connect(noiseMaster);

    crackleNode.connect(crackleGain);
    crackleGain.connect(noiseMaster);

    humFundamental.connect(humFundGain);
    humSecond.connect(humSecondGain);
    humThird.connect(humThirdGain);

    humFundGain.connect(humTone);
    humSecondGain.connect(humTone);
    humThirdGain.connect(humTone);
    humTone.connect(humGain);
    humGain.connect(noiseMaster);

    noiseMaster.connect(master);

    // Start constant/audio modulation sources
    delayBase.start();
    wowLfo.start();
    flutterLfo.start();
    hissSource.start();
    vinylSource.start();
    humFundamental.start();
    humSecond.start();
    humThird.start();

    const state = {
      tapeWarmth: 0,
      audioWarp: 0,
      bitDepth: 16,
      loFi: 0,
      wow: 0,
      flutter: 0,
      hissEnabled: false,
      hissIntensity: 0.35,
      vinylEnabled: false,
      vinylIntensity: 0.35,
      humEnabled: false,
      humIntensity: 0.35,
      bass: 0,
      mid: 0,
      treble: 0
    };

    // Important: resume context after a user gesture / playback
    function unlock() {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    }

    document.addEventListener('pointerdown', unlock, { passive: true });
    document.addEventListener('keydown', unlock);
    audioElement.addEventListener('play', unlock);

    function refreshWarmth() {
      const amount = normalizeUnit(state.tapeWarmth);
      const drive = lerp(1, 2.9, amount);

      warmthShaper.curve = makeDriveCurve(drive);
      warmthShaper.oversample = '4x';

      warmthLowShelf.gain.value = lerp(0, 7, amount);
      warmthHighShelf.gain.value = lerp(0, -8, amount);
    }

    function refreshWarp() {
      const amount = normalizeUnit(state.audioWarp);
      const drive = lerp(1, 4.2, amount);

      warpDrive.gain.value = lerp(1, 2.8, amount);
      warpShaper.curve = makeDriveCurve(drive);
      warpShaper.oversample = '4x';

      warpHighpass.frequency.value = lerp(20, 130, amount);
      warpLowpass.frequency.value = lerp(22000, 2600, amount);
    }

    function refreshLoFi() {
      const amount =
        state.loFi !== undefined
          ? normalizeUnit(state.loFi)
          : clamp((16 - Number(state.bitDepth || 16)) / 12, 0, 1);

      bitCrusher.setAmount(amount);
    }

    function refreshBitDepth() {
      const bits = Number(state.bitDepth);

      if (Number.isFinite(bits) && bits > 1.5 && bits <= 24) {
        bitCrusher.setBits(bits);
      } else {
        refreshLoFi();
      }
    }

    function refreshWowFlutter() {
      const wowAmount = normalizeUnit(state.wow);
      const flutterAmount = normalizeUnit(state.flutter);

      // Much more audible than before, but still musical
      delayBase.offset.value = 0.0045 + wowAmount * 0.004;
      wowDepth.gain.value = lerp(0, 0.012, wowAmount);
      flutterDepth.gain.value = lerp(0, 0.0024, flutterAmount);

      wowLfo.frequency.value = lerp(0.35, 1.15, wowAmount || 0.0001);
      flutterLfo.frequency.value = lerp(4.5, 11.5, flutterAmount || 0.0001);
    }

    function refreshNoise() {
      hissGain.gain.value = state.hissEnabled
        ? lerp(0.001, 0.025, normalizeUnit(state.hissIntensity))
        : 0;

      vinylNoiseGain.gain.value = state.vinylEnabled
        ? lerp(0.001, 0.018, normalizeUnit(state.vinylIntensity))
        : 0;

      crackleGain.gain.value = state.vinylEnabled
        ? lerp(0.002, 0.06, normalizeUnit(state.vinylIntensity))
        : 0;

      humGain.gain.value = state.humEnabled
        ? lerp(0.001, 0.04, normalizeUnit(state.humIntensity))
        : 0;
    }

    function refreshTone() {
      bass.gain.value = state.bass * 12;
      mid.gain.value = state.mid * 12;
      treble.gain.value = state.treble * 12;
    }

    function setSignedTone(key, value) {
      const n = Number(value);
      if (!Number.isFinite(n)) return;

      if (n >= -1 && n <= 1) {
        state[key] = n;
      } else {
        state[key] = clamp((n - 50) / 50, -1, 1);
      }

      refreshTone();
    }

    function updateAll() {
      refreshWarmth();
      refreshWarp();
      refreshBitDepth();
      refreshWowFlutter();
      refreshNoise();
      refreshTone();
    }

    const api = {
      audioContext: ctx,
      state,
      unlock,

      destroy() {
        try { document.removeEventListener('pointerdown', unlock); } catch {}
        try { document.removeEventListener('keydown', unlock); } catch {}
        try { audioElement.removeEventListener('play', unlock); } catch {}

        [
          hissSource,
          vinylSource,
          humFundamental,
          humSecond,
          humThird,
          wowLfo,
          flutterLfo
        ].forEach(node => {
          try { node.stop && node.stop(); } catch {}
        });

        try { delayBase.stop(); } catch {}
        try { ctx.close(); } catch {}
      },

      // Tape Warmth
      setTapeWarmth(value) {
        state.tapeWarmth = normalizeUnit(value);
        refreshWarmth();
      },
      setWarmth(value) {
        this.setTapeWarmth(value);
      },

      // Audio Warp
      setAudioWarp(value) {
        state.audioWarp = normalizeUnit(value);
        refreshWarp();
      },
      setWarp(value) {
        this.setAudioWarp(value);
      },

      // Lo-Fi / Bit Depth
      setLoFi(value) {
        state.loFi = normalizeUnit(value);
        refreshLoFi();
      },
      setBitDepth(value) {
        const numeric = Number(value);

        if (Number.isFinite(numeric) && numeric > 1.5 && numeric <= 24) {
          state.bitDepth = Math.round(clamp(numeric, 4, 16));
          bitCrusher.setBits(state.bitDepth);
        } else {
          state.bitDepth = lerp(16, 4, normalizeUnit(value));
          refreshBitDepth();
        }
      },
      setLoFiBitDepth(value) {
        this.setBitDepth(value);
      },

      // Wow & Flutter
      setWow(value) {
        state.wow = normalizeUnit(value);
        refreshWowFlutter();
      },
      setFlutter(value) {
        state.flutter = normalizeUnit(value);
        refreshWowFlutter();
      },
      setWowFlutter(wowValue, flutterValue = wowValue) {
        state.wow = normalizeUnit(wowValue);
        state.flutter = normalizeUnit(flutterValue);
        refreshWowFlutter();
      },

      // Output Tone
      setBass(value) {
        setSignedTone('bass', value);
      },
      setMid(value) {
        setSignedTone('mid', value);
      },
      setTreble(value) {
        setSignedTone('treble', value);
      },
      setOutputTone({ bass, mid, treble }) {
        if (bass !== undefined) this.setBass(bass);
        if (mid !== undefined) this.setMid(mid);
        if (treble !== undefined) this.setTreble(treble);
      },

      // Noise
      setTapeHissEnabled(value) {
        state.hissEnabled = !!value;
        refreshNoise();
      },
      setTapeHissIntensity(value) {
        state.hissIntensity = normalizeUnit(value);
        refreshNoise();
      },
      setHissEnabled(value) {
        this.setTapeHissEnabled(value);
      },
      setHissIntensity(value) {
        this.setTapeHissIntensity(value);
      },

      setVinylNoiseEnabled(value) {
        state.vinylEnabled = !!value;
        refreshNoise();
      },
      setVinylNoiseIntensity(value) {
        state.vinylIntensity = normalizeUnit(value);
        refreshNoise();
      },
      setVinylEnabled(value) {
        this.setVinylNoiseEnabled(value);
      },
      setVinylIntensity(value) {
        this.setVinylNoiseIntensity(value);
      },

      setHumEnabled(value) {
        state.humEnabled = !!value;
        refreshNoise();
      },
      setHumIntensity(value) {
        state.humIntensity = normalizeUnit(value);
        refreshNoise();
      },
      setHumLevel(value) {
        this.setHumIntensity(value);
      },
      setHum(value, intensity) {
        state.humEnabled = !!value;
        if (intensity !== undefined) {
          state.humIntensity = normalizeUnit(intensity);
        }
        refreshNoise();
      },

      setNoise(name, enabled, intensity) {
        const key = String(name || '').toLowerCase();

        if (key.includes('hiss')) {
          state.hissEnabled = !!enabled;
          if (intensity !== undefined) state.hissIntensity = normalizeUnit(intensity);
        } else if (key.includes('vinyl')) {
          state.vinylEnabled = !!enabled;
          if (intensity !== undefined) state.vinylIntensity = normalizeUnit(intensity);
        } else if (key.includes('hum')) {
          state.humEnabled = !!enabled;
          if (intensity !== undefined) state.humIntensity = normalizeUnit(intensity);
        }

        refreshNoise();
      },

      setSetting(name, value) {
        const key = String(name || '').toLowerCase();

        if (key === 'tapewarmth' || key === 'warmth') return this.setTapeWarmth(value);
        if (key === 'audiowarp' || key === 'warp') return this.setAudioWarp(value);
        if (key === 'lofi' || key === 'bitdepth') {
          return key === 'bitdepth' ? this.setBitDepth(value) : this.setLoFi(value);
        }
        if (key === 'wow') return this.setWow(value);
        if (key === 'flutter') return this.setFlutter(value);
        if (key === 'bass') return this.setBass(value);
        if (key === 'mid') return this.setMid(value);
        if (key === 'treble') return this.setTreble(value);
        if (key === 'hum') return this.setHumEnabled(!!value);
      },

      applyState(nextState = {}) {
        Object.assign(state, nextState);
        updateAll();
      }
    };

    updateAll();
    return api;
  }

  window.REWINDEffects = { createRetroAudio };
})();
