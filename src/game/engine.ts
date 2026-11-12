// Règles du jeu, sans React : chaque action prend l'état et renvoie un nouvel état plus des événements
// (sons, effets visuels) que l'interface rejoue. Tous les chiffres viennent de balance.ts.
import * as B from './balance';
import type { BoostId, ChainId, MissionKind, TrophyDef, UpgradeId } from './balance';

export const SAVE_VERSION = 1;

export type Item = { id: number; chain: ChainId; tier: number; cell: number };
export type Gen = { level: number; charges: number; prog: number }; // prog : ms accumulées vers la prochaine charge
export type Need = { chain: ChainId; tier: number };
export type Order = { id: number; needs: Need[]; coins: number; stars: number; face: number };
export type OrderSlot = { order: Order | null; wait: number }; // wait : ms avant la prochaine commande
export type Mission = { id: number; kind: MissionKind; target: number; prog: number; coins: number; stars: number };
export type Boss = { level: number; hp: number; until: number; ready: number }; // until : fin du combat en cours (0 = pas de combat)

export type State = {
  v: number;
  // --- saison en cours (remis à zéro par une nouvelle saison) ---
  coins: number;
  stars: number; // étoiles dans le niveau en cours
  level: number;
  items: Item[];
  nextId: number;
  gens: Record<ChainId, Gen>;
  orders: OrderSlot[];
  ordersDone: number;
  up: Record<UpgradeId, number>;
  found: Record<string, 1>; // « chaîne:palier » découverts cette saison (source du revenu passif)
  runEarned: number;
  boosts: Record<BoostId, { until: number; ready: number }>; // fin du boost en cours, prochain lancement possible (ms)
  boss: Boss;
  // --- permanent ---
  ever: Record<string, 1>; // album : tout ce qui a été découvert un jour
  ribbons: number;
  season: number; // nombre de saisons lancées
  life: { merges: number; orders: number; earned: number; maxLevel: number; bosses: number };
  missions: Mission[];
  missionsDone: number;
  trophies: Record<string, 1>; // trophées encaissés
  daily: { day: string; streak: number };
  lastSeen: number; // horodatage (ms) de la dernière mise à jour
  tuto: number; // étape du guidage
  sound: boolean;
  music: boolean;
};

export const TUTO = { merge: 0, tapGen: 1, deliver: 2, upgrade: 3, done: 4 } as const;

export type Ev =
  | { t: 'spawn'; id: number; cell: number; chain: ChainId }
  | { t: 'merge'; id: number; cell: number; chain: ChainId; tier: number; coins: number; lucky: boolean; combo: number }
  | { t: 'found'; chain: ChainId; tier: number; coins: number }
  | { t: 'move' }
  | { t: 'sell'; cell: number; coins: number }
  | { t: 'order'; slot: number; coins: number; stars: number }
  | { t: 'levelup'; level: number; coins: number; unlocked: ChainId | null }
  | { t: 'upgrade' }
  | { t: 'reward'; coins: number; text: string }
  | { t: 'boost' }
  | { t: 'hit'; cell: number; dmg: number }
  | { t: 'bossStart' }
  | { t: 'bossWin'; level: number; coins: number; stars: number }
  | { t: 'full' }
  | { t: 'empty' }
  | { t: 'poor' };

export type Res = { s: State; ev: Ev[] };

const key = (chain: ChainId, tier: number) => `${chain}:${tier}`;
export const isFound = (s: State, chain: ChainId, tier: number) => !!s.found[key(chain, tier)];
export const isEver = (s: State, chain: ChainId, tier: number) => !!s.ever[key(chain, tier)];
export const chainUnlocked = (s: State, chain: ChainId) => s.level >= B.CHAINS[chain].unlockLevel;
export const openCells = (s: State) => B.CELL_ORDER.slice(0, B.openCellCount(s.up.board));
export const boostActive = (s: State, id: BoostId, now: number) => now < s.boosts[id].until;
/** Multiplicateur appliqué à toutes les pièces gagnées en jouant. */
export const coinMult = (s: State, now: number) => B.ribbonMult(s.ribbons) * (boostActive(s, 'coins', now) ? B.BOOST_COIN_MULT : 1);

