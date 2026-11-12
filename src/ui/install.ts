// Web seulement : installation de l'appli sur l'écran d'accueil et plein écran.
// Sur mobile natif (APK), ces fonctions ne font rien.
import { Platform } from 'react-native';

type InstallEvent = Event & { prompt: () => Promise<void> };
let pending: InstallEvent | null = null;
const web = Platform.OS === 'web' && typeof window !== 'undefined';

if (web) {
  // Chrome/Android propose l'installation par cet événement : on le garde pour le bouton des réglages.
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    pending = e as InstallEvent;
  });
  window.addEventListener('appinstalled', () => {
    pending = null;
  });
}

/** L'appli tourne déjà comme une appli installée (sans barre de navigateur). */
export function isInstalled(): boolean {
  if (!web) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches || nav.standalone === true;
}

export const isWeb = () => web;
export const canPromptInstall = () => !!pending;
export const isIOS = () => web && /iphone|ipad|ipod/i.test(window.navigator.userAgent);

export async function promptInstall(): Promise<void> {
  const e = pending;
  pending = null;
  await e?.prompt().catch(() => {});
}

export const canFullscreen = () => web && !!document.documentElement.requestFullscreen;
export const isFullscreen = () => web && !!document.fullscreenElement;

export function toggleFullscreen(): void {
  if (!web) return;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
}
