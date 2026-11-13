// Écran du jeu : bandeau (niveau, pièces), commandes ou combat, boosts, plateau, stands, barre du bas et fenêtres.
import { ComponentRef, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, AppState, Easing, Platform, Pressable, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as B from '../game/balance';
import type { ChainId } from '../game/balance';
import * as E from '../game/engine';
import type { Ev, Offline, Order, State } from '../game/engine';
import { useGame } from '../game/useGame';
import { Board, BoardHandle } from './Board';
import { ImgName } from './images';
import { BossIntroModal, CollectionSheet, DailyModal, LevelUpModal, MissionsSheet, OfflineModal, RewardModal, SettingsSheet, TrophiesSheet, UpgradesSheet } from './Sheets';
import { buzz, pauseMusic, play, playMerge, setMusic, setSoundEnabled, startAudio } from './sfx';
import { Btn, C, F, fmt, fmtClock, fmtRate, Icon, NATIVE, T } from './theme';

const MAX_W = 460;
type SheetName = 'upgrades' | 'collection' | 'settings' | 'missions' | 'trophies' | null;
export type LevelUp = { level: number; coins: number; unlocked: ChainId | null };
export type Reward = { img: ImgName; title: string; text: string; coins: number; stars?: number };
type Rect = { x: number; y: number; w: number; h: number };
type ViewRef = ComponentRef<typeof View>;

function measureRect(ref: { current: ViewRef | null }, into: { current: Rect }) {
  const el = ref.current as unknown as { getBoundingClientRect?: () => { left: number; top: number; width: number; height: number } } | null;
  if (Platform.OS === 'web' && el?.getBoundingClientRect) {
    const r = el.getBoundingClientRect();
    into.current = { x: r.left, y: r.top, w: r.width, h: r.height };
  } else ref.current?.measureInWindow((x, y, w, h) => (into.current = { x, y, w, h }));
}
const inRect = (r: Rect, px: number, py: number) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;

// ---------- Petits composants ----------

/** Halo qui pulse autour de l'élément à toucher. */
function Pulse({ radius = 16, color = C.gold }: { radius?: number; color?: string }) {
  const a = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(a, { toValue: 1, duration: 1000, easing: Easing.out(Easing.quad), useNativeDriver: NATIVE }));
    loop.start();
    return () => loop.stop();
  }, [a]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: -4,
        top: -4,
        right: -4,
        bottom: -4,
        borderRadius: radius,
        borderWidth: 3,
        borderColor: color,
        opacity: a.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
        transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.14] }) }],
      }}
    />
  );
}

function Badge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', right: -3, top: -5, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: C.gold, borderWidth: 2, borderColor: C.white, alignItems: 'center', justifyContent: 'center' }}>
      <T style={{ fontFamily: F.title, fontSize: 10, lineHeight: 13, color: C.ink }}>{n}</T>
    </View>
  );
}

/** Store rayé du marché, tout en haut. */
/** Petits passants qui traversent l'auvent de temps en temps (pure décoration). */
const VISITORS: ImgName[] = ['cat', 'duck', 'chicken', 'hedgehog', 'chipmunk', 'turtle'];

function Visitor({ width }: { width: number }) {
  const [walk] = useState(() => new Animated.Value(0));
  const [step] = useState(() => new Animated.Value(0));
  const [who, setWho] = useState<{ img: ImgName; ms: number } | null>(null);
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const next = (delay: number) => {
      timer = setTimeout(() => {
        if (!alive) return;
        const img = VISITORS[Math.floor(Math.random() * VISITORS.length)];
        const ms = img === 'turtle' ? 16000 : img === 'hedgehog' ? 11000 : 7500;
        setWho({ img, ms });
        walk.setValue(0);
        Animated.timing(walk, { toValue: 1, duration: ms, easing: Easing.linear, useNativeDriver: NATIVE }).start(() => {
          if (!alive) return;
          setWho(null);
          next(18000 + Math.random() * 25000);
        });
      }, delay);
    };
    next(6000);
    const hop = Animated.loop(
      Animated.sequence([
        Animated.timing(step, { toValue: 1, duration: 170, easing: Easing.out(Easing.quad), useNativeDriver: NATIVE }),
        Animated.timing(step, { toValue: 0, duration: 170, easing: Easing.in(Easing.quad), useNativeDriver: NATIVE }),
      ]),
    );
    hop.start();
    return () => {
      alive = false;
      clearTimeout(timer);
      hop.stop();
    };
  }, [walk, step]);
  if (!who) return null;
  // Les emojis regardent vers la gauche : ils marchent de droite à gauche.
  const x = walk.interpolate({ inputRange: [0, 1], outputRange: [width + 10, -40] });
  const y = step.interpolate({ inputRange: [0, 1], outputRange: [0, -3] });
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 3, left: 0, transform: [{ translateX: x }, { translateY: y }] }}>
      <Icon name={who.img} size={24} />
    </Animated.View>
  );
}

