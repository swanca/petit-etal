// Fabrique les icônes de l'appli à partir d'une image Fluent Emoji (MIT) : fond rouge du store, croissant au centre.
// Sorties : public/icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png, assets/icon.png (1024),
// assets/favicon.png. Usage : node scripts/make-icons.js
const path = require('path');
const Jimp = require('jimp-compact');

const SRC = path.join(__dirname, '..', 'assets', 'items', 'croissant.png');
const RED = 0xe23d32ff;
const CREAM = 0xfff8f3ff;

async function make(size, file, { ratio, round }) {
  const img = new Jimp(size, size, RED);
  // Disque crème derrière le croissant, pour qu'il se détache du rouge.
  const r = size * 0.4;
  img.scan(0, 0, size, size, function (x, y, idx) {
    const d = Math.hypot(x - size / 2, y - size / 2);
    if (d < r) this.bitmap.data.writeUInt32BE(CREAM, idx);
    if (round) {
      // Coins arrondis (transparents) pour les icônes non « maskable ».
      const rad = size * 0.22;
      const cx = Math.min(Math.max(x, rad), size - rad);
      const cy = Math.min(Math.max(y, rad), size - rad);
      if (Math.hypot(x - cx, y - cy) > rad) this.bitmap.data[idx + 3] = 0;
    }
  });
  const emoji = (await Jimp.read(SRC)).resize(Math.round(size * ratio), Math.round(size * ratio), Jimp.RESIZE_BICUBIC);
  img.composite(emoji, Math.round((size - emoji.bitmap.width) / 2), Math.round((size - emoji.bitmap.height) / 2));
  await img.writeAsync(file);
  console.log(path.relative(process.cwd(), file));
}

(async () => {
  const pub = path.join(__dirname, '..', 'public');
  const assets = path.join(__dirname, '..', 'assets');
  await make(192, path.join(pub, 'icon-192.png'), { ratio: 0.62, round: true });
  await make(512, path.join(pub, 'icon-512.png'), { ratio: 0.62, round: true });
  await make(512, path.join(pub, 'icon-maskable-512.png'), { ratio: 0.5, round: false });
  await make(180, path.join(pub, 'apple-touch-icon.png'), { ratio: 0.62, round: false });
  await make(1024, path.join(assets, 'icon.png'), { ratio: 0.62, round: false });
  await make(64, path.join(assets, 'favicon.png'), { ratio: 0.7, round: true });
})();
