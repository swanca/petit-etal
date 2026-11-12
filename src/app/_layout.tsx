import { useFonts } from 'expo-font';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { C, FONT_FILES } from '../ui/theme';

export default function RootLayout() {
  const [loaded, error] = useFonts(FONT_FILES);
  // Sans les polices (erreur de chargement), on continue avec celles du système.
  if (!loaded && !error) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Slot />
    </SafeAreaProvider>
  );
}