const Awning = memo(function Awning({ width }: { width: number }) {
  const n = Math.max(9, Math.round(width / 36) | 1); // impair : rouge aux deux bords
  const w = width / n;
  // Le volant de l'auvent ondule doucement au vent.
  const [wind] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(wind, { toValue: 1, duration: 3200, easing: Easing.linear, useNativeDriver: NATIVE }));
    loop.start();
    return () => loop.stop();
  }, [wind]);
  const IN = [0, 0.25, 0.5, 0.75, 1];
  const flap = [0, 1, 2, 3].map((k) => wind.interpolate({ inputRange: IN, outputRange: IN.map((t) => 2.2 * Math.sin(2 * Math.PI * (t + k / 4))) }));
  return (
    <View style={{ backgroundColor: C.bg, zIndex: 2 }}>
      <View style={{ height: 5, backgroundColor: C.redDark }} />
      <View style={{ flexDirection: 'row', height: 26 }}>
        {Array.from({ length: n }, (_, i) => (
          <Animated.View
            key={i}
            style={{ width: w, height: 26, backgroundColor: i % 2 ? C.white : C.red, borderBottomLeftRadius: w / 2, borderBottomRightRadius: w / 2, boxShadow: '0px 3px 0px rgba(59,42,37,0.16)', transform: [{ translateY: flap[i % 4] }] }}
          />
        ))}
      </View>
      <Visitor width={width} />
    </View>
  );
});

const pill = { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, backgroundColor: C.card, borderRadius: 16, borderWidth: 2, borderColor: C.line, paddingVertical: 4, paddingHorizontal: 8, gap: 6 };

const Header = memo(function Header({ level, stars, coins, rate, ribbons, boosted }: { level: number; stars: number; coins: number; rate: number; ribbons: number; boosted: boolean }) {
  const need = B.starsForLevel(level);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingTop: 5, paddingBottom: 5, gap: 8 }}>
      <View style={pill}>
        <Icon name="star" size={26} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <T style={{ fontFamily: F.title, fontSize: 14, lineHeight: 17 }}>Niveau {level}</T>
            {ribbons > 0 ? (
              <>
                <Icon name="rosette" size={13} />
                <T style={{ fontFamily: F.semi, fontSize: 11, lineHeight: 14, color: C.redDark }}>{ribbons}</T>
              </>
            ) : null}
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: C.line, overflow: 'hidden', marginTop: 2 }}>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: C.gold, width: `${Math.min(100, (stars / need) * 100)}%` }} />
          </View>
        </View>
        <T style={{ fontSize: 11, color: C.inkSoft }}>
          {stars}/{need}
        </T>
      </View>
      <View style={pill}>
        <Icon name="coin" size={26} />
        <View style={{ flex: 1 }}>
          <T style={{ fontFamily: F.title, fontSize: 17, lineHeight: 19 }} numberOfLines={1}>
            {fmt(coins)}
          </T>
          <T style={{ fontSize: 11, lineHeight: 13, color: boosted ? '#E8612D' : C.greenDark }} numberOfLines={1}>
            +{fmtRate(rate)} / s{boosted ? ' ×2' : ''}
          </T>
        </View>
      </View>
    </View>
  );
});

// ---------- Commandes ----------

