// Fenêtres du jeu : améliorations, collection, réglages, retour d'absence, passage de niveau.
import { ReactNode, useEffect, useState } from 'react';
import { Animated, Pressable, ScrollView, View } from 'react-native';
import * as B from '../game/balance';
import type { ChainId, UpgradeId } from '../game/balance';
import * as E from '../game/engine';
import type { Offline, State } from '../game/engine';
import type { LevelUp, Reward } from './Game';
import { ImgName } from './images';
import { canFullscreen, canPromptInstall, isInstalled, isIOS, isWeb, promptInstall, toggleFullscreen } from './install';
import { Btn, C, F, fmt, fmtDuration, fmtRate, Icon, NATIVE, T } from './theme';

function Sheet({ title, icon, onClose, children }: { title: string; icon: ImgName; onClose: () => void; children: ReactNode }) {
  const a = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    Animated.spring(a, { toValue: 1, friction: 9, tension: 90, useNativeDriver: NATIVE }).start();
  }, [a]);
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 60, justifyContent: 'flex-end' }}>
      <Pressable onPress={onClose} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(40,24,12,0.5)' }} />
      <Animated.View
        style={{
          maxHeight: '84%',
          backgroundColor: C.bg,
          borderTopLeftRadius: 26,
          borderTopRightRadius: 26,
          borderTopWidth: 4,
          borderColor: C.red,
          transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [500, 0] }) }],
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 8 }}>
          <Icon name={icon} size={28} />
          <T style={{ flex: 1, fontFamily: F.title, fontSize: 22 }}>{title}</T>
          <Pressable onPress={onClose} hitSlop={10} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: C.line, alignItems: 'center', justifyContent: 'center' }}>
            <T style={{ fontFamily: F.title, fontSize: 16, lineHeight: 20 }}>✕</T>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 20, gap: 8 }}>{children}</ScrollView>
      </Animated.View>
    </View>
  );
}

function Row({ img, bg, title, desc, level, cost, coins, maxed, onBuy }: { img: ImgName; bg: string; title: string; desc: string; level: number; cost: number; coins: number; maxed: boolean; onBuy: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: 16, borderWidth: 2, borderColor: C.line, padding: 8 }}>
      <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={img} size={34} />
      </View>
      <View style={{ flex: 1 }}>
        <T style={{ fontFamily: F.semi, fontSize: 15 }} numberOfLines={1}>
          {title} <T style={{ fontSize: 12, color: C.inkSoft }}>niv. {level}</T>
        </T>
        <T style={{ fontSize: 12, color: C.inkSoft }} numberOfLines={2}>
          {desc}
        </T>
      </View>
      {maxed ? (
        <T style={{ fontFamily: F.semi, color: C.greenDark, paddingHorizontal: 8 }}>Max</T>
      ) : (
        <Btn label={fmt(cost)} icon="coin" small disabled={coins < cost} onPress={onBuy} style={{ minWidth: 92 }} />
      )}
    </View>
  );
}

const pct = (x: number) => `${Math.round(x * 100)} %`;
const secs = (ms: number) => `${(ms / 1000).toFixed(1).replace('.', ',')} s`;

