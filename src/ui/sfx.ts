// Sons, ambiance et vibrations. Les lecteurs sont créés au premier geste du joueur (les navigateurs
// bloquent l'audio avant) ; plusieurs lecteurs par son fréquent pour pouvoir les enchaîner sans coupure.
// Les fichiers viennent de packs libres (Kenney CC0, Cozy Farm SFX CC-BY, OpenGameArt) : voir LICENCES.md
// et scripts/make-sounds.js.
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const SOURCES = {
  lift: require('../../assets/sounds/lift.mp3'),
  drop: require('../../assets/sounds/drop.mp3'),
  pop: require('../../assets/sounds/pop.mp3'),
  merge0: require('../../assets/sounds/merge0.mp3'),
  merge1: require('../../assets/sounds/merge1.mp3'),
  merge2: require('../../assets/sounds/merge2.mp3'),
  merge3: require('../../assets/sounds/merge3.mp3'),
  merge4: require('../../assets/sounds/merge4.mp3'),
  merge5: require('../../assets/sounds/merge5.mp3'),
  rare: require('../../assets/sounds/rare.mp3'),
  found: require('../../assets/sounds/found.mp3'),
  coin: require('../../assets/sounds/coin.mp3'),
  order: require('../../assets/sounds/order.mp3'),
  buy: require('../../assets/sounds/buy.mp3'),
  boost: require('../../assets/sounds/boost.mp3'),
  chest: require('../../assets/sounds/chest.mp3'),
  click: require('../../assets/sounds/click.mp3'),
  open: require('../../assets/sounds/open.mp3'),
  close: require('../../assets/sounds/close.mp3'),
  error: require('../../assets/sounds/error.mp3'),
  poor: require('../../assets/sounds/poor.mp3'),
  hit: require('../../assets/sounds/hit.mp3'),
  boss: require('../../assets/sounds/boss.mp3'),
  flee: require('../../assets/sounds/flee.mp3'),
  levelup: require('../../assets/sounds/levelup.mp3'),
  quest: require('../../assets/sounds/quest.mp3'),
  daily: require('../../assets/sounds/daily.mp3'),
};
export type Sound = keyof typeof SOURCES;
// Les fichiers sont déjà adoucis et mis à niveau (scripts/make-sounds.js) : on reste un peu sous le maximum.
const VOLUME: Partial<Record<Sound, number>> = { lift: 0.6, drop: 0.7, click: 0.7, open: 0.6, close: 0.6, error: 0.7 };
const DEFAULT_VOL = 0.85;
const VOICES: Partial<Record<Sound, number>> = { pop: 3, drop: 2, lift: 2, coin: 3, hit: 3, click: 2, merge0: 2, merge1: 2, merge2: 2 };
/** Jingles : la musique baisse le temps qu'ils passent. */
const JINGLE: Partial<Record<Sound, number>> = { levelup: 1600, quest: 1600, daily: 1600, boss: 1700, flee: 1300, order: 700, rare: 800 };

const MUSIC_VOL = 0.22;
const AMBIENCE_VOL = 0.4;

const players: Partial<Record<Sound, AudioPlayer[]>> = {};
const turn: Partial<Record<Sound, number>> = {};
let ready = false;
let enabled = true;
let musicOn = true;
let paused = false;
let music: AudioPlayer | null = null;
let ambience: AudioPlayer | null = null;
let duckTimer: ReturnType<typeof setTimeout> | null = null;

function init() {
  if (ready) return;
  ready = true;
  try {
    setAudioModeAsync({ playsInSilentMode: Platform.OS !== 'ios', interruptionMode: 'mixWithOthers' }).catch(() => {});
    (Object.keys(SOURCES) as Sound[]).forEach((n) => {
      players[n] = Array.from({ length: VOICES[n] ?? 1 }, () => createAudioPlayer(SOURCES[n]));
    });
  } catch {}
}

function duck(ms: number) {
  if (!music) return;
  try {
    music.volume = MUSIC_VOL * 0.35;
    if (duckTimer) clearTimeout(duckTimer);
    duckTimer = setTimeout(() => {
      if (music) music.volume = MUSIC_VOL;
    }, ms);
  } catch {}
}

export function play(name: Sound) {
  if (!enabled) return;
  try {
    init();
    const list = players[name];
    if (!list?.length) return;
    const i = ((turn[name] ?? 0) + 1) % list.length;
    turn[name] = i;
    const p = list[i];
    p.volume = VOLUME[name] ?? DEFAULT_VOL;
    p.seekTo(0);
    p.play();
    const j = JINGLE[name];
    if (j) duck(j);
  } catch {}
}

/** Fusion : la note monte à chaque fusion enchaînée (combo 0 → 5). */
export function playMerge(combo: number) {
  play(`merge${Math.max(0, Math.min(5, combo))}` as Sound);
}

/** Boucles de fond : musique (réglage « musique ») et ambiance du marché (suit le réglage « sons »). */
function refreshLoops() {
  try {
    if (musicOn && !paused) {
      if (!music) {
        music = createAudioPlayer(require('../../assets/sounds/music.mp3'));
        music.loop = true;
        music.volume = MUSIC_VOL;
      }
      music.play();
    } else music?.pause();
    if (enabled && !paused) {
      if (!ambience) {
        ambience = createAudioPlayer(require('../../assets/sounds/ambience.mp3'));
        ambience.loop = true;
        ambience.volume = AMBIENCE_VOL;
      }
      ambience.play();
    } else ambience?.pause();
  } catch {}
}

let started = false;
/** À appeler au premier geste du joueur : débloque l'audio et lance les boucles. */
export function startAudio() {
  if (started) return;
  started = true;
  init();
  refreshLoops();
}

export function setSoundEnabled(on: boolean) {
  enabled = on;
  if (started) refreshLoops();
}

export function setMusic(on: boolean) {
  musicOn = on;
  if (started) refreshLoops();
}

/** Coupe musique et ambiance quand l'appli passe en arrière-plan, les relance au retour. */
export function pauseMusic(p: boolean) {
  paused = p;
  if (started) refreshLoops();
}

export function buzz(kind: 'light' | 'success' | 'error' = 'light') {
  if (!enabled || Platform.OS === 'web') return;
  if (kind === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  else Haptics.notificationAsync(kind === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error).catch(() => {});
}