/** Revenu passif par seconde (rubans compris, coup de feu non compris). */
export function incomePerSec(s: State): number {
  let sum = 0;
  for (const k in s.found) sum += B.itemIncome(Number(k.split(':')[1]));
  return sum * B.incomeMult(s.up.income) * B.ribbonMult(s.ribbons);
}

function maxIn(map: Record<string, 1>, chain: ChainId): number {
  let m = 0;
  for (let t = 1; t <= B.MAX_TIER; t++) if (map[key(chain, t)]) m = t;
  return m;
}
export const maxFound = (s: State, chain: ChainId) => maxIn(s.found, chain);

function earn(s: State, coins: number): State {
  if (coins <= 0) return s;
  const missions = s.missions.some((m) => m.kind === 'earn') ? s.missions.map((m) => (m.kind === 'earn' ? { ...m, prog: m.prog + coins } : m)) : s.missions;
  return { ...s, coins: s.coins + coins, runEarned: s.runEarned + coins, missions, life: { ...s.life, earned: s.life.earned + coins } };
}

type Run = Pick<State, 'coins' | 'stars' | 'level' | 'items' | 'nextId' | 'gens' | 'orders' | 'ordersDone' | 'up' | 'found' | 'runEarned' | 'boosts' | 'boss' | 'lastSeen'>;

function freshRun(now: number): Run {
  const gens = {} as Record<ChainId, Gen>;
  for (const c of B.CHAIN_IDS) gens[c] = { level: 0, charges: B.GEN_BASE_CAP, prog: 0 };
  return {
    coins: B.START_COINS,
    stars: 0,
    level: 1,
    items: [],
    nextId: 1,
    gens,
    orders: [],
    ordersDone: 0,
    up: { board: 0, income: 0, tips: 0, cap: 0, offline: 0, power: 0 },
    found: {},
    runEarned: 0,
    boosts: { coins: { until: 0, ready: 0 }, speed: { until: 0, ready: 0 }, luck: { until: 0, ready: 0 } },
    boss: { level: 1, hp: 0, until: 0, ready: 0 },
    lastSeen: now,
  };
}

function seed(s: State, firstTime: boolean): State {
  const cells = openCells(s);
  // Objets de départ au milieu du plateau, côte à côte.
  const spots = [cells[0], cells[1], cells[3]];
  B.START_ITEMS.forEach((it, i) => {
    s.items.push({ id: s.nextId++, chain: it.chain, tier: it.tier, cell: spots[i] });
    s.found[key(it.chain, it.tier)] = 1;
    s.ever[key(it.chain, it.tier)] = 1;
  });
  // Tout premier lancement : une seule commande, les autres s'ouvrent au fil des livraisons.
  for (let i = 0; i < B.ORDER_SLOTS; i++) s.orders.push({ order: null, wait: i === 0 || !firstTime ? 0 : 1e12 });
  return fillMissions(fillOrders(s, Math.random), Math.random);
}

export function newGame(now: number): State {
  return seed(
    {
      v: SAVE_VERSION,
      ...freshRun(now),
      ever: {},
      ribbons: 0,
      season: 0,
      life: { merges: 0, orders: 0, earned: 0, maxLevel: 1, bosses: 0 },
      missions: [],
      missionsDone: 0,
      trophies: {},
      daily: { day: '', streak: 0 },
      tuto: TUTO.merge,
      sound: true,
      music: true,
    },
    true,
  );
}

