// Sons et vibrations. Les lecteurs sont créés au premier geste du joueur (les navigateurs bloquent
// l'audio avant) ; plusieurs lecteurs par son fréquent pour pouvoir les enchaîner sans coupure.
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const SOURCES = {
  tap: require('../../assets/sounds/tap.wav'),
  pop: require('../../assets/sounds/pop.wav'),
  merge: require('../../assets/sounds/correct.wav'),
  coin: require('../../assets/sounds/coin.wav'),
  star: require('../../assets/sounds/star.wav'),
  levelup: require('../../assets/sounds/levelup.wav'),
  wrong: require('../../assets/sounds/wrong.wav'),
  buy: require('../../assets/sounds/boost.wav'),
  found: require('../../assets/sounds/ping.wav'),
};
export type Sound = keyof typeof SOURCES;
const VOLUME: Partial<Record<Sound, number>> = { tap: 0.4, pop: 0.6, merge: 0.7, wrong: 0.5, found: 0.7 };
const VOICES: Partial<Record<Sound, number>> = { pop: 3, merge: 3, coin: 2 };

const players: Partial<Record<Sound, AudioPlayer[]>> = {};
const turn: Partial<Record<Sound, number>> = {};
let ready = false;
let enabled = true;
let musicOn = true;
let music: AudioPlayer | null = null;

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

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

export function play(name: Sound) {
  if (!enabled) return;
  try {
    init();
    const list = players[name];
    if (!list?.length) return;
    const i = ((turn[name] ?? 0) + 1) % list.length;
    turn[name] = i;
    const p = list[i];
    p.volume = VOLUME[name] ?? 1;
    p.seekTo(0);
    p.play();
  } catch {}
}

/** Musique de fond en boucle. À appeler après un geste du joueur sur le web. */
export function setMusic(on: boolean) {
  musicOn = on;
  try {
    if (!on) {
      music?.pause();
      return;
    }
    init();
    if (!music) {
      music = createAudioPlayer(require('../../assets/sounds/music.wav'));
      music.loop = true;
      music.volume = 0.25;
    }
    music.play();
  } catch {}
}

/** Coupe la musique quand l'appli passe en arrière-plan, la relance au retour. */
export function pauseMusic(paused: boolean) {
  try {
    if (paused) music?.pause();
    else if (musicOn && music) music.play();
  } catch {}
}

export function buzz(kind: 'light' | 'success' | 'error' = 'light') {
  if (!enabled || Platform.OS === 'web') return;
  if (kind === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  else Haptics.notificationAsync(kind === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error).catch(() => {});
}
