import type { Hero } from '../types';
import { isPromotion } from '../utils/chessHelpers';
import { detectFork } from '../utils/chessHelpers';

export const HEROES: Hero[] = [
  {
    id: 'timmy_pawn',
    name: 'Пешка Тимми',
    description: 'Мастер пешечных продвижений',
    figure: 'p',
    unlocked: true,
    auraDescription: '+25% наград за превращения',
    applyAura: (reward, context) => {
      if (reward.gold === 0 || !isPromotion(context.move)) return reward;
      const bonus = Math.round(reward.gold * 0.25);
      return {
        ...reward,
        gold: reward.gold + bonus,
        log: [...reward.log, `Аура Тимми: +${bonus}`],
      };
    },
  },
  {
    id: 'finn_knight',
    name: 'Рыцарь Финн',
    description: 'Мастер тактических ударов',
    figure: 'n',
    unlocked: true,
    auraDescription: '+30% наград за вилки',
    applyAura: (reward, context) => {
      if (reward.gold === 0 || context.move.piece !== 'n') return reward;
      if (!detectFork(context.chess, context.move).isFork) return reward;
      const bonus = Math.round(reward.gold * 0.30);
      return {
        ...reward,
        gold: reward.gold + bonus,
        log: [...reward.log, `Аура Финна: +${bonus}`],
      };
    },
  },
];
