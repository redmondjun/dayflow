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

void SplashScreen.preventAutoHideAsync();

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

    initialize().finally(async () => {
      if (!mounted) return;
      await SplashScreen.hideAsync();
    });

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
