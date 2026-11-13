// Tous les chiffres du jeu sont ici : chaînes d'objets, prix, vitesses, récompenses.
// Le moteur (engine.ts) ne contient aucune constante d'équilibrage.

export type ChainId = 'fournil' | 'jardin' | 'primeur' | 'douceurs' | 'maree' | 'jouets';
export const CHAIN_IDS: ChainId[] = ['fournil', 'jardin', 'primeur', 'douceurs', 'maree', 'jouets'];

export type ChainDef = {
  id: ChainId;
  name: string; // nom du stand
  maker: string; // image du générateur
  color: string;
  soft: string;
  unlockLevel: number; // niveau du joueur qui ouvre le stand
  costMult: number; // multiplicateur du prix d'amélioration du stand
  items: { img: string; name: string }[]; // du palier 1 au dernier
};

export const CHAINS: Record<ChainId, ChainDef> = {
  fournil: {
    id: 'fournil',
    name: 'Fournil',
    maker: 'cooking',
    color: '#E08A2E',
    soft: '#FBE3C2',
    unlockLevel: 1,
    costMult: 1,
    items: [
      { img: 'sheaf_of_rice', name: 'Épi de blé' },
      { img: 'bread', name: 'Pain' },
      { img: 'baguette_bread', name: 'Baguette' },
      { img: 'croissant', name: 'Croissant' },
      { img: 'pretzel', name: 'Bretzel' },
      { img: 'cookie', name: 'Cookie' },
      { img: 'doughnut', name: 'Beignet' },
      { img: 'pancakes', name: 'Pancakes' },
      { img: 'waffle', name: 'Gaufre' },
      { img: 'cupcake', name: 'Cupcake' },
      { img: 'shortcake', name: 'Fraisier' },
      { img: 'birthday_cake', name: 'Gâteau de fête' },
    ],
  },
  jardin: {
    id: 'jardin',
    name: 'Jardin',
    maker: 'potted_plant',
    color: '#4FA35B',
    soft: '#D9F0D2',
    unlockLevel: 2,
    costMult: 1.6,
    items: [
      { img: 'seedling', name: 'Pousse' },
      { img: 'herb', name: 'Brin vert' },
      { img: 'four_leaf_clover', name: 'Trèfle' },
      { img: 'blossom', name: 'Pâquerette' },
      { img: 'tulip', name: 'Tulipe' },
      { img: 'rose', name: 'Rose' },
      { img: 'hibiscus', name: 'Hibiscus' },
      { img: 'sunflower', name: 'Tournesol' },
      { img: 'cherry_blossom', name: 'Fleur de cerisier' },
      { img: 'lotus', name: 'Lotus' },
      { img: 'hyacinth', name: 'Jacinthe' },
      { img: 'bouquet', name: 'Grand bouquet' },
    ],
  },
  primeur: {
    id: 'primeur',
    name: 'Primeur',
    maker: 'tractor',
    color: '#D9483B',
    soft: '#FBD9D2',
    unlockLevel: 5,
    costMult: 2.6,
    items: [
      { img: 'potato', name: 'Pomme de terre' },
      { img: 'carrot', name: 'Carotte' },
      { img: 'mushroom', name: 'Champignon' },
      { img: 'lemon', name: 'Citron' },
      { img: 'red_apple', name: 'Pomme' },
      { img: 'tangerine', name: 'Clémentine' },
      { img: 'peach', name: 'Pêche' },
      { img: 'strawberry', name: 'Fraise' },
      { img: 'cherries', name: 'Cerises' },
      { img: 'grapes', name: 'Raisin' },
      { img: 'pineapple', name: 'Ananas' },
      { img: 'watermelon', name: 'Pastèque' },
    ],
  },
  douceurs: {
    id: 'douceurs',
    name: 'Douceurs',
    maker: 'jar',
    color: '#D65DA8',
    soft: '#FAD9EC',
    unlockLevel: 9,
    costMult: 4,
    items: [
      { img: 'candy', name: 'Bonbon' },
      { img: 'lollipop', name: 'Sucette' },
      { img: 'popcorn', name: 'Pop-corn' },
      { img: 'chocolate_bar', name: 'Chocolat' },
      { img: 'fortune_cookie', name: 'Biscuit surprise' },
      { img: 'dango', name: 'Brochette sucrée' },
      { img: 'custard', name: 'Flan' },
      { img: 'soft_ice_cream', name: 'Glace italienne' },
      { img: 'shaved_ice', name: 'Granité' },
      { img: 'ice_cream', name: 'Coupe glacée' },
      { img: 'moon_cake', name: 'Gâteau de lune' },
      { img: 'fondue', name: 'Fondue au chocolat' },
    ],
  },
  maree: {
    id: 'maree',
    name: 'Marée',
    maker: 'fishing_pole',
    color: '#3B8FD9',
    soft: '#D2E6FB',
    unlockLevel: 14,
    costMult: 6,
    items: [
      { img: 'droplet', name: 'Goutte' },
      { img: 'spiral_shell', name: 'Coquillage' },
      { img: 'shrimp', name: 'Crevette' },
      { img: 'fish', name: 'Poisson' },
      { img: 'tropical_fish', name: 'Poisson tropical' },
      { img: 'crab', name: 'Crabe' },
      { img: 'lobster', name: 'Homard' },
      { img: 'octopus', name: 'Poulpe' },
      { img: 'turtle', name: 'Tortue' },
      { img: 'dolphin', name: 'Dauphin' },
      { img: 'shark', name: 'Requin' },
      { img: 'spouting_whale', name: 'Baleine' },
    ],
  },
  jouets: {
    id: 'jouets',
    name: 'Jouets',
    maker: 'wrapped_gift',
    color: '#7A5BD6',
    soft: '#E3DAFA',
    unlockLevel: 20,
    costMult: 9,
    items: [
      { img: 'balloon', name: 'Ballon' },
      { img: 'crayon', name: 'Crayon' },
      { img: 'puzzle_piece', name: 'Puzzle' },
      { img: 'yo-yo', name: 'Yo-yo' },
      { img: 'kite', name: 'Cerf-volant' },
      { img: 'teddy_bear', name: 'Ourson' },
      { img: 'nesting_dolls', name: 'Poupées russes' },
      { img: 'drum', name: 'Tambour' },
      { img: 'robot', name: 'Robot' },
      { img: 'bicycle', name: 'Vélo' },
      { img: 'racing_car', name: 'Bolide' },
      { img: 'rocket', name: 'Fusée' },
    ],
  },
};

