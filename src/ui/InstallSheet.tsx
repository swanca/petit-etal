// Installer le jeu sur le téléphone : un bandeau discret sous l'auvent et un mode d'emploi adapté
// au navigateur (Chrome Android, Safari iPhone, navigateur intégré d'une appli, ordinateur).
import { ReactNode, useState } from 'react';
import { Pressable, View } from 'react-native';
import { ImgName } from './images';
import { copyLink, InstallEnv, isAndroid, openInChrome, promptInstall, siteUrl, useInstallEnv } from './install';
import { Sheet } from './Sheets';
import { Btn, C, F, Icon, T } from './theme';

const DISMISS_KEY = 'etal.install.dismissed';
const DISMISS_MS = 3 * 24 * 3600e3;

function dismissedRecently(): boolean {
  try {
    const t = Number(window.localStorage.getItem(DISMISS_KEY) || 0);
    return Date.now() - t < DISMISS_MS;
  } catch {
    return false;
  }
}

/** Bandeau « Installe le jeu » : visible sur mobile tant que le jeu n'est pas installé (masquable 3 jours). */
export function InstallBanner({ ready, onOpen }: { ready: boolean; onOpen: () => void }) {
  const env = useInstallEnv();
  const [hidden, setHidden] = useState(() => dismissedRecently());
  // Dans le navigateur d'une appli (Messenger…), on prévient tout de suite : rien n'y sera sauvegardé durablement.
  const show = env !== 'installed' && env !== 'desktop' && !hidden && (ready || env === 'inapp');
  if (!show) return null;
  const text = env === 'inapp' ? 'Ouvre le jeu dans ton navigateur pour l’installer' : 'Installe Petit Étal : plein écran, même hors ligne';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 10, marginTop: 4, paddingLeft: 8, paddingRight: 4, paddingVertical: 4, borderRadius: 14, backgroundColor: C.ink }}>
      <Icon name="mobile_phone" size={22} />
      <T style={{ flex: 1, color: C.white, fontFamily: F.semi, fontSize: 12, lineHeight: 15 }} numberOfLines={2}>
        {text}
      </T>
      <Pressable onPress={onOpen} style={{ backgroundColor: C.gold, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, borderBottomWidth: 3, borderBottomColor: C.goldDark }}>
        <T style={{ fontFamily: F.title, fontSize: 13, lineHeight: 16, color: C.ink }}>Installer</T>
      </Pressable>
      <Pressable
        hitSlop={8}
        onPress={() => {
          try {
            window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
          } catch {}
          setHidden(true);
        }}
        style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
        <T style={{ color: C.white, fontSize: 14, lineHeight: 18, opacity: 0.7 }}>✕</T>
      </Pressable>
    </View>
  );
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' }}>
        <T style={{ fontFamily: F.title, color: C.white, fontSize: 15, lineHeight: 19 }}>{n}</T>
      </View>
      <T style={{ flex: 1, fontSize: 14, lineHeight: 19 }}>{children}</T>
    </View>
  );
}

/** Icône « Partager » de Safari (carré ouvert et flèche vers le haut), dessinée pour être reconnue. */
function ShareGlyph() {
  return (
    <View style={{ width: 18, height: 20, alignItems: 'center', justifyContent: 'flex-end', marginHorizontal: 2, transform: [{ translateY: 3 }] }}>
      <View style={{ position: 'absolute', top: 0, width: 2, height: 12, backgroundColor: '#1A7CF5' }} />
      <View style={{ position: 'absolute', top: 0, width: 7, height: 7, borderLeftWidth: 2, borderTopWidth: 2, borderColor: '#1A7CF5', transform: [{ rotate: '45deg' }] }} />
      <View style={{ width: 16, height: 11, borderWidth: 2, borderTopWidth: 0, borderColor: '#1A7CF5', borderBottomLeftRadius: 3, borderBottomRightRadius: 3 }} />
    </View>
  );
}

