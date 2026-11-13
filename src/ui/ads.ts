// Pubs récompensées (« regarde une pub, ton énergie est pleine »).
// Web : Google Ad Placement API (AdSense pour les jeux H5). Elle ne s'active que si l'identifiant
// d'éditeur est fourni au build : EXPO_PUBLIC_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX (voir DEPLOIEMENT.md).
// Sans régie configurée (ou dans l'APK, en attendant AdMob), la boutique propose des recharges offertes,
// moins nombreuses, présentées comme telles : on ne montre jamais de fausse pub.
import { Platform } from 'react-native';

const CLIENT = process.env.EXPO_PUBLIC_ADSENSE_CLIENT ?? '';
const web = Platform.OS === 'web' && typeof window !== 'undefined';

type AdBreakInfo = { breakStatus: string };
type Placement = {
  type: string;
  name: string;
  beforeAd?: () => void;
  afterAd?: () => void;
  beforeReward?: (showAdFn: () => void) => void;
  adDismissed?: () => void;
  adViewed?: () => void;
  adBreakDone?: (info: AdBreakInfo) => void;
};
type AdWindow = Window & { adsbygoogle?: unknown[]; adBreak?: (p: Placement) => void; adConfig?: (c: object) => void };

let loaded = false;
function load() {
  if (loaded || !web || !CLIENT) return;
  loaded = true;
  const w = window as AdWindow;
  w.adsbygoogle = w.adsbygoogle || [];
  w.adBreak = w.adConfig = (o: object) => {
    (w.adsbygoogle as unknown[]).push(o);
  };
  const sc = document.createElement('script');
  sc.async = true;
  sc.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`;
  sc.crossOrigin = 'anonymous';
  sc.setAttribute('data-ad-client', CLIENT);
  sc.setAttribute('data-ad-frequency-hint', '30s');
  if (__DEV__) sc.setAttribute('data-adbreak-test', 'on');
  document.head.appendChild(sc);
  w.adConfig?.({ preloadAdBreaks: 'on', sound: 'on' });
}

/** true : de vraies pubs récompensées sont disponibles sur cette plateforme. */
export const adsEnabled = () => web && !!CLIENT;

export function initAds() {
  load();
}

/** Lance une pub récompensée. Résout `viewed` si le joueur l'a regardée jusqu'au bout, `none` si aucune pub n'était prête. */
export function showRewardedAd(onPause: (paused: boolean) => void): Promise<'viewed' | 'dismissed' | 'none'> {
  if (!adsEnabled()) return Promise.resolve('none');
  load();
  const w = window as AdWindow;
  return new Promise((resolve) => {
    let done = false;
    const end = (r: 'viewed' | 'dismissed' | 'none') => {
      if (done) return;
      done = true;
      onPause(false);
      resolve(r);
    };
    try {
      w.adBreak?.({
        type: 'reward',
        name: 'plein-energie',
        beforeAd: () => onPause(true),
        afterAd: () => onPause(false),
        beforeReward: (showAdFn) => showAdFn(),
        adDismissed: () => end('dismissed'),
        adViewed: () => end('viewed'),
        adBreakDone: () => end('none'),
      });
    } catch {
      end('none');
    }
    // Filet de sécurité : si la régie ne répond pas, on n'attend pas indéfiniment.
    setTimeout(() => end('none'), 60_000);
  });
}