export const MAX_TIER = 12;

// ---- Plateau ----
export const COLS = 6;
export const ROWS = 6;
export const START_CELLS = 16; // carré 4×4 au centre
export const CELLS_PER_UPGRADE = 2;

// Ordre d'ouverture des cases : du centre vers les bords.
export const CELL_ORDER: number[] = (() => {
  const cells: { i: number; d: number }[] = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const dx = Math.abs(c - (COLS - 1) / 2);
      const dy = Math.abs(r - (ROWS - 1) / 2);
      // distance « carrée » d'abord (anneaux), puis les coins en dernier
      cells.push({ i: r * COLS + c, d: Math.max(dx, dy) * 10 + dx + dy + r * 0.01 });
    }
  return cells.sort((a, b) => a.d - b.d).map((x) => x.i);
})();

// ---- Valeurs ----
/** Valeur de base d'un objet (sert aux commandes, à la vente, aux primes). */
export const itemValue = (tier: number) => Math.round(5 * Math.pow(2.2, tier - 1));
/** Revenu passif (pièces/s) apporté par chaque objet découvert. */
export const itemIncome = (tier: number) => 0.2 * Math.pow(1.7, tier - 1);
export const SELL_RATIO = 0.3;
export const MERGE_BONUS_RATIO = 0.1; // petite prime à chaque fusion
export const DISCOVERY_BONUS_RATIO = 1; // prime à la première découverte

