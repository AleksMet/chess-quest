import type { Boss } from '../types';

export const BOSSES: Boss[] = [
  {
    id: 'goblin_king',
    name: 'Гоблинский Король',
    chapterIndex: 0,
    elo: 750,
    dialogBefore:
      'Хехе! Ещё один маленький человечек хочет сыграть против меня? Мои войска бесчисленны, а я — непобедим на доске! Попробуй-ка справиться с моими гоблинами!',
    dialogAfter:
      'Не-е-ет! Как ты смог?! Мои гоблины... разгромлены... Хорошо, я признаю твою силу. Но это ещё не конец, человек!',
    weakness: 'Слабо защищает фланги — используй вилки конём!',
    rewardGold: 200,
    rewardArtifactId: 'goblin_crown',
  },
];

export function getBossForChapter(chapterIndex: number): Boss | null {
  return BOSSES.find(b => b.chapterIndex === chapterIndex) ?? null;
}
