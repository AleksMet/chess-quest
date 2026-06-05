import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MetaProgress, HeroId, ChapterProgress } from '../types';

const STORAGE_KEY = '@chess_quest_meta';
const CHAPTER_COUNT = 2;

function buildInitialChapters(): ChapterProgress[] {
  return Array.from({ length: CHAPTER_COUNT }, (_, i) => ({
    chapterIndex: i,
    unlocked: i === 0,
    wins: 0,
    losses: 0,
    bestGold: 0,
    bestScore: 0,
  }));
}

const INITIAL_META: MetaProgress = {
  unlockedHeroes: ['timmy_pawn' as HeroId],
  unlockedArtifactIds: [],
  chapters: buildInitialChapters(),
  crystals: 0,
  masteryStars: 0,
  totalRuns: 0,
  achievements: [],
  onboardingCompleted: false,
};

interface MetaStore {
  meta: MetaProgress;
  isLoaded: boolean;
  loadMeta: () => Promise<void>;
  saveMeta: () => Promise<void>;
  recordRunResult: (chapterIndex: number, won: boolean, goldEarned: number) => Promise<void>;
  recordBestScore: (chapterIndex: number, score: number) => Promise<void>;
  completeOnboarding: () => void;
  resetMeta: () => void;
}

export const useMetaStore = create<MetaStore>((set, get) => ({
  meta: { ...INITIAL_META, chapters: buildInitialChapters() },
  isLoaded: false,

  loadMeta: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as MetaProgress;
        set({ meta: parsed, isLoaded: true });
      } else {
        set({ isLoaded: true });
      }
    } catch {
      set({ isLoaded: true });
    }
  },

  saveMeta: async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(get().meta));
    } catch {
      // Persistence failure is non-fatal
    }
  },

  recordRunResult: async (chapterIndex: number, won: boolean, goldEarned: number) => {
    set(state => {
      const chapters = state.meta.chapters.map(ch => {
        if (ch.chapterIndex !== chapterIndex) return ch;
        return {
          ...ch,
          wins: ch.wins + (won ? 1 : 0),
          losses: ch.losses + (won ? 0 : 1),
          bestGold: Math.max(ch.bestGold, goldEarned),
        };
      });

      // Unlock next chapter on win
      if (won) {
        const nextIndex = chapterIndex + 1;
        if (nextIndex < chapters.length) {
          chapters[nextIndex] = { ...chapters[nextIndex], unlocked: true };
        }
      }

      const crystalsEarned = won ? Math.max(1, Math.floor(goldEarned / 100)) : 0;

      return {
        meta: {
          ...state.meta,
          chapters,
          totalRuns: state.meta.totalRuns + 1,
          crystals: state.meta.crystals + crystalsEarned,
        },
      };
    });

    await get().saveMeta();
  },

  recordBestScore: async (chapterIndex: number, score: number) => {
    set(state => {
      const chapters = state.meta.chapters.map(ch => {
        if (ch.chapterIndex !== chapterIndex) return ch;
        return { ...ch, bestScore: Math.max(ch.bestScore ?? 0, score) };
      });
      return { meta: { ...state.meta, chapters } };
    });
    await get().saveMeta();
  },

  completeOnboarding: () => {
    set(state => ({
      meta: { ...state.meta, onboardingCompleted: true },
    }));
    void get().saveMeta();
  },

  resetMeta: () => {
    set({ meta: { ...INITIAL_META, chapters: buildInitialChapters() }, isLoaded: false });
  },
}));
