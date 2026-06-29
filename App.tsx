import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { I18nextProvider } from 'react-i18next';
import i18next from './src/i18n/i18n';
import Navigation from './src/navigation/Navigation';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await Font.loadAsync({
          'poppins-bold': require('./assets/fonts/Poppins-Bold.ttf'),
          'poppins-regular': require('./assets/fonts/Poppins-Regular.ttf'),
          'poppins-semibold': require('./assets/fonts/Poppins-SemiBold.ttf'),
        });

        await i18next.init();
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    if (appIsReady) {
      SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <I18nextProvider i18n={i18next}>
      <View style={styles.container}>
        <Navigation />
      </View>
    </I18nextProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },
});
