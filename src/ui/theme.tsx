// Couleurs, polices et petits composants de base. Tout texte passe par <T> (taille système ignorée).
import { Fredoka_600SemiBold, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { Image, ImageStyle, Platform, Pressable, StyleProp, Text, TextProps, View, ViewStyle } from 'react-native';
import { IMG, ImgName } from './images';

export const FONT_FILES = { Fredoka_600SemiBold, Fredoka_700Bold, Nunito_700Bold, Nunito_800ExtraBold };
export const F = { title: 'Fredoka_700Bold', semi: 'Fredoka_600SemiBold', text: 'Nunito_700Bold', bold: 'Nunito_800ExtraBold' };

export const C = {
  bg: '#FFF8F3', // blanc chaud du stand
  page: '#C9352B', // autour de la colonne, sur grand écran
  ink: '#3B2A25',
  inkSoft: '#8C746B',
  card: '#FFFFFF',
  line: '#F4D6CF', // liseré rosé
  wood: '#D9A066',
  woodDark: '#A9713D',
  red: '#E23D32',
  redDark: '#B52A22',
  redSoft: '#FFE1DC',
  green: '#34B36A',
  greenDark: '#22884D',
  gold: '#FFB81F',
  goldDark: '#D48F00',
  grey: '#D9CCC6',
  greyDark: '#A8958D',
  white: '#FFFFFF',
};

/** Animations pilotées en natif sur mobile ; le web n'a pas de pilote natif. */
export const NATIVE = Platform.OS !== 'web';

export function T({ style, ...p }: TextProps) {
  return <Text allowFontScaling={false} {...p} style={[{ fontFamily: F.text, color: C.ink, fontSize: 14 }, style]} />;
}

export function Icon({ name, size, style }: { name: ImgName; size: number; style?: StyleProp<ImageStyle> }) {
  return <Image source={IMG[name]} style={[{ width: size, height: size }, style]} resizeMode="contain" />;
}

/** 1234 → « 1 234 », 15300 → « 15,3 k », 2 400 000 → « 2,4 M ». */
export function fmt(n: number): string {
  n = Math.floor(n);
  if (n < 10000) return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const units = ['k', 'M', 'Md', 'B', 'T'];
  let u = -1;
  let v = n;
  while (v >= 1000 && u < units.length - 1) {
    v /= 1000;
    u++;
  }
  return `${v >= 100 ? Math.floor(v) : (Math.floor(v * 10) / 10).toString().replace('.', ',')} ${units[u]}`;
}

export function fmtRate(n: number): string {
  return n < 100 ? (Math.round(n * 10) / 10).toString().replace('.', ',') : fmt(n);
}

export function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return m > 0 ? `${h} h ${m} min` : `${h} h`;
  if (m > 0) return `${m} min`;
  return `${Math.floor(sec)} s`;
}

/** Durée en « m:ss » (compte à rebours). */
export function fmtClock(ms: number): string {
  const t = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

/** Bouton « bonbon » : face colorée posée sur une tranche plus sombre, qui s'enfonce au toucher. */
export function Btn({
  label,
  onPress,
  color = C.green,
  dark = C.greenDark,
  disabled,
  icon,
  small,
  style,
}: {
  label: string;
  onPress: () => void;
  color?: string;
  dark?: string;
  disabled?: boolean;
  icon?: ImgName;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const face = disabled ? C.grey : color;
  const edge = disabled ? C.greyDark : dark;
  return (
    <Pressable onPress={onPress} style={[{ borderRadius: 14, backgroundColor: edge, paddingBottom: 4 }, style]}>
      {({ pressed }) => (
        <View
          style={{
            borderRadius: 14,
            backgroundColor: face,
            paddingVertical: small ? 5 : 9,
            paddingHorizontal: small ? 8 : label ? 12 : 4,
            minHeight: small ? 28 : 42,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            transform: [{ translateY: pressed ? 3 : 0 }],
          }}>
          {icon ? <Icon name={icon} size={small ? 16 : label ? 20 : 24} /> : null}
          {label ? (
          <T style={{ fontFamily: F.title, color: C.white, fontSize: small ? 14 : 17 }} numberOfLines={1}>
            {label}
          </T>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}
