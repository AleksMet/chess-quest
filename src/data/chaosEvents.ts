import type { ChaosEventDef } from '../types/chaos';

export const CHAOS_EVENTS: ChaosEventDef[] = [
  // ────────────── ПОЛОЖИТЕЛЬНЫЕ ──────────────
  {
    id: 'old_blacksmith',
    category: 'positive',
    icon: '🔨',
    name: 'Старый кузнец',
    description: 'Опытный кузнец предлагает улучшить одну твою фигуру бесплатно.',
  },
  {
    id: 'deserter',
    category: 'positive',
    icon: '🏃',
    name: 'Дезертир',
    description: 'Воин противника устал воевать и переходит на твою сторону.',
  },
  {
    id: 'war_loot',
    category: 'positive',
    icon: '💰',
    name: 'Военная добыча',
    description: 'Твои разведчики нашли золото на поле прошлого сражения.',
  },
  {
    id: 'secret_arsenal',
    category: 'positive',
    icon: '📦',
    name: 'Тайный арсенал',
    description: 'Спрятанный склад с редким оружием. Выбери одно улучшение.',
  },

  // ────────────── НЕЙТРАЛЬНЫЕ ──────────────
  {
    id: 'relic_trader',
    category: 'neutral',
    icon: '🧙',
    name: 'Торговец реликвиями',
    description: 'Странный торговец предлагает обмен.\nЛадья за двух коней с атакующими улучшениями.',
    optionAccept: 'Принять',
    optionDecline: 'Отказать',
  },
  {
    id: 'alchemist',
    category: 'neutral',
    icon: '⚗️',
    name: 'Алхимик',
    description: 'Алхимик может усилить твою армию. Но магия непредсказуема.\nСними одно улучшение — получи два случайных.',
    optionAccept: 'Принять',
    optionDecline: 'Отказать',
  },
  {
    id: 'fortune_teller',
    category: 'neutral',
    icon: '🔮',
    name: 'Гадалка',
    description: 'За 60 золота я покажу тебе армию следующего врага.',
    optionAccept: 'Заплатить (−60 💰)',
    optionDecline: 'Отказать',
  },
  {
    id: 'recruiter',
    category: 'neutral',
    icon: '🪖',
    name: 'Вербовщик',
    description: 'Отдай двух пешек — получи опытного воина.',
    optionAccept: 'Принять',
    optionDecline: 'Отказать',
  },

  // ────────────── ОТРИЦАТЕЛЬНЫЕ ──────────────
  {
    id: 'enemy_ambush',
    category: 'negative',
    icon: '💀',
    name: 'Засада врагов',
    description: 'Враги атаковали лагерь пока ты отдыхал.',
  },
  {
    id: 'traitor',
    category: 'negative',
    icon: '🗡️',
    name: 'Предатель',
    description: 'Один из твоих воинов оказался шпионом противника.',
  },
  {
    id: 'treasury_fire',
    category: 'negative',
    icon: '🔥',
    name: 'Пожар в казне',
    description: 'Пожар уничтожил часть твоего золота.',
  },
  {
    id: 'curse',
    category: 'negative',
    icon: '🟣',
    name: 'Проклятие',
    description: 'Колдун наложил проклятие на твою сильнейшую фигуру.\nОна не сможет брать сильные фигуры в следующем бою.',
  },
];