// ---- Énergie : chaque objet sorti d'un stand coûte 1 énergie ----
// Elle revient lentement (le joueur revient plus tard), ou d'un coup avec une pub, des pièces, un niveau gagné.
// Ralentir sans frustrer : recharge rapide pour les débutants, puis de plus en plus lente ; la jauge grandit
// avec le niveau, et chaque niveau gagné la remplit (les premiers niveaux arrivent vite).
export const ENERGY_REGEN_MS = 60_000; // rythme de croisière : 1 énergie par minute
export const energyRegenMs = (level: number) => (level < 5 ? 20_000 : level < 10 ? 40_000 : ENERGY_REGEN_MS);
export const ENERGY_BASE_CAP = 30;
/** Jauge max : base + « Grande réserve » (+5 par niveau d'amélioration) + niveau du joueur (+2 par niveau, jusqu'à +20). */
export const energyCap = (reserve: number, level = 1) => ENERGY_BASE_CAP + 5 * reserve + Math.min(20, 2 * (level - 1));
export const MISSION_ENERGY = 5;
export const START_ENERGY = 60; // premier lancement : de quoi finir le guidage et bien démarrer
export const LEVELUP_ENERGY = 10; // en plus du plein, à chaque niveau
export const CHEST_ENERGY = 20;
export const DAILY_ENERGY = 20;
export const ENERGY_PACK = 10;
/** Pubs « plein d'énergie » par jour. Sans régie de pub configurée : recharges offertes, moins nombreuses. */
export const AD_REFILLS_PER_DAY = 8;
export const FREE_REFILLS_PER_DAY = 2;
/** Prix en pièces de +10 énergie : suit le niveau, et monte à chaque achat du jour. */
export const energyPackCost = (level: number, boughtToday: number) => Math.round(40 * Math.pow(1.45, level - 1) * Math.pow(1.3, boughtToday));
export const energyFullCost = (level: number, missing: number, boughtToday: number) => Math.round((energyPackCost(level, boughtToday) * missing * 0.8) / ENERGY_PACK);

// ---- Générateurs (stands) ----
export const GEN_BASE_PERIOD_MS = 4000; // une charge toutes les 4 s au niveau 0
export const GEN_PERIOD_FACTOR = 0.93; // ×0,93 par niveau
export const GEN_BASE_CAP = 6;
export const GEN_MAX_LEVEL = 20;
export const genPeriodMs = (level: number) => GEN_BASE_PERIOD_MS * Math.pow(GEN_PERIOD_FACTOR, level);
export const genCost = (chain: ChainId, level: number) => Math.round(40 * Math.pow(1.8, level) * CHAINS[chain].costMult);
/** Probabilités de sortir directement un palier 2, 3 ou 4 selon le niveau du stand. */
export const genTierOdds = (level: number) => {
  const p4 = Math.max(0, Math.min(0.2, 0.03 * (level - 9)));
  const p3 = Math.max(0, Math.min(0.3, 0.04 * (level - 4)));
  const p2 = Math.min(0.5, 0.06 * level);
  return { p2, p3, p4 };
};

// ---- Améliorations générales ----
export type UpgradeId = 'board' | 'income' | 'tips' | 'cap' | 'offline' | 'power';
export type UpgradeDef = { id: UpgradeId; name: string; img: string; max: number; cost: (lvl: number) => number; desc: (lvl: number) => string };

export const incomeMult = (lvl: number) => 1 + 0.2 * lvl;
export const tipsMult = (lvl: number) => 1 + 0.1 * lvl;
export const genCap = (lvl: number) => GEN_BASE_CAP + lvl;
export const offlineCapSec = (lvl: number) => (2 + lvl) * 3600;
export const openCellCount = (lvl: number) => Math.min(COLS * ROWS, START_CELLS + CELLS_PER_UPGRADE * lvl);

