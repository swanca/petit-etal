// Relie le moteur à React : état, tic d'horloge, sauvegarde locale versionnée.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { advance, Ev, loadState, newGame, Offline, Res, SAVE_VERSION, State, track } from './engine';

export const SAVE_KEY = `etal.save.v${SAVE_VERSION}`;
const TICK_MS = 500;
const SAVE_EVERY_MS = 3000;

export function useGame(onOffline: (o: Offline) => void, onBossLost: () => void) {
  const [state, setState] = useState<State | null>(null);
  const ref = useRef<State | null>(null);
  const dirty = useRef(false);
  const offlineCb = useRef(onOffline);
  const bossCb = useRef(onBossLost);
  useEffect(() => {
    offlineCb.current = onOffline;
    bossCb.current = onBossLost;
  });

  const save = useCallback(() => {
    if (!ref.current || !dirty.current) return;
    dirty.current = false;
    AsyncStorage.setItem(SAVE_KEY, JSON.stringify(ref.current)).catch(() => {});
  }, []);

  const commit = useCallback((s: State) => {
    ref.current = s;
    dirty.current = true;
    setState(s);
  }, []);

  // Avance l'horloge du jeu ; une longue pause (onglet caché, appli fermée) devient une « absence ».
  const tick = useCallback(() => {
    if (!ref.current) return;
    const r = advance(ref.current, Date.now());
    commit(r.s);
    if (r.bossLost) bossCb.current();
    if (r.offline) {
      offlineCb.current(r.offline);
      save();
    }
  }, [commit, save]);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(SAVE_KEY)
      .catch(() => null)
      .then((raw) => {
        if (!alive) return;
        ref.current = loadState(raw) ?? newGame(Date.now());
        tick();
      });
    // Outil de test (développement seulement) : lire ou remplacer l'état depuis la console du navigateur.
    if (__DEV__ && Platform.OS === 'web') (globalThis as unknown as { __etal: object }).__etal = { get: () => ref.current, set: commit };
    const timer = setInterval(tick, TICK_MS);
    const saver = setInterval(save, SAVE_EVERY_MS);
    const sub = AppState.addEventListener('change', (st) => (st === 'active' ? tick() : save()));
    const onHide = () => save();
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('pagehide', onHide);
      window.addEventListener('beforeunload', onHide);
    }
    return () => {
      alive = false;
      clearInterval(timer);
      clearInterval(saver);
      sub.remove();
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.removeEventListener('pagehide', onHide);
        window.removeEventListener('beforeunload', onHide);
      }
      save();
    };
  }, [tick, save, commit]);

  /** Applique une action du moteur et renvoie ses événements (sons, effets). */
  const act = useCallback(
    (fn: (s: State) => Res): Ev[] => {
      if (!ref.current) return [];
      const r = track(fn(ref.current));
      if (r.s !== ref.current) commit(r.s);
      return r.ev;
    },
    [commit],
  );

  const patch = useCallback(
    (p: Partial<State>) => {
      if (ref.current) {
        commit({ ...ref.current, ...p });
        save();
      }
    },
    [commit, save],
  );

  const reset = useCallback(() => {
    commit(newGame(Date.now()));
    save();
  }, [commit, save]);

  return { state, act, patch, reset };
}