function Card({ title, img, children }: { title: string; img: ImgName; children: ReactNode }) {
  return (
    <View style={{ backgroundColor: C.card, borderRadius: 16, borderWidth: 2, borderColor: C.line, padding: 12, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name={img} size={26} />
        <T style={{ flex: 1, fontFamily: F.title, fontSize: 17 }}>{title}</T>
      </View>
      {children}
    </View>
  );
}

/** Chrome dit « déjà installée » alors que l'icône n'est plus là : une ancienne copie est restée sur le téléphone. */
function AlreadyInstalled() {
  return (
    <Card title="Chrome dit « déjà installée » ?" img="light_bulb">
      <T style={{ fontSize: 13 }}>Une ancienne copie du jeu est restée sur le téléphone (supprimer l’icône ne la désinstalle pas).</T>
      <Step n={1}>Ouvre les Paramètres du téléphone → Applications.</Step>
      <Step n={2}>Cherche « Petit Étal » et touche « Désinstaller » (s’il y en a deux, désinstalle les deux).</Step>
      <Step n={3}>Reviens ici et réinstalle : ta partie est gardée dans Chrome.</Step>
    </Card>
  );
}

function Body({ env, onDone }: { env: InstallEnv; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => setCopied(await copyLink());

  if (env === 'installed') {
    return (
      <Card title="C’est installé !" img="check_mark_button">
        <T style={{ fontSize: 14 }}>Petit Étal est sur ton écran d’accueil. Lance-le depuis son icône pour jouer en plein écran.</T>
      </Card>
    );
  }
  if (env === 'prompt') {
    return (
      <>
        <Card title="Installer en un toucher" img="mobile_phone">
          <T style={{ fontSize: 14 }}>Le jeu s’ajoute à ton écran d’accueil et s’ouvre en plein écran, même sans connexion. Ta partie est conservée.</T>
          <Btn
            label="Installer maintenant"
            icon="mobile_phone"
            onPress={async () => {
              if (await promptInstall()) onDone();
            }}
          />
        </Card>
        <AlreadyInstalled />
      </>
    );
  }
  if (env === 'ios-safari' || env === 'ios-other') {
    return (
      <Card title="Sur iPhone / iPad" img="mobile_phone">
        {env === 'ios-other' ? <T style={{ fontSize: 13, color: C.inkSoft }}>Ça marche aussi depuis Chrome (iOS 16.4 ou plus récent) ; sinon ouvre ce lien dans Safari.</T> : null}
        <Step n={1}>
          Touche le bouton Partager <ShareGlyph /> {env === 'ios-safari' ? 'en bas de Safari' : 'en haut à droite'}.
        </Step>
        <Step n={2}>Fais défiler et choisis « Sur l’écran d’accueil ».</Step>
        <Step n={3}>Touche « Ajouter » : l’icône du croissant apparaît, le jeu s’ouvre en plein écran.</Step>
        <Btn label={copied ? 'Lien copié !' : 'Copier le lien du jeu'} small color={C.greyDark} dark="#8A7D6B" onPress={copy} />
      </Card>
    );
  }
  if (env === 'inapp') {
    return (
      <>
        <Card title="Ouvre le jeu dans ton navigateur" img="light_bulb">
          <T style={{ fontSize: 14 }}>Tu es dans le navigateur intégré d’une appli (Messenger, Instagram, Discord…). Il ne permet pas d’installer le jeu et peut effacer ta partie.</T>
          {isAndroid() ? <Btn label="Ouvrir dans Chrome" icon="mobile_phone" onPress={openInChrome} /> : null}
          <Step n={1}>Touche les trois points (⋯ ou ⋮) en haut de l’écran.</Step>
          <Step n={2}>Choisis « Ouvrir dans le navigateur » (ou « Ouvrir dans Safari / Chrome »).</Step>
          <Step n={3}>Là, touche « Installer » dans le bandeau du jeu.</Step>
          <Btn label={copied ? 'Lien copié !' : 'Copier le lien du jeu'} small color={C.greyDark} dark="#8A7D6B" onPress={copy} />
        </Card>
      </>
    );
  }
  if (env === 'android') {
    return (
      <>
        <Card title="Depuis Chrome" img="mobile_phone">
          <Step n={1}>Touche les trois points ⋮ en haut à droite de Chrome.</Step>
          <Step n={2}>Choisis « Installer l’application » ou « Ajouter à l’écran d’accueil ».</Step>
          <Step n={3}>Confirme : le jeu s’ouvre ensuite en plein écran depuis son icône.</Step>
          <T style={{ fontSize: 12, color: C.inkSoft }}>Sur Samsung Internet : menu ☰, puis « Ajouter la page à » → « Écran d’accueil ». Sur Firefox : menu ⋮, puis « Installer ».</T>
        </Card>
        <AlreadyInstalled />
      </>
    );
  }
  return (
    <Card title="Joue sur ton téléphone" img="mobile_phone">
      <T style={{ fontSize: 14 }}>Ouvre cette adresse sur ton téléphone, puis touche « Installer » dans le bandeau du jeu :</T>
      <T style={{ fontFamily: F.semi, fontSize: 15, color: C.redDark }} selectable>
        {siteUrl()}
      </T>
      <Btn label={copied ? 'Lien copié !' : 'Copier le lien'} small color={C.greyDark} dark="#8A7D6B" onPress={copy} />
    </Card>
  );
}

export function InstallSheet({ onClose }: { onClose: () => void }) {
  const env = useInstallEnv();
  return (
    <Sheet title="Installer le jeu" icon="mobile_phone" onClose={onClose}>
      <Body env={env} onDone={onClose} />
      <T style={{ fontSize: 12, color: C.inkSoft, textAlign: 'center', marginTop: 4 }}>Gratuit, sans compte. Ta partie reste sur ton appareil.</T>
    </Sheet>
  );
}
