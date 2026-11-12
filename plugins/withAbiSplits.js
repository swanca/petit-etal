// APK séparés par processeur, en plus de l'APK universel : l'APK « arm64-v8a » (tous les téléphones récents)
// est environ deux fois plus léger, pratique pour l'envoyer aux testeurs. L'AAB du Play Store n'est pas concerné
// (Google Play découpe déjà le téléchargement par appareil).
const { withAppBuildGradle } = require('expo/config-plugins');

const SPLITS = `
    splits {
        abi {
            // Seulement pour les APK (-PabiSplits) : Gradle refuse les APK séparés pendant la création de l'AAB.
            enable project.hasProperty('abiSplits')
            reset()
            include 'arm64-v8a', 'armeabi-v7a', 'x86', 'x86_64'
            universalApk true
        }
    }
`;

module.exports = (config) =>
  withAppBuildGradle(config, (cfg) => {
    let gradle = cfg.modResults.contents;
    if (gradle.includes('universalApk')) return cfg;
    gradle = gradle.replace(/\n(\s*)buildTypes \{/, `\n${SPLITS}\n$1buildTypes {`);
    cfg.modResults.contents = gradle;
    return cfg;
  });