/** Charge une sauvegarde : renvoie null si elle est illisible ou d'une version inconnue. */
export function loadState(raw: string | null): State | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as State;
    if (!s || s.v !== SAVE_VERSION || !Array.isArray(s.items) || !s.gens || !s.up || !s.life || !s.ever || !s.boosts || !s.boss || !Array.isArray(s.missions)) return null;
    for (const c of B.CHAIN_IDS) s.gens[c] ??= { level: 0, charges: B.GEN_BASE_CAP, prog: 0 };
    return s;
  } catch {
    return null;
  }
}

// ---------- Commandes ----------

function makeOrder(s: State, rnd: () => number): Order {
  const n = s.ordersDone + s.orders.filter((o) => o.order).length;
  let needs: Need[];
  if (n < B.FIRST_ORDERS.length) {
    needs = B.FIRST_ORDERS[n].map((tier) => ({ chain: 'fournil' as ChainId, tier }));
  } else {
    const chains = B.CHAIN_IDS.filter((c) => chainUnlocked(s, c));
    const count = 1 + (s.level >= 3 && rnd() < 0.4 ? 1 : 0) + (s.level >= 6 && rnd() < 0.3 ? 1 : 0);
    needs = [];
    for (let i = 0; i < count; i++) {
      const chain = chains[Math.floor(rnd() * chains.length)];
      const top = Math.max(1, maxFound(s, chain));
      const lo = Math.max(1, top - 3);
      const hi = Math.min(B.MAX_TIER, top + 1);
      needs.push({ chain, tier: lo + Math.floor(rnd() * (hi - lo + 1)) });
    }
  }
  const base = needs.reduce((a, x) => a + B.itemValue(x.tier), 0);
  const coins = Math.round(base * B.ORDER_COIN_MULT * (needs.length > 1 ? B.ORDER_MULTI_BONUS : 1));
  const stars = needs.reduce((a, x) => a + x.tier, 0);
  return { id: s.nextId, needs, coins, stars, face: Math.floor(rnd() * B.FACES.length) };
}

function fillOrders(s: State, rnd: () => number): State {
  let out = s;
  s.orders.forEach((slot, i) => {
    if (!slot.order && slot.wait <= 0) {
      const order = makeOrder(out, rnd);
      const orders = out.orders.slice();
      orders[i] = { order, wait: 0 };
      out = { ...out, orders, nextId: out.nextId + 1 };
    }
  });
  return out;
}

/** Objets du plateau qui servent une commande (un objet ne compte qu'une fois), ou null s'il en manque. */
export function matchOrder(items: Item[], order: Order): number[] | null {
  const used: number[] = [];
  for (const need of order.needs) {
    const it = items.find((x) => x.chain === need.chain && x.tier === need.tier && !used.includes(x.id));
    if (!it) return null;
    used.push(it.id);
  }
  return used;
}

/** Récompense réelle d'une commande : pourboires, rubans et coup de feu compris. */
export const orderCoins = (s: State, o: Order, now: number) => Math.round(o.coins * B.tipsMult(s.up.tips) * coinMult(s, now));

function addStars(s: State, stars: number, ev: Ev[]): State {
  let out = { ...s, stars: s.stars + stars };
  while (out.stars >= B.starsForLevel(out.level)) {
    const rest = out.stars - B.starsForLevel(out.level);
    const level = out.level + 1;
    const coins = Math.round(B.levelUpCoins(level) * B.ribbonMult(out.ribbons));
    const unlocked = B.CHAIN_IDS.find((c) => B.CHAINS[c].unlockLevel === level) ?? null;
    out = earn({ ...out, level, stars: rest, life: { ...out.life, maxLevel: Math.max(out.life.maxLevel, level) } }, coins);
    if (unlocked) out = discover(out, unlocked, 1, [], 0); // le premier objet du stand entre dans la collection dès l'ouverture
    ev.push({ t: 'levelup', level, coins, unlocked });
  }
  return out;
}