export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  board: {
    id: 'board',
    name: "Agrandir l'étal",
    img: 'hammer_and_wrench',
    max: (COLS * ROWS - START_CELLS) / CELLS_PER_UPGRADE,
    cost: (l) => Math.round(60 * Math.pow(1.6, l)),
    desc: (l) => `${openCellCount(l)} → ${openCellCount(l + 1)} cases`,
  },
  income: {
    id: 'income',
    name: 'Enseigne lumineuse',
    img: 'light_bulb',
    max: 25,
    cost: (l) => Math.round(80 * Math.pow(1.9, l)),
    desc: (l) => `Revenu ×${incomeMult(l).toFixed(1)} → ×${incomeMult(l + 1).toFixed(1)}`,
  },
  tips: {
    id: 'tips',
    name: 'Pourboires',
    img: 'money_bag',
    max: 15,
    cost: (l) => Math.round(120 * Math.pow(2, l)),
    desc: (l) => `Commandes +${Math.round((tipsMult(l) - 1) * 100)} % → +${Math.round((tipsMult(l + 1) - 1) * 100)} %`,
  },
  cap: {
    id: 'cap',
    name: 'Grande réserve',
    img: 'high_voltage',
    max: 10,
    cost: (l) => Math.round(150 * Math.pow(2.1, l)),
    desc: (l) => `Énergie max +${5 * l} → +${5 * (l + 1)}`,
  },
  offline: {
    id: 'offline',
    name: 'Veilleuse',
    img: 'crescent_moon',
    max: 6,
    cost: (l) => Math.round(300 * Math.pow(2.5, l)),
    desc: (l) => `Gains hors ligne : ${2 + l} h → ${3 + l} h`,
  },
  power: {
    id: 'power',
    name: 'Lance-tartes',
    img: 'bow_and_arrow',
    max: 30,
    cost: (l) => Math.round(200 * Math.pow(1.9, l)),
    desc: (l) => `Dégâts sur les Gloutons +${25 * l} % → +${25 * (l + 1)} %`,
  },
};
export const UPGRADE_IDS: UpgradeId[] = ['board', 'income', 'tips', 'cap', 'offline', 'power'];

// ---- Commandes ----
export const ORDER_SLOTS = 3;
export const ORDER_COIN_MULT = 1.6; // une commande paie mieux que la vente
export const ORDER_MULTI_BONUS = 1.25; // commande de plusieurs objets
export const ORDER_REFILL_MS = 2500; // délai avant la commande suivante
export const ORDER_SKIP_MS = 12000; // délai quand on refuse une commande
/** Premières commandes scénarisées (palier du Fournil) pour guider le début. */
export const FIRST_ORDERS: number[][] = [[2], [3], [2, 2], [4], [3, 3]];

// ---- Niveaux du joueur ----
export const starsForLevel = (level: number) => Math.round(5 * Math.pow(level, 1.55)); // étoiles pour passer au suivant
export const levelUpCoins = (level: number) => 30 * level;

// ---- Hors ligne ----
export const OFFLINE_MIN_SEC = 180; // en dessous, pas de fenêtre « pendant ton absence »

// ---- Départ ----
export const START_COINS = 0;
/** Objets posés au premier lancement : une fusion est possible tout de suite. */
export const START_ITEMS: { chain: ChainId; tier: number }[] = [
  { chain: 'fournil', tier: 1 },
  { chain: 'fournil', tier: 1 },
  { chain: 'fournil', tier: 2 },
];

// ---- Boosts (gratuits, avec temps de recharge) ----
export type BoostId = 'coins' | 'speed' | 'luck';
export type BoostDef = { id: BoostId; name: string; img: string; desc: string; ms: number; cooldownMs: number; unlockLevel: number; color: string };
export const BOOST_IDS: BoostId[] = ['coins', 'speed', 'luck'];
export const BOOSTS: Record<BoostId, BoostDef> = {
  coins: { id: 'coins', name: 'Coup de feu', img: 'fire', desc: 'Toutes les pièces ×2', ms: 5 * 60e3, cooldownMs: 20 * 60e3, unlockLevel: 3, color: '#E8612D' },
  speed: { id: 'speed', name: 'Panier gratuit', img: 'basket', desc: 'Les stands ne coûtent plus d’énergie', ms: 60e3, cooldownMs: 45 * 60e3, unlockLevel: 4, color: '#E0A800' },
  luck: { id: 'luck', name: 'Bonne étoile', img: 'shooting_star', desc: 'Chaque objet sort un palier plus haut', ms: 2 * 60e3, cooldownMs: 25 * 60e3, unlockLevel: 6, color: '#7A5BD6' },
};
export const BOOST_COIN_MULT = 2;
export const BOOST_SPEED_MULT = 3;