export function UpgradesSheet({ s, onClose, onBuy, onBuyGen, onPrestige }: { s: State; onClose: () => void; onBuy: (u: UpgradeId) => void; onBuyGen: (c: ChainId) => void; onPrestige: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const gain = E.prestigeGain(s);
  const can = E.canPrestige(s) && gain >= 1;
  return (
    <Sheet title="Améliorer" icon="chart_increasing" onClose={onClose}>
      <T style={{ fontFamily: F.semi, fontSize: 13, color: C.inkSoft, marginLeft: 4 }}>STANDS</T>
      {B.CHAIN_IDS.map((c) => {
        const def = B.CHAINS[c];
        const g = s.gens[c];
        if (!E.chainUnlocked(s, c)) {
          if (B.CHAIN_IDS.find((x) => !E.chainUnlocked(s, x)) !== c) return null;
          return (
            <View key={c} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.line, borderRadius: 16, padding: 8, opacity: 0.8 }}>
              <View style={{ width: 46, height: 46, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="locked" size={28} />
              </View>
              <T style={{ flex: 1, fontFamily: F.semi, color: C.inkSoft }}>
                Prochain stand : {def.name}, au niveau {def.unlockLevel}
              </T>
            </View>
          );
        }
        const maxed = g.level >= B.GEN_MAX_LEVEL;
        const odds = B.genTierOdds(g.level + (maxed ? 0 : 1));
        const better = odds.p2 + odds.p3 + odds.p4;
        const desc = maxed
          ? `Une charge toutes les ${secs(B.genPeriodMs(g.level))}`
          : `Charge : ${secs(B.genPeriodMs(g.level))} → ${secs(B.genPeriodMs(g.level + 1))} · ${pct(better)} d'objets déjà fusionnés`;
        return <Row key={c} img={def.maker as ImgName} bg={def.soft} title={def.name} desc={desc} level={g.level} cost={B.genCost(c, g.level)} coins={s.coins} maxed={maxed} onBuy={() => onBuyGen(c)} />;
      })}
      <T style={{ fontFamily: F.semi, fontSize: 13, color: C.inkSoft, marginLeft: 4, marginTop: 6 }}>MARCHÉ</T>
      {B.UPGRADE_IDS.map((u) => {
        const def = B.UPGRADES[u];
        const lvl = s.up[u];
        const maxed = lvl >= def.max;
        return <Row key={u} img={def.img as ImgName} bg="#FFF0D6" title={def.name} desc={maxed ? 'Niveau maximum atteint' : def.desc(lvl)} level={lvl} cost={def.cost(lvl)} coins={s.coins} maxed={maxed} onBuy={() => onBuy(u)} />;
      })}
      <T style={{ fontFamily: F.semi, fontSize: 13, color: C.inkSoft, marginLeft: 4, marginTop: 6 }}>SAISON {s.season + 1}</T>
      <View style={{ backgroundColor: C.card, borderRadius: 16, borderWidth: 2, borderColor: can ? C.gold : C.line, padding: 10, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="rosette" size={34} />
          <View style={{ flex: 1 }}>
            <T style={{ fontFamily: F.semi, fontSize: 15 }}>
              Rubans : {s.ribbons} (pièces ×{B.ribbonMult(s.ribbons).toFixed(2).replace('.', ',')})
            </T>
            <T style={{ fontSize: 12, color: C.inkSoft }}>
              {E.canPrestige(s)
                ? `Lancer une nouvelle saison rapporte ${gain} ruban${gain > 1 ? 's' : ''} (+${Math.round(B.RIBBON_BONUS * 100)} % de pièces chacun, pour toujours).`
                : `Au niveau ${B.PRESTIGE_LEVEL}, tu pourras lancer une nouvelle saison : le marché repart de zéro mais tu gagnes des rubans, un bonus de pièces permanent.`}
            </T>
          </View>
        </View>
        {can ? (
          confirm ? (
            <>
              <T style={{ fontSize: 12, color: C.redDark }}>Pièces, objets, niveau et améliorations repartent de zéro. L&apos;album, les trophées et les rubans restent. On y va ?</T>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Btn label="Pas encore" small color={C.greyDark} dark="#8A7D6B" onPress={() => setConfirm(false)} style={{ flex: 1 }} />
                <Btn label={`+${gain} rubans`} small color={C.gold} dark={C.goldDark} onPress={onPrestige} style={{ flex: 1 }} />
              </View>
            </>
          ) : (
            <Btn label="Nouvelle saison" small color={C.gold} dark={C.goldDark} onPress={() => setConfirm(true)} />
          )
        ) : null}
      </View>
    </Sheet>
  );
}

export function CollectionSheet({ s, onClose }: { s: State; onClose: () => void }) {
  const [pick, setPick] = useState<{ chain: ChainId; tier: number } | null>(null);
  const total = B.CHAIN_IDS.length * B.MAX_TIER;
  const found = Object.keys(s.found).length;
  const ever = Object.keys(s.ever).length;
  return (
    <Sheet title="Collection" icon="open_book" onClose={onClose}>
      <View style={{ backgroundColor: C.card, borderRadius: 16, borderWidth: 2, borderColor: C.line, padding: 10, gap: 4 }}>
        <T style={{ fontFamily: F.semi, fontSize: 15 }}>
          {found} / {total} cette saison{s.season > 0 ? ` · album ${ever}` : ''} · +{fmtRate(E.incomePerSec(s))} / s
        </T>
        <T style={{ fontSize: 12, color: C.inkSoft }}>
          {pick
            ? `${B.CHAINS[pick.chain].items[pick.tier - 1].name} (palier ${pick.tier}) : +${fmtRate(B.itemIncome(pick.tier) * B.incomeMult(s.up.income))} / s en permanence.`
            : 'Chaque objet découvert attire des clients : il rapporte des pièces en continu, même hors ligne. Touche un objet pour voir son apport.'}
        </T>
      </View>
      {B.CHAIN_IDS.map((c) => {
        const def = B.CHAINS[c];
        const open = E.chainUnlocked(s, c);
        return (
          <View key={c} style={{ backgroundColor: C.card, borderRadius: 16, borderWidth: 2, borderColor: C.line, padding: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Icon name={(open ? def.maker : 'locked') as ImgName} size={22} />
              <T style={{ fontFamily: F.title, fontSize: 16, color: def.color }}>{def.name}</T>
              <T style={{ fontSize: 12, color: C.inkSoft }}>{open ? `${E.maxFound(s, c) ? def.items.filter((_, i) => E.isFound(s, c, i + 1)).length : 0}/${B.MAX_TIER}` : `niveau ${def.unlockLevel}`}</T>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {def.items.map((it, i) => {
                const ok = E.isFound(s, c, i + 1);
                const seen = ok || E.isEver(s, c, i + 1);
                const on = pick?.chain === c && pick.tier === i + 1;
                return (
                  <Pressable key={i} disabled={!ok} onPress={() => setPick({ chain: c, tier: i + 1 })} style={{ width: '16.66%', aspectRatio: 1, padding: 3 }}>
                    <View style={{ flex: 1, borderRadius: 12, backgroundColor: ok ? def.soft : C.line, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: on ? def.color : 'transparent' }}>
                      {seen ? <Icon name={it.img as ImgName} size={34} style={{ opacity: ok ? 1 : 0.35 }} /> : <T style={{ fontFamily: F.title, fontSize: 18, color: C.greyDark }}>?</T>}
                      <T style={{ position: 'absolute', left: 4, top: 1, fontSize: 9, color: C.inkSoft }}>{i + 1}</T>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
    </Sheet>
  );
}

function Toggle({ label, icon, value, onChange }: { label: string; icon: ImgName; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable onPress={() => onChange(!value)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: 16, borderWidth: 2, borderColor: C.line, padding: 10 }}>
      <Icon name={icon} size={28} />
      <T style={{ flex: 1, fontFamily: F.semi, fontSize: 16 }}>{label}</T>
      <View style={{ width: 50, height: 28, borderRadius: 14, backgroundColor: value ? C.green : C.grey, padding: 3, alignItems: value ? 'flex-end' : 'flex-start' }}>
        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: C.white }} />
      </View>
    </Pressable>
  );
}

export function SettingsSheet({ s, onClose, onSound, onMusic, onReset }: { s: State; onClose: () => void; onSound: (v: boolean) => void; onMusic: (v: boolean) => void; onReset: () => void }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <Sheet title="Réglages" icon="gear" onClose={onClose}>
      <Toggle label="Sons" icon="speaker_high_volume" value={s.sound} onChange={onSound} />
      <Toggle label="Musique" icon="musical_note" value={s.music} onChange={onMusic} />
      {isWeb() ? (
        <View style={{ backgroundColor: C.card, borderRadius: 16, borderWidth: 2, borderColor: C.line, padding: 10, gap: 8 }}>
          <T style={{ fontFamily: F.semi, fontSize: 15 }}>Jouer comme une appli</T>
          {isInstalled() ? (
            <T style={{ fontSize: 13, color: C.inkSoft }}>Petit Étal est installé sur cet appareil.</T>
          ) : canPromptInstall() ? (
            <Btn label="Installer sur l'écran d'accueil" small icon="mobile_phone" onPress={promptInstall} />
          ) : (
            <T style={{ fontSize: 13, color: C.inkSoft }}>
              {isIOS()
                ? 'Sur iPhone : touche le bouton Partager de Safari, puis « Sur l’écran d’accueil ». Le jeu s’ouvrira en plein écran, comme une appli.'
                : 'Ouvre le menu du navigateur (les trois points), puis « Installer l’application » ou « Ajouter à l’écran d’accueil ». Le jeu s’ouvrira en plein écran, comme une appli.'}
            </T>
          )}
          {canFullscreen() && !isInstalled() ? <Btn label="Plein écran" small color="#3B8FD9" dark="#2A6FB0" onPress={toggleFullscreen} /> : null}
        </View>
      ) : null}
      <View style={{ backgroundColor: C.card, borderRadius: 16, borderWidth: 2, borderColor: C.line, padding: 10, gap: 4 }}>
        <T style={{ fontFamily: F.semi, fontSize: 15 }}>Ton marché</T>
        <T style={{ fontSize: 13, color: C.inkSoft }}>
          {fmt(s.life.merges)} fusions · {fmt(s.life.orders)} commandes · {fmt(s.life.earned)} pièces gagnées · {s.life.bosses} Gloutons repoussés · saison {s.season + 1}
        </T>
      </View>
      <View style={{ backgroundColor: C.card, borderRadius: 16, borderWidth: 2, borderColor: C.line, padding: 10, gap: 8 }}>
        <T style={{ fontSize: 13, color: C.inkSoft }}>{confirm ? 'Tout sera effacé : pièces, objets, améliorations. Sûr ?' : 'La partie est enregistrée sur cet appareil.'}</T>
        {confirm ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn label="Annuler" small color={C.greyDark} dark="#8A7D6B" onPress={() => setConfirm(false)} style={{ flex: 1 }} />
            <Btn label="Tout effacer" small color={C.red} dark={C.redDark} onPress={onReset} style={{ flex: 1 }} />
          </View>
        ) : (
          <Btn label="Recommencer à zéro" small color={C.greyDark} dark="#8A7D6B" onPress={() => setConfirm(true)} />
        )}
      </View>
      <T style={{ fontSize: 11, color: C.inkSoft, textAlign: 'center' }}>Petit Étal · images Fluent Emoji (Microsoft, MIT) · polices Fredoka et Nunito (OFL) · sons Kenney (CC0), « Cozy Farm SFX » par Bramble & Byte (CC-BY 4.0), ambiance « Park Ambiences » par Thimras (CC0) et « Crowd Shouting/Speaking Ambience » (CC0), musique « Busy Day At The Market » par ViRiX Dreamcore (CC-BY 3.0) — OpenGameArt.org</T>
    </Sheet>
  );
}

function Modal({ children }: { children: ReactNode }) {
  const a = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    Animated.spring(a, { toValue: 1, friction: 5, tension: 110, useNativeDriver: NATIVE }).start();
  }, [a]);
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 70, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(40,24,12,0.55)', padding: 24 }}>
      <Animated.View
        style={{ width: '100%', maxWidth: 340, backgroundColor: C.bg, borderRadius: 26, borderWidth: 4, borderColor: C.gold, padding: 18, alignItems: 'center', gap: 10, opacity: a, transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }] }}>
        {children}
      </Animated.View>
    </View>
  );
}

export function OfflineModal({ data, capSec, onClose }: { data: Offline; capSec: number; onClose: () => void }) {
  return (
    <Modal>
      <Icon name="crescent_moon" size={64} />
      <T style={{ fontFamily: F.title, fontSize: 22, textAlign: 'center' }}>Te revoilà !</T>
      <T style={{ fontSize: 14, color: C.inkSoft, textAlign: 'center' }}>Pendant ton absence ({fmtDuration(data.seconds)}), tes clients ont continué d&apos;acheter.</T>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.card, borderRadius: 18, borderWidth: 2, borderColor: C.line, paddingVertical: 8, paddingHorizontal: 18 }}>
        <Icon name="coin" size={32} />
        <T style={{ fontFamily: F.title, fontSize: 28 }}>+{fmt(data.coins)}</T>
      </View>
      {data.capped ? <T style={{ fontSize: 12, color: C.redDark, textAlign: 'center' }}>Plafond de {fmtDuration(capSec)} atteint : la Veilleuse (dans Améliorer) l&apos;allonge.</T> : null}
      <T style={{ fontSize: 12, color: C.inkSoft, textAlign: 'center' }}>Tes stands sont rechargés.</T>
      <Btn label="Encaisser" icon="coin" onPress={onClose} style={{ alignSelf: 'stretch' }} />
    </Modal>
  );
}

export function LevelUpModal({ data, onClose }: { data: LevelUp; onClose: () => void }) {
  const def = data.unlocked ? B.CHAINS[data.unlocked] : null;
  return (
    <Modal>
      <Icon name="party_popper" size={64} />
      <T style={{ fontFamily: F.title, fontSize: 24, textAlign: 'center' }}>Niveau {data.level} !</T>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name="coin" size={26} />
        <T style={{ fontFamily: F.title, fontSize: 22 }}>+{fmt(data.coins)}</T>
      </View>
      {def ? (
        <View style={{ alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: def.soft, borderRadius: 18, borderWidth: 2, borderColor: def.color, padding: 10 }}>
          <Icon name={def.maker as ImgName} size={44} />
          <View style={{ flex: 1 }}>
            <T style={{ fontFamily: F.title, fontSize: 16, color: def.color }}>Nouveau stand : {def.name}</T>
            <T style={{ fontSize: 12, color: C.inkSoft }}>Touche-le en bas de l&apos;écran pour sortir ses objets.</T>
          </View>
        </View>
      ) : null}
      <Btn label="Super !" onPress={onClose} style={{ alignSelf: 'stretch' }} />
    </Modal>
  );
}

// ---------- Missions et cadeau du jour ----------

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: C.line, overflow: 'hidden' }}>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: color, width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }} />
    </View>
  );
}