export function deliver(s: State, slot: number, now: number, rnd: () => number = Math.random): Res {
  const order = s.orders[slot]?.order;
  if (!order) return { s, ev: [] };
  const used = matchOrder(s.items, order);
  if (!used) return { s, ev: [{ t: 'empty' }] };
  const coins = orderCoins(s, order, now);
  const ev: Ev[] = [{ t: 'order', slot, coins, stars: order.stars }];
  const orders = s.orders.slice();
  orders[slot] = { order: null, wait: B.ORDER_REFILL_MS };
  // Les emplacements fermés du tout début s'ouvrent au fil des premières livraisons.
  const done = s.ordersDone + 1;
  for (let i = 0; i < orders.length; i++) if (!orders[i].order && orders[i].wait > 1e9 && done >= i) orders[i] = { order: null, wait: B.ORDER_REFILL_MS };
  let out: State = earn(
    {
      ...s,
      items: s.items.filter((x) => !used.includes(x.id)),
      orders,
      ordersDone: done,
      life: { ...s.life, orders: s.life.orders + 1 },
      tuto: s.tuto === TUTO.deliver ? TUTO.upgrade : s.tuto,
    },
    coins,
  );
  out = addStars(out, order.stars, ev);
  out = fillOrders(out, rnd);
  return { s: out, ev };
}

export function skipOrder(s: State, slot: number): Res {
  if (!s.orders[slot]?.order || s.ordersDone < B.FIRST_ORDERS.length) return { s, ev: [] };
  const orders = s.orders.slice();
  orders[slot] = { order: null, wait: B.ORDER_SKIP_MS };
  return { s: { ...s, orders }, ev: [{ t: 'move' }] };
}

// ---------- Plateau ----------

function discover(s: State, chain: ChainId, tier: number, ev: Ev[], mult: number): State {
  const k = key(chain, tier);
  if (s.found[k]) return s;
  const coins = Math.round(B.itemValue(tier) * B.DISCOVERY_BONUS_RATIO * mult);
  if (mult > 0) ev.push({ t: 'found', chain, tier, coins });
  return earn({ ...s, found: { ...s.found, [k]: 1 }, ever: s.ever[k] ? s.ever : { ...s.ever, [k]: 1 } }, coins);
}

export function freeCell(s: State, rnd: () => number): number | null {
  const taken = new Set(s.items.map((x) => x.cell));
  const free = openCells(s).filter((c) => !taken.has(c));
  if (!free.length) return null;
  return free[Math.floor(rnd() * free.length)];
}

/** Touche un stand : sort un objet sur une case libre. */
export function tapGen(s: State, chain: ChainId, now: number, rnd: () => number = Math.random): Res {
  if (!chainUnlocked(s, chain)) return { s, ev: [] };
  const g = s.gens[chain];
  if (g.charges <= 0) return { s, ev: [{ t: 'empty' }] };
  const cell = freeCell(s, rnd);
  if (cell === null) return { s, ev: [{ t: 'full' }] };
  const odds = B.genTierOdds(g.level);
  const r = rnd();
  // Pendant le guidage, toujours un palier 1 : la première fusion est garantie.
  const base = s.tuto < TUTO.done ? 1 : r < odds.p4 ? 4 : r < odds.p4 + odds.p3 ? 3 : r < odds.p4 + odds.p3 + odds.p2 ? 2 : 1;
  const tier = base + (boostActive(s, 'luck', now) ? 1 : 0);
  const id = s.nextId;
  const ev: Ev[] = [{ t: 'spawn', id, cell, chain }];
  let out: State = {
    ...s,
    nextId: id + 1,
    items: [...s.items, { id, chain, tier, cell }],
    gens: { ...s.gens, [chain]: { ...g, charges: g.charges - 1 } },
    tuto: s.tuto === TUTO.tapGen ? TUTO.deliver : s.tuto,
  };
  out = discover(out, chain, tier, ev, coinMult(s, now));
  return { s: out, ev };
}

