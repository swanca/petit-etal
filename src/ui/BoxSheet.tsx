// Caisse en cours d'ouverture : temps restant, contenu, et ouverture immédiate (pièces, pub ou ouverture offerte).
import { useState } from 'react';
import { View } from 'react-native';
import * as B from '../game/balance';
import * as E from '../game/engine';
import type { State } from '../game/engine';
import { adsEnabled, showRewardedAd } from './ads';
import { ImgName } from './images';
import { Sheet } from './Sheets';
import { pauseMusic } from './sfx';
import { Btn, C, F, fmt, fmtClock, fmtDuration, Icon, T } from './theme';

export function BoxSheet({ s, now, id, onClose, onSkip }: { s: State; now: number; id: number; onClose: () => void; onSkip: (how: 'coins' | 'ad', perDay: number) => void }) {
  const it = s.items.find((x) => x.id === id);
  const ads = adsEnabled();
  const perDay = ads ? B.BOX_SKIPS_AD_PER_DAY : B.BOX_SKIPS_FREE_PER_DAY;
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  if (!it?.box) return null;
  const def = B.BOXES[it.box.kind];
  const left = Math.max(0, it.box.until - now);
  const cost = E.boxSkipCost(s, it, now);
  const skips = E.boxSkipsLeft(s, now, perDay);
  const lo = def.lo + B.boxTierBonus(s.level);
  const hi = def.hi + B.boxTierBonus(s.level);

  const watch = async () => {
    if (!ads) {
      onSkip('ad', perDay);
      return;
    }
    setBusy(true);
    setMsg('');
    const r = await showRewardedAd((p) => pauseMusic(p));
    setBusy(false);
    if (r === 'viewed') onSkip('ad', perDay);
    else if (r === 'dismissed') setMsg(`Pub fermée avant la fin : ${def.fem ? 'la' : 'le'} ${def.name.toLowerCase()} continue de s’ouvrir.`);
    else setMsg('Aucune pub disponible pour le moment, réessaie dans un instant.');
  };

  return (
    <Sheet title={def.name} icon={def.img as ImgName} onClose={onClose}>
      <View style={{ backgroundColor: '#FFF1DC', borderRadius: 16, borderWidth: 2, borderColor: def.color, padding: 12, alignItems: 'center', gap: 6 }}>
        <Icon name={def.img as ImgName} size={64} />
        <T style={{ fontFamily: F.title, fontSize: 26 }}>{left <= 0 ? (def.fem ? 'Prête !' : 'Prêt !') : left < 3600e3 ? fmtClock(left) : fmtDuration(left / 1000 + 59)}</T>
        <T style={{ fontSize: 13, color: C.inkSoft, textAlign: 'center' }}>
          {def.items} objets des paliers {lo} à {hi}
          {def.energy ? ` et +${def.energy} énergie` : ''}. {def.fem ? 'Reviens quand elle est prête, ou ouvre-la tout de suite.' : 'Reviens quand il est prêt, ou ouvre-le tout de suite.'}
        </T>
        <T style={{ fontSize: 12, color: C.inkSoft, textAlign: 'center' }}>Une seule caisse s’ouvre à la fois.</T>
      </View>

      <View style={{ backgroundColor: '#FFF6D6', borderRadius: 16, borderWidth: 2, borderColor: C.gold, padding: 12, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name={ads ? 'mobile_phone' : 'wrapped_gift'} size={30} />
          <View style={{ flex: 1 }}>
            <T style={{ fontFamily: F.title, fontSize: 17 }}>{ads ? 'Ouvrir avec une pub' : 'Ouverture offerte'}</T>
            <T style={{ fontSize: 12, color: C.inkSoft }}>
              {skips} sur {perDay} restante{skips > 1 ? 's' : ''} aujourd’hui
            </T>
          </View>
        </View>
        <Btn label={busy ? 'Pub en cours…' : ads ? 'Regarder une pub' : 'Ouvrir gratuitement'} icon={ads ? 'mobile_phone' : 'sparkles'} disabled={busy || skips <= 0 || left <= 0} onPress={watch} />
        {msg ? <T style={{ fontSize: 12, color: C.redDark }}>{msg}</T> : null}
        {skips <= 0 ? <T style={{ fontSize: 12, color: C.inkSoft }}>Reviens demain pour de nouvelles ouvertures.</T> : null}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: 16, borderWidth: 2, borderColor: C.line, padding: 10 }}>
        <Icon name="stopwatch" size={32} />
        <View style={{ flex: 1 }}>
          <T style={{ fontFamily: F.semi, fontSize: 15 }}>Ouvrir maintenant</T>
          <T style={{ fontSize: 12, color: C.inkSoft }}>Le prix baisse à mesure que le temps passe</T>
        </View>
        <Btn label={fmt(cost)} icon="coin" small disabled={s.coins < cost || left <= 0} onPress={() => onSkip('coins', perDay)} style={{ minWidth: 92 }} />
      </View>
    </Sheet>
  );
}