function OrderCard({ slot, order, s, now, pulse, onDeliver, onSkip }: { slot: number; order: Order | null; s: State; now: number; pulse: boolean; onDeliver: (slot: number) => void; onSkip: (slot: number) => void }) {
  const base = { flex: 1, borderRadius: 16, borderWidth: 2, borderColor: C.line, backgroundColor: C.card, padding: 6, height: 98, alignItems: 'center' as const, justifyContent: 'space-between' as const };
  if (!order) {
    const locked = s.orders[slot].wait > 1e9;
    return (
      <View style={[base, { justifyContent: 'center', opacity: 0.7, gap: 4 }]}>
        <Icon name={locked ? 'locked' : 'hourglass_done'} size={26} />
        <T style={{ fontSize: 11, color: C.inkSoft, textAlign: 'center' }}>{locked ? 'Livre une commande' : 'Un client arrive…'}</T>
      </View>
    );
  }
  const used = E.matchOrder(s.items, order);
  // Coche par objet : on rejoue l'appariement sans réutiliser deux fois le même objet du plateau.
  const taken: number[] = [];
  const have = order.needs.map((n) => {
    const it = s.items.find((x) => x.chain === n.chain && x.tier === n.tier && !taken.includes(x.id));
    if (it) taken.push(it.id);
    return !!it;
  });
  const canSkip = s.ordersDone >= B.FIRST_ORDERS.length;
  const size = order.needs.length > 2 ? 28 : 34;
  return (
    <View style={[base, used ? { borderColor: C.green } : null]}>
      <View style={{ flexDirection: 'row', gap: 2, justifyContent: 'center' }}>
        {order.needs.map((n, i) => (
          <View key={i} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: B.CHAINS[n.chain].soft }}>
            <Icon name={B.CHAINS[n.chain].items[n.tier - 1].img as ImgName} size={size - 7} style={{ opacity: have[i] ? 1 : 0.55 }} />
            <T style={{ position: 'absolute', left: 2, top: -1, fontFamily: F.title, fontSize: 9, color: B.CHAINS[n.chain].color }}>{n.tier}</T>
            {have[i] ? <Icon name="check_mark_button" size={13} style={{ position: 'absolute', right: -2, bottom: -2 }} /> : null}
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        <Icon name="coin" size={13} />
        <T style={{ fontFamily: F.semi, fontSize: 12 }}>{fmt(E.orderCoins(s, order, now))}</T>
        <Icon name="star" size={13} style={{ marginLeft: 3 }} />
        <T style={{ fontFamily: F.semi, fontSize: 12 }}>{order.stars}</T>
      </View>
      <View style={{ alignSelf: 'stretch' }}>
        {pulse && used ? <Pulse radius={16} /> : null}
        <Btn label="Livrer" small disabled={!used} onPress={() => onDeliver(slot)} />
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', left: -6, top: -8, width: 26, height: 26, borderRadius: 13, backgroundColor: C.card, borderWidth: 2, borderColor: used ? C.green : C.line, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={B.FACES[(order.face ?? 0) % B.FACES.length] as ImgName} size={18} />
      </View>
      {canSkip && !used ? (
        <Pressable onPress={() => onSkip(slot)} hitSlop={6} style={{ position: 'absolute', right: -5, top: -5, width: 20, height: 20, borderRadius: 10, backgroundColor: C.grey, alignItems: 'center', justifyContent: 'center' }}>
          <T style={{ fontFamily: F.title, fontSize: 11, lineHeight: 14, color: C.white }}>✕</T>
        </Pressable>
      ) : null}
    </View>
  );
}

// ---------- Combat : le Glouton ----------

function BossPanel({ s, now, hitKey, dragging }: { s: State; now: number; hitKey: number; dragging: boolean }) {
  const def = B.bossOf(s.boss.level);
  const max = B.bossHp(s.boss.level);
  const left = Math.max(0, s.boss.until - now);
  const shake = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    if (!hitKey) return;
    shake.setValue(1);
    Animated.timing(shake, { toValue: 0, duration: 350, easing: Easing.out(Easing.quad), useNativeDriver: NATIVE }).start();
  }, [hitKey, shake]);
  return (
    <View style={{ flex: 1, height: 98, borderRadius: 16, borderWidth: 3, borderColor: dragging ? C.red : '#7B4BC9', borderStyle: dragging ? 'dashed' : 'solid', backgroundColor: '#EFE3FF', flexDirection: 'row', alignItems: 'center', padding: 8, gap: 10 }}>
      <Animated.View
        style={{
          transform: [
            { translateX: shake.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, -7, 7, -5, 0] }) },
            { scale: shake.interpolate({ inputRange: [0, 1], outputRange: [1, 0.86] }) },
          ],
        }}>
        <Icon name={def.img as ImgName} size={70} />
      </Animated.View>
      <View style={{ flex: 1, gap: 4 }}>
        <T style={{ fontFamily: F.title, fontSize: 15 }} numberOfLines={1}>
          {def.name} · niv. {s.boss.level}
        </T>
        <View style={{ height: 16, borderRadius: 8, backgroundColor: '#D5C2F2', overflow: 'hidden', justifyContent: 'center' }}>
          <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 8, backgroundColor: C.red, width: `${Math.max(0, Math.min(100, (s.boss.hp / max) * 100))}%` }} />
          <T style={{ fontFamily: F.title, fontSize: 11, lineHeight: 14, color: C.white, textAlign: 'center', textShadowColor: C.ink, textShadowRadius: 2 }}>
            {fmt(Math.max(0, s.boss.hp))} / {fmt(max)}
          </T>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="stopwatch" size={14} />
          <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: '#D5C2F2', overflow: 'hidden' }}>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: left < 15000 ? C.red : '#7B4BC9', width: `${(left / B.BOSS_TIME_MS) * 100}%` }} />
          </View>
          <T style={{ fontFamily: F.semi, fontSize: 12, width: 34 }}>{fmtClock(left)}</T>
        </View>
        <T style={{ fontSize: 11, color: '#5B3A99' }}>Glisse tes objets ici pour l&apos;attaquer !</T>
      </View>
    </View>
  );
}

// ---------- Boosts et défi ----------

function Chip({ img, label, color, state, onPress, pulse }: { img: ImgName; label: string; color: string; state: 'ready' | 'active' | 'wait' | 'locked'; onPress: () => void; pulse?: boolean }) {
  const bg = state === 'active' ? color : state === 'ready' ? C.card : C.line;
  return (
    <Pressable onPress={onPress} style={{ flex: 1 }}>
      {pulse ? <Pulse radius={14} color={color} /> : null}
      <View style={{ height: 34, borderRadius: 12, borderWidth: 2, borderColor: state === 'ready' || state === 'active' ? color : C.grey, backgroundColor: bg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 3 }}>
        <Icon name={state === 'locked' ? 'locked' : img} size={18} style={{ opacity: state === 'wait' || state === 'locked' ? 0.5 : 1 }} />
        <T style={{ fontFamily: F.semi, fontSize: 11.5, color: state === 'active' ? C.white : state === 'ready' ? C.ink : C.inkSoft }} numberOfLines={1}>
          {label}
        </T>
      </View>
    </Pressable>
  );
}