// ---- Missions (trois à la fois, sans fin) ----
export type MissionKind = 'merge' | 'order' | 'spawn' | 'found' | 'earn' | 'upgrade' | 'boss';
export const MISSION_SLOTS = 3;
export const MISSION_TEXT: Record<MissionKind, (n: string) => string> = {
  merge: (n) => `Fusionne ${n} objets`,
  order: (n) => `Livre ${n} commandes`,
  spawn: (n) => `Sors ${n} objets des stands`,
  found: (n) => `Découvre ${n} nouvel objet`,
  earn: (n) => `Gagne ${n} pièces`,
  upgrade: (n) => `Achète ${n} améliorations`,
  boss: (n) => `Repousse ${n} Glouton`,
};
export const MISSION_IMG: Record<MissionKind, string> = { merge: 'sparkles', order: 'shopping_bags', spawn: 'package', found: 'open_book', earn: 'coin', upgrade: 'chart_increasing', boss: 'ogre' };
/** Objectif d'une mission selon le nombre de missions déjà accomplies (n). */
export const missionTarget = (kind: MissionKind, n: number, incomePerSec: number): number => {
  const k = 1 + n * 0.12;
  switch (kind) {
    case 'merge':
      return Math.round(Math.min(50, 6 * k));
    case 'order':
      return Math.round(Math.min(20, 2 + n * 0.25));
    case 'spawn':
      return Math.round(Math.min(60, 10 * k)); // chaque objet coûte 1 énergie : objectif raisonnable
    case 'found':
      return 1;
    case 'earn':
      return Math.round(Math.max(150 * k, incomePerSec * 60 * 8) / 10) * 10;
    case 'upgrade':
      return Math.min(4, 1 + Math.floor(n / 8));
    case 'boss':
      return 1;
  }
};
/** Récompense : le plus grand entre un minimum qui grandit et quelques minutes de revenu. */
export const missionCoins = (n: number, incomePerSec: number) => Math.round(Math.max(40 * Math.pow(1.18, Math.min(n, 60)), incomePerSec * 60 * 5));
export const missionStars = (level: number) => 3 + level;
export const CHEST_EVERY = 5; // un coffre toutes les 5 missions
export const chestCoins = (level: number, incomePerSec: number) => Math.round(Math.max(250 * level, incomePerSec * 60 * 20));

// ---- Gloutons (combat) ----
export const BOSS_UNLOCK_LEVEL = 4;
export const BOSS_TIME_MS = 60e3;
export const BOSS_COOLDOWN_MS = 3 * 60e3;
export const bossHp = (level: number) => Math.round(60 * Math.pow(1.55, level - 1));
export const bossCoins = (level: number) => Math.round(bossHp(level) * 1.5);
export const bossStars = (level: number) => 5 + 2 * level;
/** Dégâts d'un objet lancé sur le Glouton. */
export const bossDamage = (tier: number, powerLvl: number) => Math.round(itemValue(tier) * (1 + 0.25 * powerLvl));
export const BOSSES: { img: string; name: string }[] = [
  { img: 'ghost', name: 'Glouton fantôme' },
  { img: 'goblin', name: 'Glouton farceur' },
  { img: 'alien_monster', name: "Glouton venu d'ailleurs" },
  { img: 'ogre', name: 'Grand Glouton' },
  { img: 'zombie', name: 'Glouton zombie' },
  { img: 'dragon', name: 'Glouton dragon' },
];
export const bossOf = (level: number) => BOSSES[(level - 1) % BOSSES.length];

// ---- Cadeau du jour (série de 7 jours) ----
/** Chaque jour : le plus grand entre un minimum fixe et N minutes de revenu passif. */
export const DAILY: { floor: number; minutes: number }[] = [
  { floor: 60, minutes: 5 },
  { floor: 120, minutes: 8 },
  { floor: 250, minutes: 12 },
  { floor: 500, minutes: 16 },
  { floor: 900, minutes: 20 },
  { floor: 1500, minutes: 25 },
  { floor: 3000, minutes: 45 },
];

