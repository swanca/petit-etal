// Plateau de fusion : un comptoir en bois aux cases encastrées sur lequel on glisse les articles.
// Le glisser-déposer ne redessine jamais React pendant le geste : la tuile et la case survolée suivent le doigt
// par Animated.setValue ; l'état du jeu n'est modifié qu'au lâcher.
import { ComponentRef, forwardRef, memo, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Platform, View } from 'react-native';
import { CHAINS, COLS, ROWS } from '../game/balance';
import type { Item } from '../game/engine';
import { ImgName } from './images';
import { C, F, Icon, NATIVE, T } from './theme';

type XY = { x: number; y: number };
type Registry = { off: Map<number, Animated.ValueXY>; from: Map<number, XY> };

const cellXY = (cell: number, cs: number): XY => ({ x: (cell % COLS) * cs, y: Math.floor(cell / COLS) * cs });
/** L'article soulevé remonte un peu : le doigt ne le cache pas. */
const LIFT = 0.28;
/** Lâché à moins de 0,85 case d'un jumeau, l'article est aimanté vers lui. */
const MAGNET = 0.85;

// ---------- Vie : les articles se balancent doucement ----------

// Une seule animation partagée pour tout le plateau (bon marché) ; chaque tuile la lit avec un décalage de phase.
const sway = new Animated.Value(0);
let swayOn = false;
function startSway() {
  if (swayOn) return;
  swayOn = true;
  Animated.loop(Animated.timing(sway, { toValue: 1, duration: 2600, easing: Easing.linear, useNativeDriver: NATIVE })).start();
}
const SWAY_IN = Array.from({ length: 9 }, (_, i) => i / 8);
const wave = (phase: number, amp: number) => SWAY_IN.map((t) => amp * Math.sin(2 * Math.PI * (t + phase / 4)));
const SWAY_Y = [0, 1, 2, 3].map((k) => sway.interpolate({ inputRange: SWAY_IN, outputRange: wave(k, -1.6) }));
const SWAY_R = [0, 1, 2, 3].map((k) => sway.interpolate({ inputRange: SWAY_IN, outputRange: wave(k + 1, 2.2).map((d) => `${d}deg`) }));

// ---------- Tuile ----------

type TileMode = 'idle' | 'drag' | 'match' | 'dim';

