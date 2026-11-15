// Synthesized sound: every effect is an oscillator or filtered noise burst through
// WebAudio, so the game ships no audio files. The context is created on the first user
// gesture (browsers block audio before one); in screenshot mode nothing ever creates
// it, so the game stays silent and never errors.
export function createAudio() {
  let context = null;
  let master = null;
  let musicGain = null;
  let muted = false;
  let musicTimer = null;
  let musicStep = 0;

  // A slow minor-key bass walk under the game: one note every beat, quiet.
  const BASSLINE = [55, 0, 65.41, 0, 49, 0, 58.27, 0, 55, 0, 65.41, 0, 73.42, 65.41, 58.27, 49];

  function ensure() {
    if (context) return true;
    try {
      const Ctor = window.AudioContext ?? window.webkitAudioContext;
      if (!Ctor) return false;
      context = new Ctor();
      master = context.createGain();
      master.gain.value = 0.5;
      master.connect(context.destination);
      musicGain = context.createGain();
      musicGain.gain.value = 0.11;
      musicGain.connect(master);
    } catch {
      context = null;
      return false;
    }
    return true;
  }

  function tone({ frequency = 440, to = null, type = 'sine', duration = 0.15, volume = 0.3, when = 0 }) {
    if (!context || muted) return;
    const start = context.currentTime + when;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    if (to !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + duration);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  function noise({ duration = 0.25, volume = 0.3, frequency = 1200, when = 0 }) {
    if (!context || muted) return;
    const start = context.currentTime + when;
    const length = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = frequency;
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(start);
  }

  function musicTick() {
    if (!context || muted) return;
    const note = BASSLINE[musicStep % BASSLINE.length];
    musicStep += 1;
    if (note > 0) {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = 'triangle';
      osc.frequency.value = note;
      gain.gain.setValueAtTime(0.5, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.42);
      osc.connect(gain);
      gain.connect(musicGain);
      osc.start();
      osc.stop(context.currentTime + 0.45);
    }
  }

  return {
    /** Call from any user gesture: unlocks audio and starts the music loop. */
    unlock() {
      if (!ensure()) return;
      if (context.state === 'suspended') context.resume().catch(() => {});
      if (musicTimer === null) {
        musicTimer = window.setInterval(musicTick, 210);
      }
    },
    setMuted(value) {
      muted = value;
      if (master) master.gain.value = value ? 0 : 0.5;
    },
    isMuted() {
      return muted;
    },
    shoot() {
      tone({ frequency: 880, to: 320, type: 'square', duration: 0.07, volume: 0.1 });
    },
    hit() {
      tone({ frequency: 180, to: 90, type: 'sawtooth', duration: 0.08, volume: 0.16 });
    },
    explode(big = false) {
      noise({ duration: big ? 0.5 : 0.25, volume: big ? 0.5 : 0.28, frequency: big ? 700 : 1400 });
      tone({ frequency: big ? 120 : 200, to: 40, type: 'sine', duration: big ? 0.5 : 0.25, volume: 0.35 });
    },
    hurt() {
      tone({ frequency: 220, to: 60, type: 'sawtooth', duration: 0.25, volume: 0.3 });
      noise({ duration: 0.15, volume: 0.2, frequency: 900 });
    },
    pickup() {
      tone({ frequency: 660, type: 'sine', duration: 0.09, volume: 0.22 });
      tone({ frequency: 990, type: 'sine', duration: 0.12, volume: 0.22, when: 0.07 });
    },
    dash() {
      noise({ duration: 0.18, volume: 0.14, frequency: 2400 });
    },
    bomb() {
      noise({ duration: 0.7, volume: 0.5, frequency: 500 });
      tone({ frequency: 90, to: 30, type: 'sine', duration: 0.7, volume: 0.45 });
    },
    waveClear() {
      [523, 659, 784].forEach((f, i) => tone({ frequency: f, type: 'triangle', duration: 0.22, volume: 0.22, when: i * 0.09 }));
    },
    boss() {
      tone({ frequency: 110, to: 55, type: 'sawtooth', duration: 0.6, volume: 0.3 });
      tone({ frequency: 116, to: 58, type: 'sawtooth', duration: 0.6, volume: 0.3, when: 0.05 });
    },
    gameOver() {
      [392, 311, 233, 175].forEach((f, i) => tone({ frequency: f, type: 'triangle', duration: 0.4, volume: 0.22, when: i * 0.18 }));
    },
  };
}
