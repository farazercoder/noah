import React from 'react';
import { LogBox } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CollectionProvider } from './src/context/CollectionContext';
import { AppNavigator } from './src/navigation/AppNavigator';

// Suppress expo-file-system deprecation warnings (triggered internally by expo-camera/expo-image-picker)
LogBox.ignoreLogs([
  'Method readAsStringAsync imported from "expo-file-system" is deprecated',
  'expo-file-system',
]);

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <CollectionProvider>
          <StatusBar style="light" />
          <AppNavigator />
        </CollectionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
