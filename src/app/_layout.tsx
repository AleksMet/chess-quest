import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChapterThemeProvider } from '../contexts/ChapterThemeContext';
import { AccessibilityProvider } from '../contexts/AccessibilityContext';

export default function RootLayout() {
  return (
    <AccessibilityProvider>
      <ChapterThemeProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#0d0b14' },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="adventure/index" />
          <Stack.Screen name="battle/index" />
          <Stack.Screen name="quick-battle/index" />
          <Stack.Screen name="puzzle/index" />
          <Stack.Screen name="ambush/index" />
          <Stack.Screen name="artifact-selection" />
          <Stack.Screen name="shop" />
          <Stack.Screen name="run-complete" />
        </Stack>
      </ChapterThemeProvider>
    </AccessibilityProvider>
  );
}
