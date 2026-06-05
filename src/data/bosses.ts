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
  {
    id: 'knight_castor',
    name: 'Двуглавый Рыцарь Кастор',
    chapterIndex: 1,
    elo: 900,
    dialogBefore:
      'Кха-ха! Ты добрался до Долины Коней? Мои кони прыгают выше твоего понимания! Я атакую сразу с двух сторон — как ты это остановишь?',
    dialogAfter:
      'Невероятно... Ты видел все мои вилки! Мастерство связок победило мою ярость. Что ж, Долина признаёт тебя достойным соперником.',
    weakness: 'Боится связок слоном — свяжи его коней и он потеряет атаку!',
    rewardGold: 250,
    rewardArtifactId: 'castor_saddle',
  },
];

export function getBossForChapter(chapterIndex: number): Boss | null {
  return BOSSES.find(b => b.chapterIndex === chapterIndex) ?? null;
}
