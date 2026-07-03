import React from 'react';
import { View, StyleSheet } from 'react-native';
import { I18nextProvider } from 'react-i18next';
import i18next from './src/i18n/i18n';
import Navigation from './src/navigation/Navigation';

export default function App() {
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