/** Dépose l'objet `id` sur la case `cell` : fusion, échange ou déplacement. */
/** `combo` : nombre de fusions enchaînées juste avant celle-ci (augmente la prime). */
export function moveItem(s: State, id: number, cell: number, now: number, combo = 0, rnd: () => number = Math.random): Res {
  const it = s.items.find((x) => x.id === id);
  if (!it || it.cell === cell || !openCells(s).includes(cell)) return { s, ev: [] };
  const other = s.items.find((x) => x.cell === cell);
  if (!other) {
    return { s: { ...s, items: s.items.map((x) => (x.id === id ? { ...x, cell } : x)) }, ev: [{ t: 'move' }] };
  }
  if (other.chain === it.chain && other.tier === it.tier && it.tier < B.MAX_TIER) {
    // Fusion en or : de temps en temps, l'objet gagne deux paliers d'un coup (jamais pendant le guidage).
    const lucky = s.tuto >= TUTO.done && it.tier + 2 <= B.MAX_TIER && rnd() < B.LUCKY_MERGE_CHANCE;
    const tier = it.tier + (lucky ? 2 : 1);
    const mult = coinMult(s, now);
    const coins = Math.max(1, Math.round(B.itemValue(tier) * B.MERGE_BONUS_RATIO * mult * B.comboMult(combo)));
    const nid = s.nextId;
    const ev: Ev[] = [{ t: 'merge', id: nid, cell, chain: it.chain, tier, coins, lucky, combo }];
    let out: State = earn(
      {
        ...s,
        nextId: nid + 1,
        items: [...s.items.filter((x) => x.id !== id && x.id !== other.id), { id: nid, chain: it.chain, tier, cell }],
        life: { ...s.life, merges: s.life.merges + 1 },
        tuto: s.tuto === TUTO.merge ? TUTO.tapGen : s.tuto,
      },
      coins,
    );
    out = discover(out, it.chain, tier, ev, mult);
    return { s: out, ev };
  }
  // Objets différents : ils échangent leur place.
  return {
    s: { ...s, items: s.items.map((x) => (x.id === id ? { ...x, cell } : x.id === other.id ? { ...x, cell: it.cell } : x)) },
    ev: [{ t: 'move' }],
  };
}

export const sellValue = (s: State, tier: number, now: number) => Math.max(1, Math.round(B.itemValue(tier) * B.SELL_RATIO * coinMult(s, now)));

export function sellItem(s: State, id: number, now: number): Res {
  const it = s.items.find((x) => x.id === id);
  if (!it || s.tuto < TUTO.upgrade) return { s, ev: [] };
  const coins = sellValue(s, it.tier, now);
  return { s: earn({ ...s, items: s.items.filter((x) => x.id !== id) }, coins), ev: [{ t: 'sell', cell: it.cell, coins }] };
}

// ---------- Améliorations ----------

export function buyUpgrade(s: State, id: UpgradeId): Res {
  const def = B.UPGRADES[id];
  const lvl = s.up[id];
  if (lvl >= def.max) return { s, ev: [] };
  const cost = def.cost(lvl);
  if (s.coins < cost) return { s, ev: [{ t: 'poor' }] };
  return {
    s: { ...s, coins: s.coins - cost, up: { ...s.up, [id]: lvl + 1 }, tuto: s.tuto === TUTO.upgrade ? TUTO.done : s.tuto },
    ev: [{ t: 'upgrade' }],
  };
}

export function buyGen(s: State, chain: ChainId): Res {
  const g = s.gens[chain];
  if (!chainUnlocked(s, chain) || g.level >= B.GEN_MAX_LEVEL) return { s, ev: [] };
  const cost = B.genCost(chain, g.level);
  if (s.coins < cost) return { s, ev: [{ t: 'poor' }] };
  return {
    s: { ...s, coins: s.coins - cost, gens: { ...s.gens, [chain]: { ...g, level: g.level + 1 } }, tuto: s.tuto === TUTO.upgrade ? TUTO.done : s.tuto },
    ev: [{ t: 'upgrade' }],
  };
}

