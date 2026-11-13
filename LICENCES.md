# Licences des ressources — Petit Étal

Tout ce qui est dans le jeu est soit créé pour lui, soit sous licence permissive (usage commercial autorisé).

| Ressource | Source | Licence | Où |
|---|---|---|---|
| Images des objets, stands, clients, Gloutons, icônes (≈ 150 PNG 256 px) | Fluent Emoji 3D, Microsoft — https://github.com/microsoft/fluentui-emoji (téléchargées via cdn.jsdelivr.net, ou reprises de `apps/quatre/assets/ui`) | MIT — copie du texte dans `assets/items/LICENCE.txt` | `assets/items/` |
| Icône de l'appli (croissant sur fond rouge) | Composée par `scripts/make-icons.js` à partir de l'emoji « croissant » Fluent Emoji | MIT (image d'origine) | `assets/icon.png`, `public/icon-*.png` |
| Police Fredoka | Google Fonts, paquet `@expo-google-fonts/fredoka` | SIL Open Font License 1.1 | chargée au lancement |
| Police Nunito | Google Fonts, paquet `@expo-google-fonts/nunito` | SIL Open Font License 1.1 | chargée au lancement |
| Bruitages fusion, objectifs, achat, interface (`merge*`, `rare`, `found`, `order` (cloche), `buy`, `boost`, `error`) | Kenney « Interface Sounds » — https://opengameart.org/content/interface-sounds | CC0 (domaine public) | `assets/sounds/*.mp3` |
| Coup sur un Glouton (`hit`) | Kenney « RPG Sound Pack » — https://opengameart.org/content/50-rpg-sound-effects | CC0 | `assets/sounds/hit.mp3` |
| Sortie d'article, prise/pose, pièces, coffre, menus, jingles (`pop`, `lift`, `drop`, `coin`, `chest`, `open`, `close`, `click`, `poor`, `boss`, `flee`, `levelup`, `quest`, `daily`) | « Cozy Farm SFX » par Bramble & Byte — https://opengameart.org/content/cozy-farm-sfx-50-farming-game-sound-effects-tools-harvest-shop-ui-jingles (https://aquumgifts.itch.io) | CC-BY 4.0 — crédit affiché dans Réglages | `assets/sounds/*.mp3` |
| Ambiance de marché (`ambience`) : oiseaux + brouhaha lointain mixés | « Park Ambiences » par Thimras — https://opengameart.org/content/park-ambiences ; « Crowd Shouting/Speaking Ambience » — https://opengameart.org/content/crowd-shoutingspeaking-ambience | CC0 | `assets/sounds/ambience.mp3` |
| Musique de fond (`music`) | « Busy Day At The Market » par ViRiX Dreamcore — https://opengameart.org/content/busy-day-at-the-market | CC-BY 3.0 — crédit affiché dans Réglages | `assets/sounds/music.mp3` |

Les sons sont découpés, adoucis (aigus filtrés, attaque fondue), mis à niveau et encodés en MP3 par
`scripts/make-sounds.js` (ffmpeg) à partir des archives d'origine.
| Code | Écrit pour ce projet ; bibliothèques : Expo, React Native, React Native Web (MIT) | MIT pour les bibliothèques | `src/`, `node_modules/` |

Obligation de la licence MIT : garder la mention de copyright de Microsoft avec les images (c'est le rôle de
`assets/items/LICENCE.txt`, et la mention figure dans Réglages).

Le thème, les noms (Petit Étal, Gloutons, stands), les chaînes d'objets et l'interface sont originaux : aucun élément
n'est repris d'un jeu existant.
