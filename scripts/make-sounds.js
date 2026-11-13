// Prépare les sons du jeu à partir des packs libres téléchargés (voir LICENCES.md) :
// découpe, normalise le volume, crée les variantes de hauteur des fusions et encode en MP3 (lu partout,
// y compris Safari/iOS). Usage : node scripts/make-sounds.js <dossier-des-packs> <ffmpeg.exe>
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const [SRC, FF] = process.argv.slice(2);
if (!SRC || !FF) {
  console.error('Usage : node scripts/make-sounds.js <dossier-des-packs> <ffmpeg.exe>');
  process.exit(1);
}
const OUT = path.join(__dirname, '..', 'assets', 'sounds');
const cozy = (n) => path.join(SRC, 'x_cozy', 'cozy-farm-sfx', 'sfx', `${n}.wav`);
const ui = (n) => path.join(SRC, 'x_kenney_interfaceSounds', 'Audio', `${n}.ogg`);
const rpg = (n) => path.join(SRC, 'x_RPGsounds_Kenney', 'OGG', `${n}.ogg`);
const casino = (n) => path.join(SRC, 'x_kenney_casino-audio', 'Audio', `${n}.ogg`);

function find(file) {
  if (fs.existsSync(file)) return file;
  // Les archives n'ont pas toutes la même arborescence : on cherche le fichier par son nom.
  const name = path.basename(file);
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        const r = walk(p);
        if (r) return r;
      } else if (e.name === name) return p;
    }
    return null;
  };
  const r = walk(SRC);
  if (!r) throw new Error(`introuvable : ${name}`);
  return r;
}

function ff(args) {
  const r = spawnSync(FF, ['-hide_banner', '-y', ...args], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr.slice(-800));
  return r.stderr;
}

function peak(file, filter) {
  const log = ff(['-i', file, '-af', `${filter ? filter + ',' : ''}volumedetect`, '-f', 'null', '-']);
  const m = log.match(/max_volume: (-?[\d.]+) dB/);
  return m ? parseFloat(m[1]) : 0;
}

/** Un son court : filtre optionnel, normalisé à `target` dB crête, mono, MP3. */
function sfx(name, src, { filter = '', target = -6, maxSec = 4, lp = 9000 } = {}) {
  const input = find(src);
  const base = `silenceremove=start_periods=1:start_threshold=-50dB,atrim=0:${maxSec},afade=t=in:d=0.004,afade=t=out:st=${Math.max(0, maxSec - 0.05)}:d=0.05${filter ? ',' + filter : ''},lowpass=f=${lp}`;
  const gain = target - peak(input, base);
  ff(['-i', input, '-af', `${base},volume=${gain.toFixed(2)}dB`, '-ac', '1', '-ar', '44100', '-b:a', '96k', path.join(OUT, `${name}.mp3`)]);
  console.log(name);
}

/** Deux sons superposés (ex. clochette + pièces pour une commande livrée). */
function mix(name, a, b, { delayB = 0, volB = 1, target = -6, lp = 9000 } = {}) {
  const tmp = path.join(OUT, `_${name}.wav`);
  ff(['-i', find(a), '-i', find(b), '-filter_complex', `[1]adelay=${delayB}|${delayB},volume=${volB}[b];[0][b]amix=inputs=2:duration=longest`, '-ac', '1', '-ar', '44100', tmp]);
  sfx(name, tmp, { target, lp });
  fs.rmSync(tmp);
}

fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) fs.rmSync(path.join(OUT, f));