// ---------- Stands (générateurs) ----------

function GenButton({ chain, s, pulse, fast, onTap }: { chain: ChainId; s: State; pulse: boolean; fast: boolean; onTap: (c: ChainId, pageX: number, pageY: number) => void }) {
  const def = B.CHAINS[chain];
  const g = s.gens[chain];
  const cap = B.genCap(s.up.cap);
  const bounce = useState(() => new Animated.Value(1))[0];
  if (!E.chainUnlocked(s, chain)) {
    return (
      <View style={{ flex: 1, height: 68, borderRadius: 14, backgroundColor: C.line, alignItems: 'center', justifyContent: 'center', gap: 1 }}>
        <Icon name="locked" size={20} style={{ opacity: 0.7 }} />
        <T style={{ fontSize: 9.5, color: C.inkSoft }}>Niv. {def.unlockLevel}</T>
      </View>
    );
  }
  const full = g.charges >= cap;
  const prog = full ? 1 : g.prog / B.genPeriodMs(g.level);
  return (
    <Pressable
      style={{ flex: 1 }}
      onPress={(e) => {
        bounce.setValue(0.88);
        Animated.spring(bounce, { toValue: 1, friction: 3, tension: 200, useNativeDriver: NATIVE }).start();
        onTap(chain, e.nativeEvent.pageX, e.nativeEvent.pageY);
      }}>
      {pulse ? <Pulse radius={16} /> : null}
      <Animated.View style={{ height: 68, borderRadius: 14, backgroundColor: def.color, paddingBottom: 4, transform: [{ scale: bounce }], opacity: g.charges > 0 ? 1 : 0.6 }}>
        <View style={{ flex: 1, borderRadius: 14, backgroundColor: def.soft, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: def.color }}>
          <Icon name={def.maker as ImgName} size={32} />
          <View style={{ width: '74%', height: 5, borderRadius: 3, backgroundColor: 'rgba(74,47,27,0.15)', overflow: 'hidden', marginTop: 2 }}>
            <View style={{ height: 5, borderRadius: 3, backgroundColor: fast ? '#E0A800' : def.color, width: `${Math.round(prog * 100)}%` }} />
          </View>
        </View>
      </Animated.View>
      <View style={{ position: 'absolute', right: -3, top: -6, minWidth: 22, paddingHorizontal: 4, height: 18, borderRadius: 9, backgroundColor: g.charges > 0 ? def.color : C.greyDark, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.white }}>
        <T style={{ fontFamily: F.title, fontSize: 10.5, lineHeight: 13, color: C.white }}>{g.charges}</T>
      </View>
    </Pressable>
  );
}

function NavBtn({ img, color, dark, badge, onPress }: { img: ImgName; color: string; dark: string; badge?: number; onPress: () => void }) {
  return (
    <View style={{ flex: 1 }}>
      <Btn label="" icon={img} color={color} dark={dark} onPress={onPress} />
      <Badge n={badge ?? 0} />
    </View>
  );
}

// ---------- Écran ----------

