// Web seulement : installation de l'appli sur l'écran d'accueil et plein écran.
// Chaque navigateur s'installe différemment ; installEnv() dit lequel on a pour montrer le bon mode d'emploi.
// Sur mobile natif (APK), tout est considéré comme installé.
import { useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice?: Promise<{ outcome: string }> };
let pending: InstallEvent | null = null;
let installedNow = false;
const web = Platform.OS === 'web' && typeof window !== 'undefined';
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (web) {
  // Chrome/Edge/Samsung Internet proposent l'installation par cet événement : on le garde pour notre bouton.
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    pending = e as InstallEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    pending = null;
    installedNow = true;
    emit();
  });
}

const ua = () => (web ? window.navigator.userAgent : '');

/** L'appli tourne déjà comme une appli installée (sans barre de navigateur). */
export function isInstalled(): boolean {
  if (!web) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return installedNow || window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches || nav.standalone === true;
}

export const isWeb = () => web;
export const canPromptInstall = () => !!pending;
export const isIOS = () => web && (/iphone|ipad|ipod/i.test(ua()) || (/Macintosh/.test(ua()) && window.navigator.maxTouchPoints > 1));
export const isAndroid = () => web && /android/i.test(ua());
/** Navigateur intégré d'une appli (Messenger, Instagram, TikTok, Snapchat, Discord, Gmail…) : il ne sait pas installer. */
export const isInApp = () => web && /FBAN|FBAV|FB_IAB|Instagram|Line\/|Snapchat|TikTok|musical_ly|Twitter|Discord|LinkedInApp|GSA\/|Pinterest|; wv\)/i.test(ua());

export type InstallEnv = 'installed' | 'prompt' | 'ios-safari' | 'ios-other' | 'inapp' | 'android' | 'desktop';

export function installEnv(): InstallEnv {
  if (isInstalled()) return 'installed';
  if (isInApp()) return 'inapp';
  if (pending) return 'prompt';
  if (isIOS()) return /CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua()) ? 'ios-other' : 'ios-safari';
  if (isAndroid()) return 'android';
  return 'desktop';
}

/** Suit l'environnement d'installation (il change quand Chrome se décide à proposer l'installation). */
export function useInstallEnv(): InstallEnv {
  const [env, setEnv] = useState<InstallEnv>(() => installEnv());
  useEffect(() => {
    const l = () => setEnv(installEnv());
    listeners.add(l);
    l();
    return () => {
      listeners.delete(l);
    };
  }, []);
  return env;
}

/** Ouvre la fenêtre d'installation du navigateur. Renvoie true si le joueur a accepté. */
export async function promptInstall(): Promise<boolean> {
  const e = pending;
  if (!e) return false;
  pending = null;
  emit();
  try {
    await e.prompt();
    const choice = await e.userChoice;
    return choice?.outcome === 'accepted';
  } catch {
    return false;
  }
}

/** Adresse du jeu (sans paramètres). */
export function siteUrl(): string {
  if (!web) return 'https://swanca.github.io/petit-etal/';
  const { origin, pathname } = window.location;
  return origin + pathname.replace(/[^/]*$/, '');
}

/** Android : rouvre la page dans Chrome depuis le navigateur d'une appli. */
export function openInChrome(): void {
  const u = siteUrl().replace(/^https?:\/\//, '');
  Linking.openURL(`intent://${u}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(siteUrl())};end`).catch(() => {});
}

export async function copyLink(): Promise<boolean> {
  try {
    await window.navigator.clipboard.writeText(siteUrl());
    return true;
  } catch {
    return false;
  }
}

export const canFullscreen = () => web && !!document.documentElement.requestFullscreen;
export const isFullscreen = () => web && !!document.fullscreenElement;

export function toggleFullscreen(): void {
  if (!web) return;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
}