const Tile = memo(function Tile({ item, cs, mode, selected, reg }: { item: Item; cs: number; mode: TileMode; selected: boolean; reg: Registry }) {
  const [off] = useState(() => new Animated.ValueXY());
  const [pop] = useState(() => new Animated.Value(0.2));
  const [lift] = useState(() => new Animated.Value(1));
  const [glow] = useState(() => new Animated.Value(0));
  const pos = cellXY(item.cell, cs);
  const def = CHAINS[item.chain];

  useEffect(() => {
    startSway();
    reg.off.set(item.id, off);
    Animated.spring(pop, { toValue: 1, friction: 4, tension: 140, useNativeDriver: NATIVE }).start();
    return () => {
      reg.off.delete(item.id);
      reg.from.delete(item.id);
    };
  }, [item.id, off, pop, reg]);

  // Après un déplacement (ou à la sortie d'un stand), la tuile part de là où elle était à l'écran et glisse vers sa case.
  useLayoutEffect(() => {
    const from = reg.from.get(item.id);
    if (!from) return;
    reg.from.delete(item.id);
    const p = cellXY(item.cell, cs);
    off.setValue({ x: from.x - p.x, y: from.y - p.y });
    Animated.spring(off, { toValue: { x: 0, y: 0 }, friction: 7, tension: 110, useNativeDriver: false }).start();
  }, [item.cell, item.id, cs, off, reg]);

  useEffect(() => {
    Animated.spring(lift, { toValue: mode === 'drag' ? 1.2 : 1, friction: 6, tension: 160, useNativeDriver: NATIVE }).start();
    // Jumeau de l'article qu'on déplace : il « respire » pour dire « pose-le ici ».
    if (mode !== 'match') {
      glow.stopAnimation();
      glow.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 380, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVE }),
        Animated.timing(glow, { toValue: 0, duration: 380, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVE }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [mode, lift, glow]);

  const pad = Math.round(cs * 0.07);
  const ring = mode === 'match' ? C.green : selected || mode === 'drag' ? def.color : C.white;
  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: 'absolute', left: pos.x, top: pos.y, width: cs, height: cs, zIndex: mode === 'drag' ? 20 : mode === 'match' ? 5 : 1, opacity: mode === 'dim' ? 0.45 : 1, transform: off.getTranslateTransform() }}>
      <Animated.View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: Animated.multiply(Animated.multiply(pop, lift), glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] })) }],
        }}>
        <View
          style={{
            position: 'absolute',
            left: pad,
            top: pad,
            right: pad,
            bottom: pad,
            borderRadius: cs * 0.24,
            backgroundColor: mode === 'match' ? '#DDF7E6' : def.soft,
            borderWidth: mode === 'match' || selected || mode === 'drag' ? 3 : 2,
            borderColor: ring,
            boxShadow: mode === 'drag' ? '0px 8px 10px rgba(59,42,37,0.28)' : '0px 3px 0px rgba(59,42,37,0.22)',
          }}
        />
        <Animated.View style={mode === 'idle' ? { transform: [{ translateY: SWAY_Y[item.id % 4] }, { rotate: SWAY_R[item.id % 4] }] } : null}>
          <Icon name={def.items[item.tier - 1].img as ImgName} size={cs * 0.66} />
        </Animated.View>
        <View
          style={{
            position: 'absolute',
            right: pad - 2,
            bottom: pad - 2,
            minWidth: cs * 0.3,
            height: cs * 0.3,
            borderRadius: cs * 0.15,
            backgroundColor: def.color,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
            borderColor: C.white,
          }}>
          <T style={{ fontFamily: F.title, color: C.white, fontSize: cs * 0.19, lineHeight: cs * 0.24 }}>{item.tier}</T>
        </View>
      </Animated.View>
    </Animated.View>
  );
});

// ---------- Effets (éclats, textes qui s'envolent) ----------

type Fx = { id: number; x: number; y: number; text?: string; color: string; big?: boolean };
export type BoardHandle = {
  burst: (cell: number, text: string | undefined, color: string, big?: boolean) => void;
  /** Le prochain article d'identifiant `id` arrivera en volant depuis ce point de l'écran (ex. un stand). */
  flyFrom: (id: number, pageX: number, pageY: number) => void;
};

function FxItem({ fx, cs, done }: { fx: Fx; cs: number; done: () => void }) {
  const [a] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: fx.big ? 1100 : 800, easing: Easing.out(Easing.quad), useNativeDriver: NATIVE }).start(done);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const sparks = fx.big ? 10 : 5;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: fx.x, top: fx.y, width: cs, height: cs, zIndex: 40 }}>
      {fx.big ? (
        <Animated.View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: cs,
            height: cs,
            borderRadius: cs / 2,
            backgroundColor: C.white,
            opacity: a.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0.85, 0, 0] }),
            transform: [{ scale: a.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0.6, 1.5, 1.5] }) }],
          }}
        />
      ) : null}
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: cs,
          height: cs,
          borderRadius: cs / 2,
          borderWidth: 3,
          borderColor: fx.color,
          opacity: a.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.9, 0.3, 0] }),
          transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.5, fx.big ? 2 : 1.5] }) }],
        }}
      />
      {Array.from({ length: sparks }, (_, i) => {
        const ang = (i / sparks) * Math.PI * 2 + fx.id;
        const dist = cs * (fx.big ? 1.15 : 0.8);
        const size = fx.big && i % 3 === 0 ? 11 : 7;
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: cs / 2 - size / 2,
              top: cs / 2 - size / 2,
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: i % 3 === 0 ? C.gold : i % 3 === 1 ? fx.color : C.white,
              borderWidth: i % 3 === 2 ? 1.5 : 0,
              borderColor: fx.color,
              opacity: a.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 0.9, 0] }),
              transform: [
                { translateX: a.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(ang) * dist] }) },
                { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(ang) * dist + cs * 0.25] }) },
                { scale: a.interpolate({ inputRange: [0, 1], outputRange: [1.2, 0.4] }) },
              ],
            }}
          />
        );
      })}
      {fx.text ? (
        <Animated.View
          style={{
            position: 'absolute',
            left: -cs * 1.5,
            width: cs * 4,
            top: -cs * 0.1,
            alignItems: 'center',
            opacity: a.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 1, 0] }),
            transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [0, -cs * 0.9] }) }, { scale: a.interpolate({ inputRange: [0, 0.15, 0.3, 1], outputRange: [0.6, 1.25, 1, 1] }) }],
          }}>
          <T style={{ fontFamily: F.title, fontSize: fx.big ? 20 : 16, color: C.white, textShadowColor: C.ink, textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } }}>{fx.text}</T>
        </Animated.View>
      ) : null}
    </View>
  );
}

