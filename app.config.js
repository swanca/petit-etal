// Complète app.json : chemin de base du site web (GitHub Pages sert un projet sous /nom-du-depot).
// EXPO_BASE_URL est posé par scripts/build-web.js ; vide en développement et pour l'app mobile.
module.exports = ({ config }) => ({
  ...config,
  experiments: { ...(config.experiments || {}), baseUrl: process.env.EXPO_BASE_URL || '' },
});
