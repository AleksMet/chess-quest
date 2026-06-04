import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { CHAPTER_THEMES, FOREST_THEME } from '../data/chapters';
import type { ChapterTheme } from '../data/chapters';

interface ChapterThemeContextValue {
  theme: ChapterTheme;
  chapterIndex: number;
  setChapterIndex: (index: number) => void;
}

const ChapterThemeContext = createContext<ChapterThemeContextValue>({
  theme: FOREST_THEME,
  chapterIndex: 0,
  setChapterIndex: () => {},
});

export function ChapterThemeProvider({ children }: { children: ReactNode }) {
  const [chapterIndex, setChapterIndex] = useState(0);
  const theme = CHAPTER_THEMES[chapterIndex] ?? FOREST_THEME;

  return (
    <ChapterThemeContext.Provider value={{ theme, chapterIndex, setChapterIndex }}>
      {children}
    </ChapterThemeContext.Provider>
  );
}

export function useChapterTheme(): ChapterThemeContextValue {
  return useContext(ChapterThemeContext);
}
