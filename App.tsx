import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import GameDom from './src/GameDom';
import { DEFAULT_PROGRESS, type Progress } from './src/lessons';

const KEY = '@pythago/progress/v1';

export default function App() {
  async function loadProgress(): Promise<Progress | null> {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      return raw ? { ...DEFAULT_PROGRESS, ...JSON.parse(raw) } : DEFAULT_PROGRESS;
    } catch {
      return DEFAULT_PROGRESS;
    }
  }

  async function saveProgress(progress: Progress) {
    await AsyncStorage.setItem(KEY, JSON.stringify(progress));
  }

  return (
    <View style={styles.root}>
      <StatusBar hidden style="light" />
      <GameDom
        loadProgress={loadProgress}
        saveProgress={saveProgress}
        dom={{
          scrollEnabled: false,
          bounces: false,
          style: styles.dom,
          contentInsetAdjustmentBehavior: 'never',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#030a14' },
  dom: { flex: 1, backgroundColor: '#030a14' },
});