// ---------- Boosts ----------

export const boostUnlocked = (s: State, id: BoostId) => s.life.maxLevel >= B.BOOSTS[id].unlockLevel;

export function startBoost(s: State, id: BoostId, now: number): Res {
  if (!boostUnlocked(s, id) || now < s.boosts[id].ready) return { s, ev: [] };
  const def = B.BOOSTS[id];
  return { s: { ...s, boosts: { ...s.boosts, [id]: { until: now + def.ms, ready: now + def.cooldownMs } } }, ev: [{ t: 'boost' }] };
}

// ---------- Missions ----------

function makeMission(s: State, rnd: () => number): Mission {
  const n = s.missionsDone + s.missions.length;
  const taken = s.missions.map((m) => m.kind);
  // Les trois premières missions sont fixes : elles accompagnent le guidage.
  let kinds: MissionKind[] = n === 0 ? ['merge'] : n === 1 ? ['order'] : n === 2 ? ['spawn'] : ['merge', 'order', 'spawn', 'earn', 'upgrade'];
  if (n >= 3) {
    const canFind = B.CHAIN_IDS.some((c) => chainUnlocked(s, c) && maxFound(s, c) < B.MAX_TIER);
    if (canFind) kinds.push('found');
    if (bossUnlocked(s)) kinds.push('boss');
    const free = kinds.filter((k) => !taken.includes(k));
    if (free.length) kinds = free;
  }
  const kind = kinds[Math.floor(rnd() * kinds.length)];
  const rate = incomePerSec(s);
  return { id: s.nextId, kind, target: B.missionTarget(kind, n, rate), prog: 0, coins: B.missionCoins(n, rate), stars: B.missionStars(s.level) };
}

function fillMissions(s: State, rnd: () => number): State {
  let out = s;
  while (out.missions.length < B.MISSION_SLOTS) out = { ...out, missions: [...out.missions, makeMission(out, rnd)], nextId: out.nextId + 1 };
  return out;
}

const BUMP: Partial<Record<Ev['t'], MissionKind>> = { merge: 'merge', order: 'order', spawn: 'spawn', found: 'found', upgrade: 'upgrade', bossWin: 'boss' };

/** À appeler sur le résultat de chaque action : fait avancer les missions d'après les événements. */
export function track(r: Res): Res {
  let missions = r.s.missions;
  for (const e of r.ev) {
    const kind = BUMP[e.t];
    if (kind && missions.some((m) => m.kind === kind)) missions = missions.map((m) => (m.kind === kind ? { ...m, prog: m.prog + 1 } : m));
  }
  return missions === r.s.missions ? r : { s: { ...r.s, missions }, ev: r.ev };
}

/** Récompense d'une mission : jamais moins que ce que rapporterait une mission créée maintenant. */
export const missionReward = (s: State, m: Mission) => Math.max(m.coins, B.missionCoins(s.missionsDone, incomePerSec(s)));
export const missionsReady = (s: State) => s.missions.filter((m) => m.prog >= m.target).length;
/** Missions restantes avant le prochain coffre. */
export const chestIn = (s: State) => B.CHEST_EVERY - (s.missionsDone % B.CHEST_EVERY);

export function claimMission(s: State, id: number, rnd: () => number = Math.random): Res {
  const m = s.missions.find((x) => x.id === id);
  if (!m || m.prog < m.target) return { s, ev: [] };
  const reward = missionReward(s, m);
  const ev: Ev[] = [{ t: 'reward', coins: reward, text: 'Mission accomplie' }];
  let out = earn({ ...s, missions: s.missions.filter((x) => x.id !== id), missionsDone: s.missionsDone + 1 }, reward);
  if (out.missionsDone % B.CHEST_EVERY === 0) {
    const coins = B.chestCoins(out.level, incomePerSec(out));
    out = earn(out, coins);
    ev.push({ t: 'reward', coins, text: 'Coffre de palier' });
  }
  out = addStars(out, m.stars, ev);
  out = fillMissions(out, rnd);
  return { s: out, ev };
}

