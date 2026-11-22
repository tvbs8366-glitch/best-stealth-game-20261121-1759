// Synthesised sound effects: every sound is built with WebAudio oscillators,
// so the game ships no audio files. The context starts on the first user
// gesture (browsers block audio before one); until then calls are silent.

export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;

  function ensureContext() {
    if (context) return true;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return false;
      context = new AudioContextClass();
      master = context.createGain();
      master.gain.value = 0.25;
      master.connect(context.destination);
    } catch {
      return false;
    }
    return true;
  }

  // One short tone: frequency slides from `from` to `to` over `seconds`.
  function tone(from, to, seconds, kind, loudness, when = 0) {
    if (muted || !ensureContext() || context.state === 'suspended') return;
    try {
      const start = context.currentTime + when;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = kind;
      oscillator.frequency.setValueAtTime(from, start);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + seconds);
      gain.gain.setValueAtTime(loudness, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + seconds);
      oscillator.connect(gain);
      gain.connect(master);
      oscillator.start(start);
      oscillator.stop(start + seconds + 0.02);
    } catch {
      // A sound failing must never break the game.
    }
  }

  return {
    unlock() {
      if (ensureContext() && context.state === 'suspended') context.resume().catch(() => {});
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    playFootstep(sneaking) {
      tone(sneaking ? 120 : 170, 90, 0.07, 'triangle', sneaking ? 0.12 : 0.22);
    },
    playPickup() {
      tone(660, 660, 0.09, 'sine', 0.5);
      tone(880, 880, 0.12, 'sine', 0.5, 0.08);
      tone(1320, 1320, 0.16, 'sine', 0.4, 0.16);
    },
    playAlertSting() {
      tone(220, 440, 0.28, 'sawtooth', 0.35);
      tone(233, 466, 0.28, 'sawtooth', 0.3, 0.05);
    },
    playSuspicious() {
      tone(330, 262, 0.22, 'triangle', 0.35);
    },
    playCaught() {
      tone(392, 98, 0.6, 'sawtooth', 0.45);
      tone(196, 49, 0.7, 'square', 0.25, 0.1);
    },
    playWin() {
      tone(523, 523, 0.14, 'sine', 0.5);
      tone(659, 659, 0.14, 'sine', 0.5, 0.13);
      tone(784, 784, 0.14, 'sine', 0.5, 0.26);
      tone(1047, 1047, 0.3, 'sine', 0.5, 0.39);
    },
    playDoorUnlock() {
      tone(440, 660, 0.2, 'sine', 0.4);
      tone(660, 880, 0.2, 'sine', 0.35, 0.15);
    },
  };
}
