import { useEffect } from 'react';
import './global.css';
import { NavigationContainer } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { MD3LightTheme, PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useTaskStore } from './src/store/taskStore';
import { colors } from './src/theme/colors';

void SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash may already be hidden or unavailable in this environment.
});

const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.ink,
    secondary: colors.accent,
    background: colors.paper,
    surface: colors.paper,
    error: colors.danger,
  },
};

export default function App() {
  const initialize = useTaskStore((state) => state.initialize);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      try {
        await initialize();
      } catch {
        // initialize() already records store error state.
      } finally {
        if (!mounted) return;
        try {
          await SplashScreen.hideAsync();
        } catch {
          // Non-fatal: continue even if splash hide fails.
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [initialize]);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={paperTheme}>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </PaperProvider>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