// ---------- Gloutons (combat) ----------

export const bossUnlocked = (s: State) => s.level >= B.BOSS_UNLOCK_LEVEL;
export const bossFighting = (s: State, now: number) => s.boss.until > 0 && now < s.boss.until;

export function startBoss(s: State, now: number): Res {
  if (!bossUnlocked(s) || s.boss.until > 0 || now < s.boss.ready) return { s, ev: [] };
  return { s: { ...s, boss: { ...s.boss, hp: B.bossHp(s.boss.level), until: now + B.BOSS_TIME_MS } }, ev: [{ t: 'bossStart' }] };
}

/** Lance l'objet `id` sur le Glouton. */
export function hitBoss(s: State, id: number, now: number): Res {
  const it = s.items.find((x) => x.id === id);
  if (!it || !bossFighting(s, now)) return { s, ev: [] };
  const dmg = B.bossDamage(it.tier, s.up.power);
  const hp = s.boss.hp - dmg;
  const ev: Ev[] = [{ t: 'hit', cell: it.cell, dmg }];
  let out: State = { ...s, items: s.items.filter((x) => x.id !== id), boss: { ...s.boss, hp } };
  if (hp <= 0) {
    const level = s.boss.level;
    const coins = Math.round(B.bossCoins(level) * coinMult(s, now));
    const stars = B.bossStars(level);
    ev.push({ t: 'bossWin', level, coins, stars });
    out = earn({ ...out, boss: { level: level + 1, hp: 0, until: 0, ready: now + B.BOSS_COOLDOWN_MS }, life: { ...out.life, bosses: out.life.bosses + 1 } }, coins);
    out = addStars(out, stars, ev);
  }
  return { s: out, ev };
}

// ---------- Trophées ----------

export function trophyProgress(s: State, t: TrophyDef): number {
  switch (t.kind) {
    case 'merges':
      return s.life.merges;
    case 'orders':
      return s.life.orders;
    case 'level':
      return s.life.maxLevel;
    case 'album':
      return Object.keys(s.ever).length;
    case 'earned':
      return Math.floor(s.life.earned);
    case 'seasons':
      return s.season;
    case 'boss':
      return s.life.bosses;
    case 'chain':
      return maxIn(s.ever, t.chain!);
  }
}
export const trophyReward = (s: State, t: TrophyDef) => Math.round(Math.max(t.floor, incomePerSec(s) * 60 * t.minutes));
export const trophyReady = (s: State, t: TrophyDef) => !s.trophies[t.id] && trophyProgress(s, t) >= t.target;
export const trophiesReady = (s: State) => B.TROPHIES.filter((t) => trophyReady(s, t)).length;

export function claimTrophy(s: State, id: string): Res {
  const t = B.TROPHIES.find((x) => x.id === id);
  if (!t || !trophyReady(s, t)) return { s, ev: [] };
  const coins = trophyReward(s, t);
  return { s: earn({ ...s, trophies: { ...s.trophies, [id]: 1 } }, coins), ev: [{ t: 'reward', coins, text: 'Trophée' }] };
}

// ---------- Cadeau du jour ----------

/** Date locale « AAAA-MM-JJ ». */
export function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export const dailyReady = (s: State, now: number) => s.tuto >= TUTO.done && s.daily.day !== dayKey(now);
/** Jour de la série (1 à 7) que donnerait le cadeau d'aujourd'hui. */
export function dailyStep(s: State, now: number): number {
  const d = new Date(now);
  d.setDate(d.getDate() - 1);
  return s.daily.day === dayKey(d.getTime()) ? (s.daily.streak % B.DAILY.length) + 1 : 1;
}
export const dailyCoins = (s: State, step: number) => Math.round(Math.max(B.DAILY[step - 1].floor, incomePerSec(s) * 60 * B.DAILY[step - 1].minutes));