// Tout est volontairement doux : aigus filtrés, attaque fondue, crête basse (le jeu se joue longtemps).
// Gestes sur l'étal.
sfx('lift', cozy('pickup-item'), { target: -9, lp: 6000 });
sfx('drop', cozy('place-item'), { target: -6 });
sfx('pop', cozy('harvest-pop'), { target: -6, lp: 7000 });
// Fusion : « bloop » rond, une note plus haute à chaque fusion enchaînée (gamme majeure).
[0, 2, 4, 5, 7, 9].forEach((semi, i) => {
  const r = Math.pow(2, semi / 12);
  sfx(`merge${i}`, ui('drop_002'), { filter: `asetrate=44100*${r.toFixed(4)},aresample=44100`, target: -3 });
});
sfx('rare', ui('bong_001'), { filter: 'asetrate=44100*1.335,aresample=44100', target: -4 });
sfx('found', ui('confirmation_001'), { target: -5 });
sfx('coin', cozy('sell-coins'), { target: -10, lp: 4500 });
mix('order', ui('bong_001'), cozy('sell-coins'), { delayB: 120, volB: 0.35, target: -4, lp: 5000 });
sfx('buy', ui('maximize_006'), { target: -4 });
sfx('boost', ui('confirmation_004'), { target: -5, lp: 6000 });
sfx('chest', cozy('chest-open'), { target: -5 });
// Interface.
sfx('click', cozy('ui-click'), { target: -10, lp: 6000 });
sfx('open', cozy('menu-open'), { target: -9, lp: 6000 });
sfx('close', cozy('menu-close'), { target: -10, lp: 6000 });
sfx('error', ui('error_006'), { target: -8 });
sfx('poor', cozy('not-enough-money'), { target: -8, lp: 5000 });
// Gloutons.
sfx('hit', rpg('chop'), { target: -5, lp: 5000 });
sfx('boss', cozy('jingle-festival'), { maxSec: 6, target: -5, lp: 6000 });
sfx('flee', cozy('jingle-fail'), { maxSec: 6, target: -6 });
// Jingles (objectifs, niveau, cadeau du jour).
sfx('levelup', cozy('jingle-level-up'), { maxSec: 6, target: -4 });
sfx('quest', cozy('jingle-quest-complete'), { maxSec: 6, target: -4, lp: 7000 });
sfx('daily', cozy('jingle-new-day'), { maxSec: 6, target: -4 });

// Ambiance de marché : oiseaux du parc + brouhaha lointain, 60 s qui bouclent sans couture
// (fondu enchaîné de la fin sur le début).
{
  const tmp = path.join(OUT, '_amb.wav');
  ff([
    '-ss', '30', '-t', '64', '-i', find(path.join(SRC, 'park_ambience_birds.wav')),
    '-stream_loop', '2', '-i', find(path.join(SRC, 'crowd_shouting_0.ogg')),
    '-filter_complex',
    '[1]atrim=0:64,lowpass=f=1800,volume=0.12[c];[0]volume=1[b];[b][c]amix=inputs=2:duration=first,aformat=channel_layouts=stereo[m];' +
      '[m]asplit=3[x][y][z];[x]atrim=60:64,asetpts=PTS-STARTPTS[tail];' +
      '[y]atrim=0:4,asetpts=PTS-STARTPTS[h4];[z]atrim=4:60,asetpts=PTS-STARTPTS[rest]',
    '-map', '[tail]', path.join(OUT, '_tail.wav'), '-map', '[h4]', path.join(OUT, '_h4.wav'), '-map', '[rest]', tmp,
  ]);
  // Crossfade : début (4 s) fondu avec la fin (4 s), puis le reste.
  const x = path.join(OUT, '_x.wav');
  ff(['-i', path.join(OUT, '_tail.wav'), '-i', path.join(OUT, '_h4.wav'), '-filter_complex', '[0]afade=t=out:d=4[a];[1]afade=t=in:d=4[b];[a][b]amix=inputs=2', x]);
  const all = path.join(OUT, '_all.wav');
  ff(['-i', x, '-i', tmp, '-filter_complex', '[0][1]concat=n=2:v=0:a=1', all]);
  const gain = -6 - peak(all);
  ff(['-i', all, '-af', `volume=${gain.toFixed(2)}dB`, '-ac', '2', '-ar', '44100', '-b:a', '80k', path.join(OUT, 'ambience.mp3')]);
  for (const f of ['_amb.wav', '_tail.wav', '_h4.wav', '_x.wav', '_all.wav']) fs.rmSync(path.join(OUT, f));
  console.log('ambience');
}

// Musique : « Busy Day At The Market » (boucle d'origine), normalisée.
{
  const src = find(path.join(SRC, 'busy_market.wav'));
  const gain = -1 - peak(src);
  ff(['-i', src, '-af', `volume=${gain.toFixed(2)}dB`, '-ac', '2', '-ar', '44100', '-b:a', '112k', path.join(OUT, 'music.mp3')]);
  console.log('music');
}

const total = fs.readdirSync(OUT).reduce((a, f) => a + fs.statSync(path.join(OUT, f)).size, 0);
console.log(`OK : ${fs.readdirSync(OUT).length} fichiers, ${(total / 1e6).toFixed(2)} Mo`);