const FxLayer = forwardRef<{ burst: BoardHandle['burst'] }, { cs: number }>(function FxLayer({ cs }, ref) {
  const [list, setList] = useState<Fx[]>([]);
  const next = useRef(1);
  useImperativeHandle(ref, () => ({
    burst(cell, text, color, big) {
      const p = cellXY(cell, cs);
      const id = next.current++;
      setList((l) => [...l.slice(-11), { id, x: p.x, y: p.y, text, color, big }]);
    },
  }));
  return (
    <>
      {list.map((fx) => (
        <FxItem key={fx.id} fx={fx} cs={cs} done={() => setList((l) => l.filter((x) => x.id !== fx.id))} />
      ))}
    </>
  );
});

// ---------- Main du guidage ----------

function HintHand({ from, to, cs }: { from: number; to: number; cs: number }) {
  const [a] = useState(() => new Animated.Value(0));
  useEffect(() => {
    a.setValue(0);
    // Une seule animation en boucle (les pauses sont dans les interpolations) : plus fiable qu'une séquence.
    const loop = Animated.loop(Animated.timing(a, { toValue: 1, duration: 1600, easing: Easing.linear, useNativeDriver: NATIVE }));
    loop.start();
    return () => loop.stop();
  }, [a, from, to]);
  const p = cellXY(from, cs);
  const q = cellXY(to, cs);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: p.x + cs * 0.3,
        top: p.y - cs * 0.55,
        zIndex: 30,
        opacity: a.interpolate({ inputRange: [0, 0.1, 0.8, 0.95, 1], outputRange: [0, 1, 1, 0, 0] }),
        transform: [
          { translateX: a.interpolate({ inputRange: [0, 0.2, 0.7, 1], outputRange: [0, 0, q.x - p.x, q.x - p.x] }) },
          { translateY: a.interpolate({ inputRange: [0, 0.2, 0.7, 1], outputRange: [0, 0, q.y - p.y, q.y - p.y] }) },
        ],
      }}>
      <Icon name="hand" size={cs * 0.8} />
    </Animated.View>
  );
}

// ---------- Plateau ----------

type Props = {
  items: Item[];
  open: number[]; // cases ouvertes
  nextCells: number[]; // prochaines cases à ouvrir (cadenas)
  cs: number;
  selected: number | null;
  hintFrom: number; // case de départ de la main du guidage (-1 : pas de main)
  hintTo: number;
  onDrop: (id: number, cell: number) => boolean; // renvoie false si rien n'a changé
  onThrow: (id: number, pageX: number, pageY: number) => boolean; // objet lâché hors du plateau (vente, combat)
  onSelect: (id: number | null) => void;
  onAgain: (id: number) => boolean; // deuxième toucher sur l'objet déjà sélectionné (fusion automatique)
  onDragChange: (dragging: boolean) => void;
};

