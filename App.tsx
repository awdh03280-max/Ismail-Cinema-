import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { I18nextProvider } from 'react-i18next';
import i18next from './src/i18n/i18n';
import { getLanguage } from './src/storage/storage';
import Navigation from './src/navigation/Navigation';
import { FamilyModeProvider } from './src/context/FamilyModeContext';
import { AuthProvider } from './src/context/AuthContext';
import { XPProvider } from './src/context/XPContext';
import { FollowProvider } from './src/context/FollowContext';
import { DownloadProvider } from './src/context/DownloadContext';
import AchievementUnlockToast from './src/components/AchievementUnlockToast';

export default function App() {
  const [langReady, setLangReady] = useState(false);

  useEffect(() => {
    // Load saved language from AsyncStorage on startup.
    // Default (storage.ts) is 'ar', so new users always get Arabic.
    getLanguage()
      .then((lang) => i18next.changeLanguage(lang))
      .catch(() => {})
      .finally(() => setLangReady(true));
  }, []);

  // Render nothing until language is resolved — avoids a flash of wrong language.
  if (!langReady) return <View style={styles.container} />;

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
