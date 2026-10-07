const soundAssets = {
  kick: "sounds/kick.wav",
  snare: "sounds/snare.wav",
  hihat: "sounds/hihat.wav",
  tom: "sounds/tom.wav",
  crash: "sounds/crash.wav"
};

const audioEngine = {
  play(soundId) {
    const asset = soundAssets[soundId];

    if (!asset) {
      console.warn(`Unknown sound: ${soundId}`);
      return;
    }

    const audio = new Audio(asset);

    audio.addEventListener("ended", () => {
      audio.remove();
    }, { once: true });

    audio.play().catch((error) => {
      console.warn(`Unable to play sound: ${soundId}`, error);
    });
  }
};