// Nappe vichy : bandes rouges translucides sur fond blanc.
// Comptoir en planches claires et cases crème encastrées.
const PLANK_A = '#E9BF8B';
const PLANK_B = '#E2B37C';
const PLANK_LINE = 'rgba(150,96,48,0.35)';
const SLOT_A = '#FFF7EC';
const SLOT_B = '#FDEFDC';
const SLOT_SHADE = 'rgba(150,96,48,0.22)';

/** Planches du comptoir : une par rangée, joints décalés comme un vrai plateau en bois. */
const Planks = memo(function Planks({ cs }: { cs: number }) {
  return (
    <>
      {Array.from({ length: ROWS }, (_, r) => {
        const seam = ((r * 37) % 60) / 100 + 0.2;
        return (
          <View key={r} style={{ position: 'absolute', left: 0, right: 0, top: r * cs, height: cs, backgroundColor: r % 2 ? PLANK_B : PLANK_A, borderBottomWidth: r < ROWS - 1 ? 1.5 : 0, borderBottomColor: PLANK_LINE }}>
            <View style={{ position: 'absolute', top: 0, bottom: 0, left: `${seam * 100}%`, width: 1.5, backgroundColor: PLANK_LINE }} />
            <View style={{ position: 'absolute', left: 0, right: 0, top: cs * 0.3, height: 1, backgroundColor: 'rgba(150,96,48,0.10)' }} />
            <View style={{ position: 'absolute', left: 0, right: 0, top: cs * 0.68, height: 1, backgroundColor: 'rgba(150,96,48,0.08)' }} />
          </View>
        );
      })}
    </>
  );
});