export function claimDaily(s: State, now: number): Res {
  if (!dailyReady(s, now)) return { s, ev: [] };
  const step = dailyStep(s, now);
  const coins = dailyCoins(s, step);
  return { s: earn({ ...s, daily: { day: dayKey(now), streak: step } }, coins), ev: [{ t: 'reward', coins, text: 'Cadeau du jour' }] };
}

// ---------- Saisons ----------

export const canPrestige = (s: State) => s.level >= B.PRESTIGE_LEVEL;
export const prestigeGain = (s: State) => B.ribbonsFor(s.runEarned);

/** Nouvelle saison : le marché repart de zéro, les rubans (bonus permanent), l'album et les trophées restent. */
export function prestige(s: State, now: number): Res {
  const gain = prestigeGain(s);
  if (!canPrestige(s) || gain < 1) return { s, ev: [] };
  const out = seed({ ...s, ...freshRun(now), ever: { ...s.ever }, ribbons: s.ribbons + gain, season: s.season + 1, tuto: TUTO.done }, false);
  return { s: out, ev: [{ t: 'reward', coins: 0, text: 'Nouvelle saison' }] };
}

// ---------- Temps ----------

export type Offline = { seconds: number; capped: boolean; coins: number };

/**
 * Avance le temps jusqu'à `now`. Un écart court est un tic normal ; un écart long (appli fermée ou en
 * arrière-plan) est une absence : revenu plafonné par la Veilleuse, stands rechargés, résumé renvoyé.
 */
export function advance(s: State, now: number, rnd: () => number = Math.random): { s: State; offline: Offline | null; bossLost: boolean } {
  const dt = Math.max(0, now - s.lastSeen);
  if (dt === 0) return { s, offline: null, bossLost: false };
  const away = dt >= B.OFFLINE_MIN_SEC * 1000;
  const cap = B.offlineCapSec(s.up.offline) * 1000;
  const paid = away ? Math.min(dt, cap) : dt;
  // Le coup de feu ne compte que pour la partie du temps où il était encore actif.
  const boosted = Math.max(0, Math.min(paid, s.boosts.coins.until - s.lastSeen));
  const gain = (incomePerSec(s) * (paid + boosted * (B.BOOST_COIN_MULT - 1))) / 1000;
  // Fournée express : le temps compte triple pour les stands tant que le boost dure.
  const genDt = dt + Math.max(0, Math.min(dt, s.boosts.speed.until - s.lastSeen)) * (B.BOOST_SPEED_MULT - 1);

  const capCharges = B.genCap(s.up.cap);
  const gens = { ...s.gens };
  for (const c of B.CHAIN_IDS) {
    const g = gens[c];
    if (g.charges >= capCharges) {
      if (g.prog !== 0) gens[c] = { ...g, prog: 0 };
      continue;
    }
    const period = B.genPeriodMs(g.level);
    const total = g.prog + genDt;
    const add = Math.min(capCharges - g.charges, Math.floor(total / period));
    const charges = g.charges + add;
    gens[c] = { ...g, charges, prog: charges >= capCharges ? 0 : total - add * period };
  }

  const orders = s.orders.map((o) => (o.order || o.wait > 1e9 ? o : { ...o, wait: o.wait - dt }));
  // Combat perdu si le temps est écoulé : le Glouton repart, il faudra le défier à nouveau.
  const lost = s.boss.until > 0 && now >= s.boss.until;
  const boss = lost ? { ...s.boss, hp: 0, until: 0, ready: now + B.BOSS_COOLDOWN_MS } : s.boss;
  let out: State = earn({ ...s, gens, orders, boss, lastSeen: now }, gain);
  out = fillOrders(out, rnd);
  const offline = away ? { seconds: Math.round(dt / 1000), capped: dt > cap, coins: Math.floor(gain) } : null;
  return { s: out, offline, bossLost: lost };
}
