import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CollectionProvider } from './src/context/CollectionContext';
import { AppNavigator } from './src/navigation/AppNavigator';

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
