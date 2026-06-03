import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0f172a' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="adventure/index" />
        <Stack.Screen name="battle/index" />
        <Stack.Screen name="artifact-selection" />
        <Stack.Screen name="shop" />
      </Stack>
    </>
  );
}