// ---- Saisons (prestige) ----
export const PRESTIGE_LEVEL = 12; // niveau à atteindre pour lancer une nouvelle saison
/** Rubans gagnés en fin de saison, selon les pièces gagnées pendant la saison. */
export const ribbonsFor = (runEarned: number) => Math.floor(Math.sqrt(runEarned / 10000));
export const RIBBON_BONUS = 0.15; // +15 % de pièces par ruban, pour toujours
export const ribbonMult = (ribbons: number) => 1 + RIBBON_BONUS * ribbons;

// ---- Trophées ----
export type TrophyKind = 'merges' | 'orders' | 'level' | 'album' | 'earned' | 'seasons' | 'boss' | 'chain';
export type TrophyDef = { id: string; kind: TrophyKind; chain?: ChainId; target: number; name: string; img: string; floor: number; minutes: number };
const ladder = (kind: TrophyKind, img: string, name: (n: number) => string, targets: number[], floor0: number): TrophyDef[] =>
  targets.map((target, i) => ({ id: `${kind}${target}`, kind, target, name: name(target), img, floor: Math.round(floor0 * Math.pow(4, i)), minutes: 4 + 3 * i }));
const big = (n: number) => (n >= 1e9 ? `${n / 1e9} Md` : n >= 1e6 ? `${n / 1e6} M` : n >= 1000 ? `${n / 1000} k` : String(n));
export const TROPHIES: TrophyDef[] = [
  ...ladder('merges', 'sparkles', (n) => `${big(n)} fusions`, [25, 150, 600, 2500, 8000, 25000, 80000], 40),
  ...ladder('orders', 'shopping_bags', (n) => `${big(n)} commandes livrées`, [5, 30, 120, 400, 1200, 4000], 50),
  ...ladder('level', 'star', (n) => `Atteindre le niveau ${n}`, [3, 6, 10, 15, 20, 26, 33, 40], 60),
  ...ladder('album', 'open_book', (n) => `${n} objets découverts`, [8, 16, 24, 36, 48, 60, 72], 80),
  ...ladder('earned', 'money_bag', (n) => `Gagner ${big(n)} pièces`, [1000, 20000, 500000, 10000000, 250000000, 5000000000], 100),
  ...ladder('seasons', 'rosette', (n) => (n === 1 ? 'Lancer une nouvelle saison' : `${n} saisons lancées`), [1, 3, 6, 10], 2000),
  ...ladder('boss', 'crossed_swords', (n) => (n === 1 ? 'Repousser un Glouton' : `${n} Gloutons repoussés`), [1, 5, 15, 40, 100, 250], 150),
  ...CHAIN_IDS.flatMap((c) =>
    [6, 9, 12].map((target, i) => ({
      id: `chain-${c}-${target}`,
      kind: 'chain' as TrophyKind,
      chain: c,
      target,
      name: `${CHAINS[c].name} : ${CHAINS[c].items[target - 1].name}`,
      img: CHAINS[c].items[target - 1].img,
      floor: [300, 5000, 100000][i] * CHAINS[c].costMult,
      minutes: [8, 15, 30][i],
    })),
  ),
];

// ---- Plaisir de jeu ----
export const COMBO_WINDOW_MS = 3500; // deux fusions à moins de 3,5 s : le combo monte
export const COMBO_MAX = 10;
export const comboMult = (combo: number) => 1 + 0.2 * Math.min(combo, COMBO_MAX); // sur la prime de fusion
export const LUCKY_MERGE_CHANCE = 0.05; // « fusion en or » : l'objet gagne deux paliers d'un coup
/** Clients qui passent commande (visages). */
export const FACES: string[] = ['cat', 'dog_face', 'rabbit_face', 'pig_face', 'cow_face', 'frog', 'owl', 'chicken', 'hedgehog', 'chipmunk', 'duck', 'robot'];
export const IDLE_HINT_MS = 9000; // sans action pendant 9 s : la main montre une fusion possible
