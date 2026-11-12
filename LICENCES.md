# Licences des ressources — Petit Étal

Tout ce qui est dans le jeu est soit créé pour lui, soit sous licence permissive (usage commercial autorisé).

| Ressource | Source | Licence | Où |
|---|---|---|---|
| Images des objets, stands, clients, Gloutons, icônes (≈ 150 PNG 256 px) | Fluent Emoji 3D, Microsoft — https://github.com/microsoft/fluentui-emoji (téléchargées via cdn.jsdelivr.net, ou reprises de `apps/quatre/assets/ui`) | MIT — copie du texte dans `assets/items/LICENCE.txt` | `assets/items/` |
| Icône de l'appli (croissant sur fond rouge) | Composée par `scripts/make-icons.js` à partir de l'emoji « croissant » Fluent Emoji | MIT (image d'origine) | `assets/icon.png`, `public/icon-*.png` |
| Police Fredoka | Google Fonts, paquet `@expo-google-fonts/fredoka` | SIL Open Font License 1.1 | chargée au lancement |
| Police Nunito | Google Fonts, paquet `@expo-google-fonts/nunito` | SIL Open Font License 1.1 | chargée au lancement |
| Sons (pop, pièce, étoile, niveau, etc.) | Synthétisés par script pour Cubi (`apps/quatre/scripts/make-sounds.js`), repris ici | Création maison, aucun droit tiers | `assets/sounds/*.wav` |
| Musique de fond | Synthétisée par `scripts/make-music.js` (boucle originale de 40 s) | Création maison, aucun droit tiers | `assets/sounds/music.wav` |
| Code | Écrit pour ce projet ; bibliothèques : Expo, React Native, React Native Web (MIT) | MIT pour les bibliothèques | `src/`, `node_modules/` |

Obligation de la licence MIT : garder la mention de copyright de Microsoft avec les images (c'est le rôle de
`assets/items/LICENCE.txt`, et la mention figure dans Réglages).

Le thème, les noms (Petit Étal, Gloutons, stands), les chaînes d'objets et l'interface sont originaux : aucun élément
n'est repris d'un jeu existant.
