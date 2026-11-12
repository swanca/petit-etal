// Génère la musique de fond de Petit Étal (assets/sounds/music.wav) : une boucle légère et sautillante,
// entièrement synthétisée par ce script (aucun droit d'auteur tiers). Accords égrenés, basse ronde,
// petite mélodie de kalimba ; la fin se raccorde au début.
// Usage : node scripts/make-music.js
const fs = require('fs');
const path = require('path');

const RATE = 22050;
const BPM = 96;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
// Progression (deux mesures par accord), jouée deux fois : la deuxième avec une mélodie différente.
const CHORDS = [
  [43, [59, 62, 67, 69]], // Sol 6/9
  [40, [59, 62, 64, 67]], // Mi m7
  [48, [60, 64, 67, 74]], // Do add9
  [50, [57, 62, 66, 69]], // Ré
];
const LOOP = CHORDS.length * 2 * BAR * 2;
const N = Math.floor(LOOP * RATE);
const out = new Float32Array(N);

const hz = (m) => 440 * 2 ** ((m - 69) / 12);
let seed = 7;
const rand = () => (seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296;

// Ajoute un son en bouclant (ce qui dépasse la fin revient au début).
function add(at, dur, f) {
  const o = Math.floor(at * RATE);
  const len = Math.floor(dur * RATE);
  for (let i = 0; i < len; i++) out[(o + i) % N] += f(i / RATE);
}
// Piano électrique feutré : fondamentale + octave douce, attaque brève, extinction lente, léger trémolo.
const keys = (m, at, dur, v) =>
  add(at, dur + 1.5, (t) => {
    const env = Math.min(1, t / 0.012) * Math.exp(-t * 1.6) * (t > dur ? Math.exp(-(t - dur) * 4) : 1);
    const f = hz(m);
    return v * env * (Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(4 * Math.PI * f * t) * Math.exp(-t * 3)) * (1 + 0.08 * Math.sin(2 * Math.PI * 4.5 * t));
  });
// Nappe : trois voix légèrement désaccordées, entrée et sortie lentes.
const pad = (m, at, dur, v) =>
  add(at, dur + 1, (t) => {
    const env = Math.min(1, t / 1.2) * (t > dur ? Math.max(0, 1 - (t - dur)) : 1);
    const f = hz(m);
    return v * env * (Math.sin(2 * Math.PI * f * t) + Math.sin(2 * Math.PI * f * 1.003 * t) + Math.sin(2 * Math.PI * f * 0.997 * t)) / 3;
  });
const bass = (m, at, dur, v) =>
  add(at, dur + 0.4, (t) => {
    const env = Math.min(1, t / 0.03) * Math.exp(-t * 0.6) * (t > dur ? Math.exp(-(t - dur) * 8) : 1);
    return v * env * Math.sin(2 * Math.PI * hz(m) * t);
  });
// Kalimba : sinus pur + partiel aigu très bref, comme une lamelle pincée.
const kalimba = (m, at, v) =>
  add(at, 2.2, (t) => {
    const f = hz(m);
    return v * Math.min(1, t / 0.004) * (Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 2.2) + 0.3 * Math.sin(2 * Math.PI * f * 5.4 * t) * Math.exp(-t * 18));
  });

const PENTA = [71, 74, 76, 79, 81, 83, 86];
let bar = 0;
for (let round = 0; round < 2; round++)
  for (const [root, notes] of CHORDS) {
    const t0 = bar * BAR;
    bass(root, t0, BAR * 2 - 0.2, 0.32);
    for (let k = 1; k < 4; k++) bass(k % 2 ? root + 7 : root + 12, t0 + k * BAR * 0.5, BAR * 0.3, 0.16);
    for (const m of notes) pad(m, t0, BAR * 2, 0.05);
    // Accords égrenés doucement, deux fois par mesure.
    for (let k = 0; k < 4; k++) notes.forEach((m, j) => keys(m, t0 + k * BAR * 0.5 + j * 0.05, BAR * 0.45, 0.07));
    // Mélodie : quelques notes seulement, des silences pour respirer.
    let idx = Math.floor(rand() * PENTA.length);
    for (let b = 0; b < 8; b++) {
      if (rand() < (round ? 0.5 : 0.38)) continue;
      idx = Math.max(0, Math.min(PENTA.length - 1, idx + Math.floor(rand() * 3) - 1));
      kalimba(PENTA[idx], t0 + b * BEAT + (rand() < 0.3 ? BEAT / 2 : 0), 0.13);
    }
    bar += 2;
  }

// Réverbération légère (peignes en boucle) puis filtre passe-bas doux pour arrondir.
const wet = new Float32Array(N);
for (const [d, g] of [[0.0297, 0.55], [0.0371, 0.5], [0.0411, 0.48], [0.0437, 0.45]]) {
  const D = Math.floor(d * RATE * 3);
  const c = new Float32Array(N);
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < N; i++) c[i] = out[i] + g * c[(i - D + N) % N];
  for (let i = 0; i < N; i++) wet[i] += c[i] * 0.12;
}
let lp = 0;
let peak = 0;
const mixd = new Float32Array(N);
for (let pass = 0; pass < 2; pass++)
  for (let i = 0; i < N; i++) {
    lp += 0.22 * (out[i] + wet[i] - lp);
    mixd[i] = lp;
  }
for (const v of mixd) peak = Math.max(peak, Math.abs(v));

const pcm = Buffer.alloc(44 + N * 2);
pcm.write('RIFF', 0);
pcm.writeUInt32LE(36 + N * 2, 4);
pcm.write('WAVEfmt ', 8);
pcm.writeUInt32LE(16, 16);
pcm.writeUInt16LE(1, 20);
pcm.writeUInt16LE(1, 22);
pcm.writeUInt32LE(RATE, 24);
pcm.writeUInt32LE(RATE * 2, 28);
pcm.writeUInt16LE(2, 32);
pcm.writeUInt16LE(16, 34);
pcm.write('data', 36);
pcm.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) pcm.writeInt16LE(Math.round((mixd[i] / peak) * 0.6 * 32767), 44 + i * 2);
fs.writeFileSync(path.join(__dirname, '..', 'assets', 'sounds', 'music.wav'), pcm);
console.log(`music.wav : ${LOOP.toFixed(1)} s, ${(pcm.length / 1e6).toFixed(1)} Mo`);
