import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Import after mock so Zustand picks up mocked AsyncStorage
import { useMetaStore } from '../../src/store/metaStore';

const getAsyncGet = () => AsyncStorage.getItem as jest.Mock;
const getAsyncSet = () => AsyncStorage.setItem as jest.Mock;

describe('metaStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useMetaStore.getState().resetMeta();
  });

  describe('initial state', () => {
    it('chapter 0 is unlocked by default', () => {
      const { meta } = useMetaStore.getState();
      expect(meta.chapters[0].unlocked).toBe(true);
    });

    it('chapter 1 is locked by default', () => {
      const { meta } = useMetaStore.getState();
      expect(meta.chapters[1].unlocked).toBe(false);
    });

    it('onboarding not completed by default', () => {
      const { meta } = useMetaStore.getState();
      expect(meta.onboardingCompleted).toBe(false);
    });

    it('totalRuns is 0 by default', () => {
      const { meta } = useMetaStore.getState();
      expect(meta.totalRuns).toBe(0);
    });
  });

  describe('recordRunResult', () => {
    it('records a win and increments totalRuns', () => {
      useMetaStore.getState().recordRunResult(0, true, 200);
      const { meta } = useMetaStore.getState();
      expect(meta.chapters[0].wins).toBe(1);
      expect(meta.totalRuns).toBe(1);
    });

    it('records a loss and increments totalRuns', () => {
      useMetaStore.getState().recordRunResult(0, false, 50);
      const { meta } = useMetaStore.getState();
      expect(meta.chapters[0].losses).toBe(1);
      expect(meta.totalRuns).toBe(1);
    });

    it('unlocks chapter 1 after winning chapter 0', () => {
      useMetaStore.getState().recordRunResult(0, true, 200);
      const { meta } = useMetaStore.getState();
      expect(meta.chapters[1].unlocked).toBe(true);
    });

    it('does not unlock chapter 1 on a loss', () => {
      useMetaStore.getState().recordRunResult(0, false, 50);
      const { meta } = useMetaStore.getState();
      expect(meta.chapters[1].unlocked).toBe(false);
    });

    it('tracks best gold per chapter', () => {
      useMetaStore.getState().recordRunResult(0, true, 300);
      useMetaStore.getState().recordRunResult(0, true, 150);
      const { meta } = useMetaStore.getState();
      expect(meta.chapters[0].bestGold).toBe(300);
    });

    it('updates best gold only when new gold is higher', () => {
      useMetaStore.getState().recordRunResult(0, true, 100);
      useMetaStore.getState().recordRunResult(0, true, 400);
      const { meta } = useMetaStore.getState();
      expect(meta.chapters[0].bestGold).toBe(400);
    });
  });

  describe('onboarding', () => {
    it('completeOnboarding sets flag to true', () => {
      useMetaStore.getState().completeOnboarding();
      expect(useMetaStore.getState().meta.onboardingCompleted).toBe(true);
    });

    it('onboarding should show when not completed', () => {
      expect(useMetaStore.getState().meta.onboardingCompleted).toBe(false);
    });

    it('onboarding should not show after completeOnboarding', () => {
      useMetaStore.getState().completeOnboarding();
      expect(useMetaStore.getState().meta.onboardingCompleted).toBe(true);
    });
  });

  describe('AsyncStorage persistence', () => {
    it('saves meta to AsyncStorage on recordRunResult', async () => {
      getAsyncSet().mockResolvedValue(undefined);
      await useMetaStore.getState().recordRunResult(0, true, 200);
      expect(getAsyncSet()).toHaveBeenCalledWith(
        '@chess_quest_meta',
        expect.stringContaining('"wins":1'),
      );
    });

    it('loads progress from AsyncStorage', async () => {
      const savedMeta = JSON.stringify({
        unlockedHeroes: ['timmy_pawn'],
        unlockedArtifactIds: [],
        chapters: [
          { chapterIndex: 0, unlocked: true, wins: 3, losses: 2, bestGold: 350 },
          { chapterIndex: 1, unlocked: true, wins: 0, losses: 0, bestGold: 0 },
        ],
        crystals: 0,
        masteryStars: 0,
        totalRuns: 5,
        achievements: [],
        onboardingCompleted: false,
      });
      getAsyncGet().mockResolvedValueOnce(savedMeta);
      await useMetaStore.getState().loadMeta();
      const { meta } = useMetaStore.getState();
      expect(meta.totalRuns).toBe(5);
      expect(meta.chapters[0].wins).toBe(3);
    });

    it('returns default state when AsyncStorage is empty', async () => {
      getAsyncGet().mockResolvedValueOnce(null);
      await useMetaStore.getState().loadMeta();
      const { meta } = useMetaStore.getState();
      expect(meta.totalRuns).toBe(0);
    });
  });
});
