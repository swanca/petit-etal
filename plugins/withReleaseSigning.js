// Signe le build Android « release » avec la clé d'upload locale, si elle est présente.
// Les secrets restent hors du dépôt : chemin du fichier .properties dans APP_SIGNING.
// Sans ce fichier (ex. builds EAS, qui gèrent leur propre signature), rien ne change.
const { withAppBuildGradle } = require('expo/config-plugins');

const SNIPPET = `
def signingPropsFile = System.getenv('APP_SIGNING') ? file(System.getenv('APP_SIGNING')) : null
def signingProps = new Properties()
if (signingPropsFile != null && signingPropsFile.exists()) {
    signingPropsFile.withInputStream { signingProps.load(it) }
}
`;

module.exports = (config) =>
  withAppBuildGradle(config, (cfg) => {
    let gradle = cfg.modResults.contents;
    if (gradle.includes('APP_SIGNING')) return cfg;

    gradle = gradle.replace(/\nandroid \{/, `${SNIPPET}\nandroid {`);
    gradle = gradle.replace(
      /signingConfigs \{\n(\s*)debug \{/,
      `signingConfigs {
$1if (signingProps['STORE_FILE']) {
$1    upload {
$1        storeFile file(signingProps['STORE_FILE'])
$1        storePassword signingProps['STORE_PASSWORD']
$1        keyAlias signingProps['KEY_ALIAS']
$1        keyPassword signingProps['KEY_PASSWORD']
$1    }
$1}
$1debug {`,
    );
    gradle = gradle.replace(
      /(release \{[\s\S]*?)signingConfig signingConfigs\.debug/,
      `$1signingConfig signingProps['STORE_FILE'] ? signingConfigs.upload : signingConfigs.debug`,
    );
    cfg.modResults.contents = gradle;
    return cfg;
  });
