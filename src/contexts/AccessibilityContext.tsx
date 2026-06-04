import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type FontScale = 'small' | 'medium' | 'large';

const FONT_SCALES: Record<FontScale, number> = {
  small:  0.85,
  medium: 1.0,
  large:  1.2,
};

const STORAGE_KEY = '@chess_quest_font_scale';

interface AccessibilityContextValue {
  fontScale: FontScale;
  scale: number;
  setFontScale: (s: FontScale) => void;
  /** Scale a base font size according to current setting */
  fs: (base: number) => number;
}

const AccessibilityContext = createContext<AccessibilityContextValue>({
  fontScale: 'medium',
  scale: 1.0,
  setFontScale: () => {},
  fs: (base: number) => base,
});

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [fontScale, setFontScaleState] = useState<FontScale>('medium');

  const setFontScale = useCallback(async (s: FontScale) => {
    setFontScaleState(s);
    await AsyncStorage.setItem(STORAGE_KEY, s).catch(() => {});
  }, []);

  const scale = FONT_SCALES[fontScale];
  const fs = useCallback((base: number) => Math.round(base * scale), [scale]);

  return (
    <AccessibilityContext.Provider value={{ fontScale, scale, setFontScale, fs }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility(): AccessibilityContextValue {
  return useContext(AccessibilityContext);
}