export function Game() {
  const dims = useWindowDimensions();
  const [offline, setOffline] = useState<Offline | null>(null);
  const [toast, setToast] = useState<{ id: number; text: string; img?: ImgName } | null>(null);
  const toastAnim = useState(() => new Animated.Value(0))[0];
  const say = useCallback(
    (text: string, img?: ImgName) => {
      setToast({ id: Date.now(), text, img });
      toastAnim.stopAnimation();
      toastAnim.setValue(0);
      Animated.sequence([
        Animated.spring(toastAnim, { toValue: 1, friction: 6, tension: 120, useNativeDriver: NATIVE }),
        Animated.delay(1700),
        Animated.timing(toastAnim, { toValue: 0, duration: 250, useNativeDriver: NATIVE }),
      ]).start();
    },
    [toastAnim],
  );
  const onBossLost = useCallback(() => {
    play('flee');
    say('Le Glouton s’est enfui… Prépare de plus gros objets !', 'ogre');
  }, [say]);
  const { state: s, act, patch, reset } = useGame(setOffline, onBossLost);
  const [sheet, setSheet] = useState<SheetName>(null);
  const [levelUp, setLevelUp] = useState<LevelUp | null>(null);
  const [reward, setReward] = useState<Reward | null>(null);
  const [bossIntro, setBossIntro] = useState(false);
  const [dailySeen, setDailySeen] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [hitKey, setHitKey] = useState(0);
  const fx = useRef<BoardHandle>(null);
  const gensRef = useRef<ViewRef>(null);
  const topRef = useRef<ViewRef>(null);
  const sellRect = useRef<Rect>({ x: 0, y: 0, w: 0, h: 0 });
  const topRect = useRef<Rect>({ x: 0, y: 0, w: 0, h: 0 });
  const started = useRef(false);
  const combo = useRef({ n: 0, at: 0 });
  const itemsRef = useRef<E.Item[]>([]);
  const [lastAct, setLastAct] = useState(0);

  const width = Math.min(dims.width, MAX_W);
  // 434 : hauteur de tout ce qui n'est pas le plateau (bandeau, commandes, boosts, info, stands, barre du bas).
  const cs = Math.max(34, Math.min(72, Math.floor(Math.min((width - 24) / B.COLS, (dims.height - 434) / B.ROWS))));

  // Réglages son : appliqués dès le chargement, musique lancée au premier geste (règle des navigateurs).
  const soundOn = s?.sound ?? true;
  const musicOn = s?.music ?? true;
  useEffect(() => setSoundEnabled(soundOn), [soundOn]);
  useEffect(() => setMusic(musicOn), [musicOn]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => pauseMusic(st !== 'active'));
    return () => sub.remove();
  }, []);
  const firstTouch = useCallback(() => {
    if (!started.current) {
      started.current = true;
      startAudio();
    }
    return false;
  }, []);

  // Rejoue les événements du moteur : sons, éclats, messages.
  const react = useCallback(
    (evs: Ev[]) => {
      if (evs.length) setLastAct(Date.now());
      for (const ev of evs) {
        if (ev.t === 'spawn') {
          play('pop');
          fx.current?.burst(ev.cell, undefined, B.CHAINS[ev.chain].color);
        } else if (ev.t === 'merge') {
          playMerge(ev.combo);
          if (ev.lucky || ev.tier >= 7) play('rare');
          buzz('light');
          fx.current?.burst(ev.cell, ev.lucky ? `Fusion en or ! +${fmt(ev.coins)}` : ev.combo >= 1 ? `Combo ×${ev.combo + 1}  +${fmt(ev.coins)}` : `+${fmt(ev.coins)}`, ev.lucky ? C.gold : B.CHAINS[ev.chain].color, true);
        } else if (ev.t === 'found') {
          const it = B.CHAINS[ev.chain].items[ev.tier - 1];
          play('found');
          say(`Nouveau : ${it.name} !  +${fmt(ev.coins)}`, it.img as ImgName);
        } else if (ev.t === 'sell') {
          play('coin');
          fx.current?.burst(ev.cell, `+${fmt(ev.coins)}`, C.gold);
        } else if (ev.t === 'order') {
          play('order');
          buzz('success');
          say(`Commande livrée !  +${fmt(ev.coins)}`, 'coin');
        } else if (ev.t === 'levelup') {
          play('levelup');
          setLevelUp({ level: ev.level, coins: ev.coins, unlocked: ev.unlocked });
        } else if (ev.t === 'upgrade') {
          play('buy');
          buzz('success');
        } else if (ev.t === 'reward') {
          play(ev.text === 'Coffre de palier' ? 'chest' : ev.text === 'Cadeau du jour' ? 'daily' : 'quest');
          say(ev.coins > 0 ? `${ev.text} !  +${fmt(ev.coins)}` : `${ev.text} !`, ev.text === 'Coffre de palier' ? 'wrapped_gift' : 'coin');
        } else if (ev.t === 'boost') {
          play('boost');
          buzz('success');
        } else if (ev.t === 'bossStart') {
          play('boss');
        } else if (ev.t === 'hit') {
          play('hit');
          buzz('light');
          setHitKey((k) => k + 1);
          fx.current?.burst(ev.cell, `-${fmt(ev.dmg)}`, C.red, true);
        } else if (ev.t === 'bossWin') {
          play('quest');
          buzz('success');
          setReward({ img: B.bossOf(ev.level).img as ImgName, title: 'Glouton repoussé !', text: `${B.bossOf(ev.level).name} (niv. ${ev.level}) a pris la fuite. Le suivant sera plus coriace.`, coins: ev.coins, stars: ev.stars });
        } else if (ev.t === 'move') {
          play('drop');
        } else if (ev.t === 'full') {
          play('error');
          buzz('error');
          say("L'étal est plein : fusionne, livre ou vends.", 'package');
        } else if (ev.t === 'empty') {
          play('error');
          say('Ce stand se recharge…', 'hourglass_done');
        } else if (ev.t === 'poor') {
          play('poor');
          say('Pas assez de pièces.', 'coin');
        }
      }
    },
    [say],
  );
  const run = useCallback((fn: (st: State, now: number) => E.Res) => react(act((st) => fn(st, Date.now()))), [act, react]);

  const onDrop = useCallback(
    (id: number, cell: number) => {
      const now = Date.now();
      // Fusions enchaînées : le combo monte tant qu'on fusionne vite, et retombe sinon.
      const n = now - combo.current.at < B.COMBO_WINDOW_MS ? combo.current.n : 0;
      const evs = act((st) => E.moveItem(st, id, cell, now, n));
      if (evs.some((e) => e.t === 'merge')) combo.current = { n: n + 1, at: now };
      react(evs);
      setSelected(null);
      return evs.length > 0;
    },
    [act, react],
  );
  // Deuxième toucher sur un objet sélectionné : il rejoint tout seul son jumeau, s'il en a un.
  const onAgain = useCallback(
    (id: number) => {
      const list = itemsRef.current;
      const it = list.find((x) => x.id === id);
      const twin = it && list.find((x) => x.id !== id && x.chain === it.chain && x.tier === it.tier);
      return it && twin && it.tier < B.MAX_TIER ? onDrop(id, twin.cell) : false;
    },
    [onDrop],
  );
  // Objet lâché hors du plateau : sur le Glouton (en combat) ou sur la zone de vente.
  const onThrow = useCallback(
    (id: number, px: number, py: number) => {
      const now = Date.now();
      let evs: Ev[] = [];
      if (inRect(topRect.current, px, py)) evs = act((st) => E.hitBoss(st, id, now));
      else if (inRect(sellRect.current, px, py)) evs = act((st) => (E.bossFighting(st, now) ? { s: st, ev: [] } : E.sellItem(st, id, now)));
      react(evs);
      setSelected(null);
      return evs.length > 0;
    },
    [act, react],
  );
  const onDragChange = useCallback((d: boolean) => {
    if (d) {
      play('lift');
      measureRect(gensRef, sellRect);
      measureRect(topRef, topRect);
    }
    setDragging(d);
  }, []);
  const onTapGen = useCallback(
    (chain: ChainId, px: number, py: number) => {
      const evs = act((st) => E.tapGen(st, chain, Date.now()));
      for (const e of evs) if (e.t === 'spawn') fx.current?.flyFrom(e.id, px, py);
      react(evs);
    },
    [act, react],
  );
  const onDeliver = useCallback((slot: number) => run((st, now) => E.deliver(st, slot, now)), [run]);
  const onSkip = useCallback((slot: number) => run((st) => E.skipOrder(st, slot)), [run]);

  // Bruit de carnet qui s'ouvre / se ferme pour les panneaux.
  const prevSheet = useRef<SheetName>(null);
  useEffect(() => {
    if (sheet !== prevSheet.current) play(sheet ? 'open' : 'close');
    prevSheet.current = sheet;
  }, [sheet]);

  const items = s?.items;
  useEffect(() => {
    itemsRef.current = items ?? [];
  }, [items]);
  const boardLvl = s?.up.board ?? 0;
  const open = useMemo(() => B.CELL_ORDER.slice(0, B.openCellCount(boardLvl)), [boardLvl]);
  const nextCells = useMemo(() => B.CELL_ORDER.slice(B.openCellCount(boardLvl), B.openCellCount(boardLvl) + B.CELLS_PER_UPGRADE), [boardLvl]);

  // Guidage : paire à fusionner (montrée par la main tant que le joueur n'a pas fait quelques fusions).
  const merges = s?.life.merges ?? 0;
  const tuto = s?.tuto ?? E.TUTO.done;
  // … puis à nouveau dès qu'il reste un moment sans rien faire.
  const idle = !!s && lastAct > 0 && s.lastSeen - lastAct > B.IDLE_HINT_MS;
  let hintFrom = -1;
  let hintTo = -1;
  if (items && (tuto === E.TUTO.merge || merges < 3 || idle)) {
    for (const a of items) {
      const b = items.find((x) => x.id !== a.id && x.chain === a.chain && x.tier === a.tier);
      if (b && a.tier < B.MAX_TIER) {
        hintFrom = a.cell;
        hintTo = b.cell;
        break;
      }
    }
  }

  if (!s || !items) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  const now = s.lastSeen;
  const fighting = E.bossFighting(s, now);
  const coinBoost = E.boostActive(s, 'coins', now);
  const rate = E.incomePerSec(s);
  const cheapest = Math.min(
    ...B.UPGRADE_IDS.filter((u) => s.up[u] < B.UPGRADES[u].max).map((u) => B.UPGRADES[u].cost(s.up[u])),
    ...B.CHAIN_IDS.filter((c) => E.chainUnlocked(s, c) && s.gens[c].level < B.GEN_MAX_LEVEL).map((c) => B.genCost(c, s.gens[c].level)),
  );
  const canBuy = s.coins >= cheapest;
  const sel = selected !== null ? items.find((x) => x.id === selected) : undefined;
  const dailyReady = E.dailyReady(s, now);
  const bossReady = E.bossUnlocked(s) && !fighting && now >= s.boss.ready;

  let info: string;
  if (sel) info = `${B.CHAINS[sel.chain].items[sel.tier - 1].name} · palier ${sel.tier} · vente ${fmt(E.sellValue(s, sel.tier, now))}`;
  else if (fighting) info = 'Plus un objet est fusionné, plus il fait mal au Glouton !';
  else if (tuto === E.TUTO.merge) info = 'Glisse un épi de blé sur son jumeau pour les fusionner !';
  else if (tuto === E.TUTO.tapGen) info = 'Bravo ! Touche le Fournil pour sortir de nouveaux épis.';
  else if (tuto === E.TUTO.deliver) info = 'Prépare ce que demande le client, puis touche « Livrer ».';
  else if (tuto === E.TUTO.upgrade) info = canBuy ? 'Tu as assez de pièces : ouvre « Améliorer » !' : 'Fusionne et livre pour gagner des pièces.';
  else if (dragging) info = 'Dépose sur un jumeau pour fusionner, ou en bas pour vendre.';
  else if (s.life.merges < 30) info = 'Astuce : touche deux fois un objet pour le fusionner avec son jumeau.';
  else info = 'Chaque découverte augmente ton revenu, même hors ligne.';

  const modalOpen = !!offline || !!levelUp || !!reward || bossIntro;
  const showDaily = dailyReady && !dailySeen && !modalOpen && !fighting && sheet === null;

  return (
    <View style={{ flex: 1, backgroundColor: C.page, alignItems: 'center' }} onStartShouldSetResponderCapture={firstTouch}>
      <SafeAreaView style={{ flex: 1, width, backgroundColor: C.bg }} edges={['top', 'bottom']}>
        <Awning width={width} />
        <Header level={s.level} stars={s.stars} coins={s.coins} rate={rate * (coinBoost ? B.BOOST_COIN_MULT : 1)} ribbons={s.ribbons} boosted={coinBoost} />

        <View ref={topRef} style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 10, paddingTop: 3 }}>
          {fighting ? <BossPanel s={s} now={now} hitKey={hitKey} dragging={dragging} /> : s.orders.map((o, i) => <OrderCard key={i} slot={i} order={o.order} s={s} now={now} pulse={tuto === E.TUTO.deliver} onDeliver={onDeliver} onSkip={onSkip} />)}
        </View>

        {/* Boosts et défi du Glouton */}
        <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 10, paddingTop: 8 }}>
          {B.BOOST_IDS.map((id) => {
            const def = B.BOOSTS[id];
            const b = s.boosts[id];
            const unlocked = E.boostUnlocked(s, id);
            const state = !unlocked ? 'locked' : now < b.until ? 'active' : now < b.ready ? 'wait' : 'ready';
            const label = state === 'locked' ? `Niv. ${def.unlockLevel}` : state === 'active' ? fmtClock(b.until - now) : state === 'wait' ? fmtClock(b.ready - now) : 'Prêt';
            return (
              <Chip
                key={id}
                img={def.img as ImgName}
                color={def.color}
                state={state}
                label={label}
                onPress={() => {
                  if (state === 'ready') {
                    run((st, t) => E.startBoost(st, id, t));
                    say(`${def.name} : ${def.desc.toLowerCase()} !`, def.img as ImgName);
                  } else if (state === 'locked') say(`${def.name} : au niveau ${def.unlockLevel}.`, 'locked');
                  else say(`${def.name} : ${def.desc.toLowerCase()}.`, def.img as ImgName);
                }}
              />
            );
          })}
          <Chip
            img={B.bossOf(s.boss.level).img as ImgName}
            color="#7B4BC9"
            state={!E.bossUnlocked(s) ? 'locked' : fighting ? 'active' : bossReady ? 'ready' : 'wait'}
            label={!E.bossUnlocked(s) ? `Niv. ${B.BOSS_UNLOCK_LEVEL}` : fighting ? 'Combat !' : bossReady ? `Défi ${s.boss.level}` : fmtClock(s.boss.ready - now)}
            pulse={bossReady && s.life.bosses === 0}
            onPress={() => {
              if (bossReady) setBossIntro(true);
              else if (!E.bossUnlocked(s)) say(`Les Gloutons arrivent au niveau ${B.BOSS_UNLOCK_LEVEL}.`, 'locked');
              else if (!fighting) say('Le prochain Glouton approche…', 'hourglass_done');
            }}
          />
        </View>

        <View style={{ height: 30, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 }}>
          <T style={{ fontSize: 12, lineHeight: 14, color: tuto < E.TUTO.done && !sel ? C.redDark : C.inkSoft, textAlign: 'center', fontFamily: tuto < E.TUTO.done ? F.bold : F.text }} numberOfLines={2}>
            {info}
          </T>
        </View>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ padding: 4, borderRadius: 22, backgroundColor: C.red, borderBottomWidth: 6, borderColor: C.redDark, boxShadow: '0px 6px 14px rgba(181,42,34,0.25)' }}>
            <View style={{ padding: 3, borderRadius: 17, backgroundColor: C.white }}>
            <Board ref={fx} items={items} open={open} nextCells={nextCells} cs={cs} selected={selected} hintFrom={hintFrom} hintTo={hintTo} onDrop={onDrop} onThrow={onThrow} onSelect={setSelected} onAgain={onAgain} onDragChange={onDragChange} />
            </View>
          </View>
        </View>

        <View ref={gensRef} style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 10, paddingTop: 10 }}>
          {B.CHAIN_IDS.map((c) => (
            <GenButton key={c} chain={c} s={s} pulse={tuto === E.TUTO.tapGen && c === 'fournil'} fast={E.boostActive(s, 'speed', now)} onTap={onTapGen} />
          ))}
          {/* Pendant qu'on déplace un objet, la rangée des stands devient la zone de vente. */}
          {dragging && !fighting && tuto >= E.TUTO.upgrade ? (
            <View pointerEvents="none" style={{ position: 'absolute', left: 6, right: 6, top: 4, bottom: -4, borderRadius: 16, borderWidth: 3, borderStyle: 'dashed', borderColor: C.red, backgroundColor: 'rgba(255,225,220,0.96)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Icon name="wastebasket" size={30} />
              <T style={{ fontFamily: F.title, fontSize: 17, color: C.redDark }}>Déposer ici pour vendre</T>
            </View>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 10, paddingTop: 10, paddingBottom: 8 }}>
          <View style={{ flex: 2.4 }}>
            {tuto === E.TUTO.upgrade && canBuy ? <Pulse /> : null}
            <Btn label="Améliorer" icon={width >= 380 ? "chart_increasing" : undefined} color={C.red} dark={C.redDark} onPress={() => setSheet("upgrades")} />
            <Badge n={canBuy ? 1 : 0} />
          </View>
          <NavBtn img="clipboard" color="#3B8FD9" dark="#2A6FB0" badge={E.missionsReady(s) + (dailyReady ? 1 : 0)} onPress={() => setSheet('missions')} />
          <NavBtn img="open_book" color="#8B6BD9" dark="#6B4DB8" onPress={() => setSheet('collection')} />
          <NavBtn img="trophy" color={C.gold} dark={C.goldDark} badge={E.trophiesReady(s)} onPress={() => setSheet('trophies')} />
          <NavBtn img="gear" color={C.greyDark} dark="#8A7D6B" onPress={() => setSheet('settings')} />
        </View>

        {/* Message éphémère (découverte, commande livrée, étal plein). */}
        {toast ? (
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 74,
              left: 0,
              right: 0,
              alignItems: 'center',
              opacity: toastAnim,
              transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }, { scale: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
              zIndex: 80,
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.ink, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14, maxWidth: width - 30 }}>
              {toast.img ? <Icon name={toast.img} size={26} /> : null}
              <T style={{ color: C.white, fontFamily: F.semi, fontSize: 14, flexShrink: 1 }}>{toast.text}</T>
            </View>
          </Animated.View>
        ) : null}

        {sheet === 'upgrades' ? (
          <UpgradesSheet
            s={s}
            onClose={() => setSheet(null)}
            onBuy={(u) => run((st) => E.buyUpgrade(st, u))}
            onBuyGen={(c) => run((st) => E.buyGen(st, c))}
            onPrestige={() => {
              const gain = E.prestigeGain(s);
              run((st, t) => E.prestige(st, t));
              setSheet(null);
              setSelected(null);
              setReward({ img: 'rosette', title: 'Nouvelle saison !', text: `Tu repars avec ${gain} ruban${gain > 1 ? 's' : ''} de plus : toutes tes pièces sont multipliées pour toujours.`, coins: 0 });
            }}
          />
        ) : null}
        {sheet === 'missions' ? <MissionsSheet s={s} now={now} onClose={() => setSheet(null)} onClaim={(id) => run((st) => E.claimMission(st, id))} onDaily={() => run((st, t) => E.claimDaily(st, t))} /> : null}
        {sheet === 'trophies' ? <TrophiesSheet s={s} onClose={() => setSheet(null)} onClaim={(id) => run((st) => E.claimTrophy(st, id))} /> : null}
        {sheet === 'collection' ? <CollectionSheet s={s} onClose={() => setSheet(null)} /> : null}
        {sheet === 'settings' ? (
          <SettingsSheet
            s={s}
            onClose={() => setSheet(null)}
            onSound={(v) => patch({ sound: v })}
            onMusic={(v) => patch({ music: v })}
            onReset={() => {
              reset();
              setSheet(null);
              setSelected(null);
            }}
          />
        ) : null}

        {showDaily ? (
          <DailyModal
            s={s}
            now={now}
            onClaim={() => {
              run((st, t) => E.claimDaily(st, t));
              setDailySeen(true);
            }}
          />
        ) : null}
        {bossIntro ? (
          <BossIntroModal
            s={s}
            onCancel={() => setBossIntro(false)}
            onFight={() => {
              setBossIntro(false);
              setSheet(null);
              run((st, t) => E.startBoss(st, t));
            }}
          />
        ) : null}
        {reward && !levelUp ? <RewardModal data={reward} onClose={() => setReward(null)} /> : null}
        {levelUp && !offline ? <LevelUpModal data={levelUp} onClose={() => setLevelUp(null)} /> : null}
        {offline ? (
          <OfflineModal
            data={offline}
            capSec={B.offlineCapSec(s.up.offline)}
            onClose={() => {
              play('coin');
              setOffline(null);
            }}
          />
        ) : null}
      </SafeAreaView>
    </View>
  );
}