export function MissionsSheet({ s, now, onClose, onClaim, onDaily }: { s: State; now: number; onClose: () => void; onClaim: (id: number) => void; onDaily: () => void }) {
  const left = E.chestIn(s);
  const daily = E.dailyReady(s, now);
  const step = E.dailyStep(s, now);
  return (
    <Sheet title="Missions" icon="clipboard" onClose={onClose}>
      <View style={{ backgroundColor: C.card, borderRadius: 16, borderWidth: 2, borderColor: C.line, padding: 10, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="wrapped_gift" size={32} />
          <View style={{ flex: 1, gap: 4 }}>
            <T style={{ fontFamily: F.semi, fontSize: 14 }}>
              Coffre de palier dans {left} mission{left > 1 ? 's' : ''}
            </T>
            <Bar value={B.CHEST_EVERY - left} max={B.CHEST_EVERY} color={C.gold} />
          </View>
          <View style={{ alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Icon name="coin" size={14} />
              <T style={{ fontFamily: F.semi, fontSize: 13 }}>{fmt(B.chestCoins(s.level, E.incomePerSec(s)))}</T>
            </View>
            <T style={{ fontSize: 10, color: C.inkSoft }}>{s.missionsDone} accomplies</T>
          </View>
        </View>
      </View>
      {s.missions.map((m) => {
        const done = m.prog >= m.target;
        return (
          <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: 16, borderWidth: 2, borderColor: done ? C.green : C.line, padding: 8 }}>
            <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: '#DCEBFA', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={B.MISSION_IMG[m.kind] as ImgName} size={32} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <T style={{ fontFamily: F.semi, fontSize: 14 }} numberOfLines={1}>
                {B.MISSION_TEXT[m.kind](fmt(m.target))}
              </T>
              <Bar value={m.prog} max={m.target} color={done ? C.green : '#3B8FD9'} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <T style={{ fontSize: 11, color: C.inkSoft, flex: 1 }}>
                  {fmt(Math.min(m.prog, m.target))} / {fmt(m.target)}
                </T>
                <Icon name="coin" size={12} />
                <T style={{ fontFamily: F.semi, fontSize: 12 }}>{fmt(E.missionReward(s, m))}</T>
                <Icon name="star" size={12} style={{ marginLeft: 4 }} />
                <T style={{ fontFamily: F.semi, fontSize: 12 }}>{m.stars}</T>
              </View>
            </View>
            <Btn label={done ? 'Prendre' : 'En cours'} small disabled={!done} onPress={() => onClaim(m.id)} style={{ minWidth: 84 }} />
          </View>
        );
      })}
      <T style={{ fontFamily: F.semi, fontSize: 13, color: C.inkSoft, marginLeft: 4, marginTop: 6 }}>CADEAU DU JOUR</T>
      <View style={{ backgroundColor: C.card, borderRadius: 16, borderWidth: 2, borderColor: daily ? C.green : C.line, padding: 10, gap: 8 }}>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {B.DAILY.map((_, i) => {
            const got = daily ? i + 1 < step : i + 1 <= s.daily.streak;
            const today = daily && i + 1 === step;
            return (
              <View key={i} style={{ flex: 1, alignItems: 'center', paddingVertical: 5, borderRadius: 10, backgroundColor: got ? '#D9F0D2' : today ? '#FFF0D6' : C.line, borderWidth: 2, borderColor: today ? C.gold : 'transparent' }}>
                <T style={{ fontSize: 10, color: C.inkSoft }}>J{i + 1}</T>
                <Icon name={got ? 'check_mark_button' : i === B.DAILY.length - 1 ? 'wrapped_gift' : 'coin'} size={18} />
              </View>
            );
          })}
        </View>
        {s.tuto < E.TUTO.done ? (
          <T style={{ fontSize: 12, color: C.inkSoft }}>Termine le guidage pour ouvrir ton premier cadeau.</T>
        ) : daily ? (
          <Btn label={`Jour ${step} : +${fmt(E.dailyCoins(s, step))}`} icon="coin" small onPress={onDaily} />
        ) : (
          <T style={{ fontSize: 12, color: C.inkSoft }}>Cadeau pris aujourd&apos;hui. Reviens demain pour continuer la série (jour {(s.daily.streak % B.DAILY.length) + 1}).</T>
        )}
      </View>
    </Sheet>
  );
}

// ---------- Trophées ----------

export function TrophiesSheet({ s, onClose, onClaim }: { s: State; onClose: () => void; onClaim: (id: string) => void }) {
  // À prendre d'abord, puis en cours (les plus avancés en tête), puis déjà pris.
  const rank = (t: B.TrophyDef) => (E.trophyReady(s, t) ? 0 : s.trophies[t.id] ? 2 : 1);
  const list = B.TROPHIES.map((t, i) => ({ t, i, r: rank(t), p: Math.min(1, E.trophyProgress(s, t) / t.target) })).sort((a, b) => a.r - b.r || b.p - a.p || a.i - b.i);
  const got = Object.keys(s.trophies).length;
  return (
    <Sheet title="Trophées" icon="trophy" onClose={onClose}>
      <T style={{ fontSize: 12, color: C.inkSoft, marginLeft: 4 }}>
        {got} / {B.TROPHIES.length} trophées obtenus
      </T>
      {list.map(({ t, r }) => {
        const prog = E.trophyProgress(s, t);
        return (
          <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: 16, borderWidth: 2, borderColor: r === 0 ? C.gold : C.line, padding: 8, opacity: r === 2 ? 0.6 : 1 }}>
            <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: '#FFF0D6', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={t.img as ImgName} size={30} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <T style={{ fontFamily: F.semi, fontSize: 14 }} numberOfLines={1}>
                {t.name}
              </T>
              <Bar value={prog} max={t.target} color={r === 1 ? C.gold : C.green} />
              <T style={{ fontSize: 11, color: C.inkSoft }}>
                {fmt(Math.min(prog, t.target))} / {fmt(t.target)}
              </T>
            </View>
            {r === 2 ? <Icon name="check_mark_button" size={24} style={{ marginHorizontal: 8 }} /> : <Btn label={fmt(E.trophyReward(s, t))} icon="coin" small disabled={r !== 0} onPress={() => onClaim(t.id)} style={{ minWidth: 92 }} />}
          </View>
        );
      })}
    </Sheet>
  );
}

