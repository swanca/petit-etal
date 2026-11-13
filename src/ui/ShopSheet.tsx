// Boutique d'énergie : plein gratuit avec une pub (ou recharge offerte), énergie contre des pièces.
import { useState } from 'react';
import { View } from 'react-native';
import * as B from '../game/balance';
import * as E from '../game/engine';
import type { State } from '../game/engine';
import { adsEnabled, showRewardedAd } from './ads';
import { Sheet } from './Sheets';
import { pauseMusic } from './sfx';
import { Btn, C, F, fmt, fmtDuration, Icon, T } from './theme';

export function ShopSheet({ s, now, onClose, onAd, onBuy }: { s: State; now: number; onClose: () => void; onAd: (perDay: number) => void; onBuy: (kind: 'pack' | 'full') => void }) {
  const ads = adsEnabled();
  const perDay = ads ? B.AD_REFILLS_PER_DAY : B.FREE_REFILLS_PER_DAY;
  const left = E.adsLeft(s, now, perDay);
  const max = E.energyMax(s);
  const full = s.energy >= max;
  const pack = E.packCost(s, now);
  const fullCost = E.fullCost(s, now);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const watch = async () => {
    if (!ads) {
      onAd(perDay);
      return;
    }
    setBusy(true);
    setMsg('');
    const r = await showRewardedAd((p) => pauseMusic(p));
    setBusy(false);
    if (r === 'viewed') onAd(perDay);
    else if (r === 'dismissed') setMsg('Pub fermée avant la fin : pas de recharge cette fois.');
    else setMsg('Aucune pub disponible pour le moment, réessaie dans un instant.');
  };

  return (
    <Sheet title="Énergie" icon="high_voltage" onClose={onClose}>
      <View style={{ backgroundColor: C.card, borderRadius: 16, borderWidth: 2, borderColor: C.line, padding: 12, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Icon name="high_voltage" size={44} />
          <View style={{ flex: 1 }}>
            <T style={{ fontFamily: F.title, fontSize: 26, lineHeight: 30 }}>
              {s.energy}
              <T style={{ fontFamily: F.semi, fontSize: 15, color: C.inkSoft }}> / {max}</T>
            </T>
            <T style={{ fontSize: 13, color: C.inkSoft }}>{full ? 'Énergie pleine : profites-en !' : `+1 par minute · plein dans ${fmtDuration(E.energyFullIn(s) / 1000)}`}</T>
          </View>
        </View>
        <View style={{ height: 10, borderRadius: 5, backgroundColor: C.line, overflow: 'hidden' }}>
          <View style={{ height: 10, borderRadius: 5, backgroundColor: '#E0A800', width: `${Math.min(100, (s.energy / max) * 100)}%` }} />
        </View>
        <T style={{ fontSize: 12, color: C.inkSoft }}>Chaque objet sorti d’un stand coûte 1 énergie. Un niveau gagné remplit la jauge, comme le cadeau du jour et les coffres.</T>
      </View>

      <View style={{ backgroundColor: '#FFF6D6', borderRadius: 16, borderWidth: 2, borderColor: C.gold, padding: 12, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name={ads ? 'mobile_phone' : 'wrapped_gift'} size={30} />
          <View style={{ flex: 1 }}>
            <T style={{ fontFamily: F.title, fontSize: 17 }}>{ads ? 'Plein gratuit avec une pub' : 'Plein offert'}</T>
            <T style={{ fontSize: 12, color: C.inkSoft }}>
              {left} sur {perDay} restant{left > 1 ? 's' : ''} aujourd’hui
            </T>
          </View>
        </View>
        <Btn
          label={busy ? 'Pub en cours…' : full ? 'Déjà plein' : ads ? 'Regarder une pub' : 'Remplir gratuitement'}
          icon={ads ? 'mobile_phone' : 'high_voltage'}
          disabled={busy || full || left <= 0}
          onPress={watch}
        />
        {msg ? <T style={{ fontSize: 12, color: C.redDark }}>{msg}</T> : null}
        {left <= 0 ? <T style={{ fontSize: 12, color: C.inkSoft }}>Reviens demain pour de nouvelles recharges.</T> : null}
      </View>

      <T style={{ fontFamily: F.semi, fontSize: 13, color: C.inkSoft, marginLeft: 4, marginTop: 4 }}>CONTRE DES PIÈCES</T>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: 16, borderWidth: 2, borderColor: C.line, padding: 10 }}>
        <Icon name="high_voltage" size={32} />
        <View style={{ flex: 1 }}>
          <T style={{ fontFamily: F.semi, fontSize: 15 }}>+{B.ENERGY_PACK} énergie</T>
          <T style={{ fontSize: 12, color: C.inkSoft }}>Le prix monte à chaque achat de la journée</T>
        </View>
        <Btn label={fmt(pack)} icon="coin" small disabled={s.coins < pack} onPress={() => onBuy('pack')} style={{ minWidth: 92 }} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: 16, borderWidth: 2, borderColor: C.line, padding: 10 }}>
        <Icon name="battery" size={32} />
        <View style={{ flex: 1 }}>
          <T style={{ fontFamily: F.semi, fontSize: 15 }}>Plein d’énergie</T>
          <T style={{ fontSize: 12, color: C.inkSoft }}>{full ? 'Ta jauge est déjà pleine' : `+${max - s.energy} énergie, 20 % moins cher`}</T>
        </View>
        <Btn label={full ? '—' : fmt(fullCost)} icon="coin" small disabled={full || s.coins < fullCost} onPress={() => onBuy('full')} style={{ minWidth: 92 }} />
      </View>
      <T style={{ fontSize: 12, color: C.inkSoft, textAlign: 'center', marginTop: 4 }}>Agrandis ta jauge avec « Grande réserve » dans Améliorer.</T>
    </Sheet>
  );
}
