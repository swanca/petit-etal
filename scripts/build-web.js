// Construit le site statique dans dist/ pour un hébergement sous un sous-dossier (GitHub Pages).
// Usage : node scripts/build-web.js <nom-du-depot>     (ex. node scripts/build-web.js petit-etal)
//         node scripts/build-web.js /                  (site à la racine d'un domaine)
// Ajoute ce qu'Expo ne met pas : manifeste d'appli installable, service worker (hors connexion),
// balises plein écran pour mobile, fichier .nojekyll et 404.html.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
if (process.argv.length < 3) {
  console.error('Indique le nom du dépôt GitHub : node scripts/build-web.js <nom-du-depot>');
  process.exit(1);
}
const arg = process.argv[2].replace(/^\/+|\/+$/g, '');
const baseUrl = arg ? `/${arg}` : '';
const dist = path.join(root, 'dist');
fs.rmSync(dist, { recursive: true, force: true });

const r = spawnSync(process.execPath, [path.join(root, 'node_modules', 'expo', 'bin', 'cli'), 'export', '-p', 'web', '--output-dir', 'dist'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, EXPO_BASE_URL: baseUrl, NODE_ENV: 'production' },
});
if (r.status !== 0) process.exit(r.status || 1);

const HEAD = `
    <link rel="manifest" href="manifest.json" />
    <link rel="apple-touch-icon" href="apple-touch-icon.png" />
    <meta name="theme-color" content="#E23D32" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="Petit Étal" />
    <meta name="description" content="Petit Étal : fusionne les produits, sers les clients et fais grandir ton marché." />
    <style>html,body{overscroll-behavior:none;background:#C9352B;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation}img{-webkit-user-drag:none}</style>
    <script>if('serviceWorker' in navigator){addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){})})}</script>
  </head>`;
const indexPath = path.join(dist, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
if (!html.includes('</head>')) throw new Error('index.html inattendu : pas de </head>');
html = html.replace('</head>', HEAD);
// Pas de zoom au pincement ni au double toucher ; l'appli occupe aussi la zone de l'encoche.
html = html.replace(/<meta name="viewport"[^>]*>/, '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />');
html = html.replace(/<html lang="[^"]*">/, '<html lang="fr">');
fs.writeFileSync(indexPath, html);
fs.writeFileSync(path.join(dist, '404.html'), html); // GitHub Pages : toute adresse inconnue retombe sur le jeu
fs.writeFileSync(path.join(dist, '.nojekyll'), ''); // sans ça, GitHub Pages ignore les dossiers commençant par « _ »
// Appli Android téléchargeable depuis le site (bouton « Télécharger l'APK »), si build-android.bat l'a produite.
// On publie la version arm64 (tous les téléphones récents) : l'universelle dépasse vite la limite de 100 Mo de GitHub.
const apk = ['petit-etal-arm64.apk', 'petit-etal.apk'].map((f) => path.join(root, 'apk', f)).find((f) => fs.existsSync(f) && fs.statSync(f).size < 95e6);
if (apk) {
  fs.copyFileSync(apk, path.join(dist, 'petit-etal.apk'));
  console.log(`APK publié : petit-etal.apk (${(fs.statSync(apk).size / 1e6).toFixed(1)} Mo, depuis ${path.basename(apk)})`);
} else console.warn('Pas d’APK dans apk/ : le bouton « Télécharger l’APK » donnera une erreur 404. Lance build-android.bat apk.');

const size = (dir) => fs.readdirSync(dir, { withFileTypes: true }).reduce((a, e) => a + (e.isDirectory() ? size(path.join(dir, e.name)) : fs.statSync(path.join(dir, e.name)).size), 0);
console.log(`\nOK : dist/ prêt (${(size(dist) / 1e6).toFixed(1)} Mo), chemin de base « ${baseUrl || '/'} ».`);
