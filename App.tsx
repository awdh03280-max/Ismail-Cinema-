import React from 'react';
import { View, StyleSheet } from 'react-native';
import { I18nextProvider } from 'react-i18next';
import i18next from './src/i18n/i18n';
import Navigation from './src/navigation/Navigation';
import { FamilyModeProvider } from './src/context/FamilyModeContext';
import { AuthProvider } from './src/context/AuthContext';
import { XPProvider } from './src/context/XPContext';
import { FollowProvider } from './src/context/FollowContext';
import { DownloadProvider } from './src/context/DownloadContext';
import AchievementUnlockToast from './src/components/AchievementUnlockToast';

export default function App() {
  return (
    <AuthProvider>
      <XPProvider>
        <FollowProvider>
        <FamilyModeProvider>
        <DownloadProvider>
          <I18nextProvider i18n={i18next}>
            <View style={styles.container}>
              <Navigation />
              <AchievementUnlockToast />
            </View>
          </I18nextProvider>
        </DownloadProvider>
        </FamilyModeProvider>
        </FollowProvider>
      </XPProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
});
