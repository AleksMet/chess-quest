import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChapterThemeProvider } from '../contexts/ChapterThemeContext';

export default function RootLayout() {
  return (
    <ChapterThemeProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0a1a0b' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="adventure/index" />
        <Stack.Screen name="battle/index" />
        <Stack.Screen name="artifact-selection" />
        <Stack.Screen name="shop" />
      </Stack>
    </ChapterThemeProvider>
  );
}
