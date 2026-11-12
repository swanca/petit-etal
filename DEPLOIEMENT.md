# Mettre Petit Étal en ligne (GitHub Pages)

Le jeu est un site statique : le dossier `dist/` contient tout. Une fois en ligne, il s'installe sur le téléphone
comme une appli (icône sur l'écran d'accueil, plein écran, jouable hors connexion).

## 1. Créer le dépôt (une fois)

Sur github.com : **New repository**, nom `petit-etal` (ou un autre), visibilité **Public** (GitHub Pages gratuit
ne sert que les dépôts publics), sans README ni .gitignore. Copier l'adresse du dépôt
(`https://github.com/TON-COMPTE/petit-etal.git`).

## 2. Publier

Dans un terminal ouvert dans `apps/etal` :

```bash
publier.bat https://github.com/TON-COMPTE/petit-etal.git
```

Le script construit le site avec le bon chemin de base (le nom du dépôt), envoie le code sur `main` et le site sur
la branche `gh-pages`. À la première utilisation, Git ouvre une fenêtre de connexion GitHub.

## 3. Activer Pages (une fois)

Dans le dépôt : **Settings → Pages → Build and deployment → Source : Deploy from a branch**, branche **gh-pages**,
dossier **/ (root)**, **Save**. Une à deux minutes plus tard, le jeu est à l'adresse :

```
https://TON-COMPTE.github.io/petit-etal/
```

## 4. Installer sur le téléphone

- **Android (Chrome)** : ouvrir le lien, menu ⋮ → **Installer l'application** (ou **Ajouter à l'écran d'accueil**).
  Le bouton « Installer » est aussi dans Réglages (⚙) du jeu.
- **iPhone (Safari)** : bouton Partager → **Sur l'écran d'accueil**.

Lancé depuis l'icône, le jeu s'ouvre en plein écran, sans barre de navigateur. La sauvegarde est sur l'appareil
(stockage du navigateur) : désinstaller l'appli ou vider les données du site l'efface.

## Mettre à jour le jeu

Relancer la même commande `publier.bat …`. Les joueurs reçoivent la nouvelle version à l'ouverture suivante
(en ligne) ; leur sauvegarde est conservée.

## À la main (si le script ne convient pas)

```bash
node scripts/build-web.js petit-etal
```

```bash
npx gh-pages --nojekyll -d dist
```

Le nom passé à `build-web.js` doit être exactement celui du dépôt : c'est le sous-dossier où GitHub sert le site.
Pour un domaine à soi (site à la racine) : `node scripts/build-web.js /`. Vérifier en local avant d'envoyer :
`node scripts/serve-dist.js petit-etal` puis ouvrir http://localhost:8085/petit-etal/.

`dist/` contient déjà `.nojekyll` (sinon GitHub ignore le dossier `_expo`) et `404.html`.

## Autre hébergeur

N'importe quel hébergeur de fichiers statiques convient (Netlify, Cloudflare Pages, itch.io en « HTML5 ») :
construire avec `node scripts/build-web.js /` et envoyer le contenu de `dist/`.

---

# Plus tard : l'appli Android (APK / AAB)

Le même code tourne en natif (Expo SDK 58, React Native). Rien à réécrire.

```bash
build-android.bat apk
```

donne `apk/petit-etal.apk` (tous téléphones) et `apk/petit-etal-arm64.apk` (plus léger). Sans argument, le script
produit aussi `apk/petit-etal.aab` pour Google Play. Même méthode que Cubi (`apps/quatre/build-android.bat`) :

- **R8 / minification désactivés** (`-Pandroid.enableMinifyInReleaseBuilds=false`) : les builds minifiés de Cubi
  crashaient au lancement. Ne pas les réactiver.
- **APK par processeur** : plugin `plugins/withAbiSplits.js` (option `-PabiSplits`).
- **Signature** : plugin `plugins/withReleaseSigning.js`. Créer une clé d'upload et le fichier
  `signing/etal-signing.properties` (`STORE_FILE`, `STORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`) ; sans ce fichier,
  l'APK est signé avec la clé de debug (installable pour tester, pas publiable).
- Le projet est recopié dans `D:\b\etal` pour compiler (limite de 260 caractères de Windows).

Avant la première publication sur Google Play, il restera à faire : icône adaptative Android (avant-plan / fond,
à partir de `assets/icon.png`), écran de démarrage, fiche du Store et politique de confidentialité, et — si
monétisation — publicités récompensées (doubler les gains hors ligne, relancer un boost) et achats, comme dans Cubi.
Le build Android n'a pas encore été lancé pour ce jeu.