export const Board = memo(
  forwardRef<BoardHandle, Props>(function Board(props, ref) {
    const { items, open, nextCells, cs, selected, hintFrom, hintTo } = props;
    const [reg] = useState<Registry>(() => ({ off: new Map(), from: new Map() }));
    const boardRef = useRef<ComponentRef<typeof View>>(null);
    const fxRef = useRef<{ burst: BoardHandle['burst'] }>(null);
    const origin = useRef<XY>({ x: 0, y: 0 });
    const [dragId, setDragId] = useState<number | null>(null);
    // Case survolée pendant le glisser : déplacée sans rendu React.
    const [hov] = useState(() => new Animated.ValueXY());
    const [hovOn] = useState(() => new Animated.Value(0));
    // Les gestes lisent toujours les dernières valeurs sans recréer le PanResponder.
    const live = useRef(props);
    useEffect(() => {
      live.current = props;
    });
    const drag = useRef<{ id: number; cell: number; over: number } | null>(null);

    const measure = () => {
      const el = boardRef.current as unknown as { getBoundingClientRect?: () => { left: number; top: number } } | null;
      if (Platform.OS === 'web' && el?.getBoundingClientRect) {
        const r = el.getBoundingClientRect();
        origin.current = { x: r.left, y: r.top };
      } else {
        boardRef.current?.measureInWindow((x, y) => (origin.current = { x, y }));
      }
    };

    useImperativeHandle(ref, () => ({
      burst: (cell, text, color, big) => fxRef.current?.burst(cell, text, color, big),
      flyFrom(id, pageX, pageY) {
        measure();
        const size = live.current.cs;
        reg.from.set(id, { x: pageX - origin.current.x - size / 2, y: pageY - origin.current.y - size / 2 });
      },
    }));

    const pan = useMemo(() => {
      const itemAt = (pageX: number, pageY: number) => {
        measure();
        const { cs: size, items: list } = live.current;
        const col = Math.floor((pageX - origin.current.x) / size);
        const row = Math.floor((pageY - origin.current.y) / size);
        if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
        return list.find((x) => x.cell === row * COLS + col) ?? null;
      };
      /** Case visée par l'article déplacé : son jumeau le plus proche s'il est tout près, sinon la case sous lui. -1 : hors plateau. */
      const target = (d: { id: number; cell: number }, dx: number, dy: number) => {
        const { cs: size, items: list } = live.current;
        const start = cellXY(d.cell, size);
        const cx = start.x + dx + size / 2;
        const cy = start.y + dy - size * LIFT + size / 2;
        const me = list.find((x) => x.id === d.id);
        let best = -1;
        let bestDist = size * MAGNET;
        if (me)
          for (const it of list) {
            if (it.id === me.id || it.chain !== me.chain || it.tier !== me.tier) continue;
            const p = cellXY(it.cell, size);
            const dist = Math.hypot(p.x + size / 2 - cx, p.y + size / 2 - cy);
            if (dist < bestDist) {
              bestDist = dist;
              best = it.cell;
            }
          }
        if (best >= 0) return best;
        const col = Math.floor(cx / size);
        // Hors plateau : on juge avec la position du doigt (sans le soulèvement), pour viser la vente ou le Glouton.
        const row = Math.floor((cy + size * LIFT) / size);
        if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return -1;
        return Math.max(0, Math.floor(cy / size)) * COLS + col;
      };
      const back = (id: number) => {
        const off = reg.off.get(id);
        if (off) Animated.spring(off, { toValue: { x: 0, y: 0 }, friction: 7, tension: 120, useNativeDriver: false }).start();
      };
      const end = () => {
        drag.current = null;
        hovOn.setValue(0);
        setDragId(null);
        live.current.onDragChange(false);
      };
      // Les refs ne sont lues que dans les gestionnaires de gestes, jamais pendant le rendu.
      // eslint-disable-next-line react-hooks/refs
      return PanResponder.create({
        onStartShouldSetPanResponder: (e) => !!itemAt(e.nativeEvent.pageX, e.nativeEvent.pageY),
        onMoveShouldSetPanResponder: () => false,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          const it = itemAt(e.nativeEvent.pageX, e.nativeEvent.pageY);
          if (!it) return;
          drag.current = { id: it.id, cell: it.cell, over: -2 };
          reg.off.get(it.id)?.stopAnimation();
        },
        onPanResponderMove: (_e, g) => {
          const d = drag.current;
          if (!d) return;
          const moved = Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6;
          if (d.over === -2) {
            if (!moved) return;
            // Le geste devient un glisser : on soulève l'article et on éclaire ses jumeaux.
            d.over = -1;
            setDragId(d.id);
            live.current.onDragChange(true);
          }
          const size = live.current.cs;
          reg.off.get(d.id)?.setValue({ x: g.dx, y: g.dy - size * LIFT });
          const cell = target(d, g.dx, g.dy);
          if (cell !== d.over) {
            d.over = cell;
            const ok = cell >= 0 && cell !== d.cell && live.current.open.includes(cell);
            if (ok) hov.setValue(cellXY(cell, size));
            hovOn.setValue(ok ? 1 : 0);
          }
        },
        onPanResponderRelease: (e, g) => {
          const d = drag.current;
          if (!d) return;
          const { cs: size, items: list, open: openCells } = live.current;
          if (d.over === -2) {
            // Simple toucher : sélection, ou fusion automatique au deuxième toucher.
            drag.current = null;
            if (live.current.selected === d.id) {
              if (!live.current.onAgain(d.id)) live.current.onSelect(null);
            } else live.current.onSelect(d.id);
            return;
          }
          const start = cellXY(d.cell, size);
          const cell = target(d, g.dx, g.dy);
          if (cell < 0) {
            if (!live.current.onThrow(d.id, e.nativeEvent.pageX, e.nativeEvent.pageY)) back(d.id);
            return end();
          }
          if (cell !== d.cell && openCells.includes(cell)) {
            reg.from.set(d.id, { x: start.x + g.dx, y: start.y + g.dy - size * LIFT });
            const other = list.find((x) => x.cell === cell);
            if (other) reg.from.set(other.id, cellXY(cell, size));
            if (!live.current.onDrop(d.id, cell)) {
              reg.from.clear();
              back(d.id);
            }
          } else back(d.id);
          end();
        },
        onPanResponderTerminate: () => {
          if (drag.current) back(drag.current.id);
          end();
        },
      });
    }, [reg, hov, hovOn]);

    const openSet = useMemo(() => new Set(open), [open]);
    const cells = useMemo(() => {
      const out = [];
      for (let i = 0; i < COLS * ROWS; i++) {
        const p = cellXY(i, cs);
        if (openSet.has(i)) {
          // Case ouverte : un creux crème dans le comptoir, légèrement ombré en haut (effet « encastré »).
          const g = Math.max(2, Math.round(cs * 0.055));
          const alt = (Math.floor(i / COLS) + (i % COLS)) % 2 === 1;
          out.push(
            <View key={i} style={{ position: 'absolute', left: p.x + g, top: p.y + g, width: cs - 2 * g, height: cs - 2 * g, borderRadius: cs * 0.2, backgroundColor: alt ? SLOT_B : SLOT_A, borderTopWidth: Math.max(2, cs * 0.05), borderTopColor: SLOT_SHADE, borderBottomWidth: 1.5, borderBottomColor: 'rgba(255,255,255,0.7)' }} />,
          );
          continue;
        }
        // Case fermée : une caisse en bois posée sur le comptoir.
        const g = Math.max(2, Math.round(cs * 0.05));
        out.push(
          <View key={i} style={{ position: 'absolute', left: p.x, top: p.y, width: cs, height: cs }}>
            <View
              style={{
                position: 'absolute',
                left: g,
                top: g,
                right: g,
                bottom: g,
                borderRadius: cs * 0.14,
                backgroundColor: '#D9A86F',
                borderWidth: 2,
                borderColor: '#B57B43',
                opacity: nextCells.includes(i) ? 1 : 0.7,
                borderBottomWidth: 4,
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}>
              <View style={{ position: 'absolute', left: 0, right: 0, top: '33%', height: 2, backgroundColor: C.woodDark, opacity: 0.45 }} />
              <View style={{ position: 'absolute', left: 0, right: 0, top: '66%', height: 2, backgroundColor: C.woodDark, opacity: 0.45 }} />
              {nextCells.includes(i) ? <Icon name="locked" size={cs * 0.42} /> : null}
            </View>
          </View>,
        );
      }
      return out;
    }, [cs, openSet, nextCells]);

    const dragged = dragId !== null ? items.find((x) => x.id === dragId) : undefined;
    return (
      <View
        ref={boardRef}
        onLayout={measure}
        {...pan.panHandlers}
        style={[{ width: cs * COLS, height: cs * ROWS }, Platform.OS === 'web' ? ({ touchAction: 'none', userSelect: 'none', cursor: 'grab' } as object) : null]}>
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, borderRadius: cs * 0.2, overflow: 'hidden' }}>
          <Planks cs={cs} />
          {cells}
        </View>
        <Animated.View
          pointerEvents="none"
          style={{ position: 'absolute', left: 3, top: 3, width: cs - 6, height: cs - 6, borderRadius: cs * 0.24, borderWidth: 3, borderColor: C.green, backgroundColor: 'rgba(52,179,106,0.28)', opacity: hovOn, transform: hov.getTranslateTransform() }}
        />
        {items.map((it) => {
          const mode: TileMode = !dragged ? 'idle' : it.id === dragged.id ? 'drag' : it.chain === dragged.chain && it.tier === dragged.tier ? 'match' : 'dim';
          return <Tile key={it.id} item={it} cs={cs} mode={mode} selected={selected === it.id} reg={reg} />;
        })}
        {hintFrom >= 0 && dragId === null ? <HintHand from={hintFrom} to={hintTo} cs={cs} /> : null}
        <FxLayer ref={fxRef} cs={cs} />
      </View>
    );
  }),
);