// ---------- Fenêtres ----------

export function DailyModal({ s, now, onClaim }: { s: State; now: number; onClaim: () => void }) {
  const step = E.dailyStep(s, now);
  return (
    <Modal>
      <Icon name="wrapped_gift" size={64} />
      <T style={{ fontFamily: F.title, fontSize: 22, textAlign: 'center' }}>Cadeau du jour</T>
      <T style={{ fontSize: 13, color: C.inkSoft, textAlign: 'center' }}>
        Jour {step} sur {B.DAILY.length}. Reviens chaque jour : le cadeau grossit jusqu&apos;au septième.
      </T>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.card, borderRadius: 18, borderWidth: 2, borderColor: C.line, paddingVertical: 8, paddingHorizontal: 18 }}>
        <Icon name="coin" size={32} />
        <T style={{ fontFamily: F.title, fontSize: 28 }}>+{fmt(E.dailyCoins(s, step))}</T>
      </View>
      <Btn label="Ouvrir" icon="wrapped_gift" onPress={onClaim} style={{ alignSelf: 'stretch' }} />
    </Modal>
  );
}

export function BossIntroModal({ s, onFight, onCancel }: { s: State; onFight: () => void; onCancel: () => void }) {
  const lvl = s.boss.level;
  const def = B.bossOf(lvl);
  // Force disponible sur le plateau : aide à décider sans rien promettre.
  const power = s.items.reduce((a, it) => a + B.bossDamage(it.tier, s.up.power), 0);
  const hp = B.bossHp(lvl);
  return (
    <Modal>
      <Icon name={def.img as ImgName} size={76} />
      <T style={{ fontFamily: F.title, fontSize: 21, textAlign: 'center' }}>
        {def.name} · niv. {lvl}
      </T>
      <T style={{ fontSize: 13, color: C.inkSoft, textAlign: 'center' }}>
        Il veut dévorer ton étal ! Tu as {Math.round(B.BOSS_TIME_MS / 1000)} secondes pour lui lancer tes objets. Plus un objet est fusionné, plus il fait mal.
      </T>
      <View style={{ alignSelf: 'stretch', backgroundColor: C.card, borderRadius: 16, borderWidth: 2, borderColor: C.line, padding: 10, gap: 4 }}>
        <T style={{ fontFamily: F.semi, fontSize: 13 }}>Points de vie : {fmt(hp)}</T>
        <T style={{ fontSize: 12, color: power >= hp ? C.greenDark : C.redDark }}>
          Objets sur ton étal : {fmt(power)} dégâts{power >= hp ? ' — de quoi le battre.' : ' — il faudra en produire pendant le combat.'}
        </T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <T style={{ fontSize: 12, color: C.inkSoft }}>Victoire :</T>
          <Icon name="coin" size={14} />
          <T style={{ fontFamily: F.semi, fontSize: 13 }}>{fmt(B.bossCoins(lvl) * E.coinMult(s, s.lastSeen))}</T>
          <Icon name="star" size={14} style={{ marginLeft: 4 }} />
          <T style={{ fontFamily: F.semi, fontSize: 13 }}>{B.bossStars(lvl)}</T>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, alignSelf: 'stretch' }}>
        <Btn label="Plus tard" color={C.greyDark} dark="#8A7D6B" onPress={onCancel} style={{ flex: 1 }} />
        <Btn label="Combattre" icon="crossed_swords" color="#7B4BC9" dark="#5B3A99" onPress={onFight} style={{ flex: 1.3 }} />
      </View>
    </Modal>
  );
}

export function RewardModal({ data, onClose }: { data: Reward; onClose: () => void }) {
  return (
    <Modal>
      <Icon name={data.img} size={68} />
      <T style={{ fontFamily: F.title, fontSize: 22, textAlign: 'center' }}>{data.title}</T>
      <T style={{ fontSize: 13, color: C.inkSoft, textAlign: 'center' }}>{data.text}</T>
      {data.coins > 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="coin" size={26} />
          <T style={{ fontFamily: F.title, fontSize: 22 }}>+{fmt(data.coins)}</T>
          {data.stars ? (
            <>
              <Icon name="star" size={24} style={{ marginLeft: 8 }} />
              <T style={{ fontFamily: F.title, fontSize: 22 }}>+{data.stars}</T>
            </>
          ) : null}
        </View>
      ) : null}
      <Btn label="Super !" onPress={onClose} style={{ alignSelf: 'stretch' }} />
    </Modal>
  );
}
