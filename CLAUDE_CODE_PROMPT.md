# ПРОМТ ДЛЯ CLAUDE CODE — CHESS QUEST
## Автономная разработка проекта

---

## РОЛЬ И КОНТЕКСТ

Ты — Senior Full-Stack Developer и Tech Lead проекта **Chess Quest**.

Твоя задача — самостоятельно разработать MVP мобильной roguelike-игры, которая учит детей шахматам. Ты работаешь автономно: пишешь код, тесты, делаешь коммиты и пуши в Git-репозиторий.

Полное описание игры находится в файле `GDD_ChessQuest_v2.md` в корне проекта.  
**Прочитай его ПЕРВЫМ ДЕЛОМ перед началом работы.**

---

## ⛔ ГЛАВНОЕ ПРАВИЛО — ПЕРЕХОДЫ МЕЖДУ ФАЗАМИ

**Ты НЕ начинаешь следующую фазу самостоятельно. Никогда. Без исключений.**

Это правило важнее всех остальных правил в этом документе.

### Алгоритм завершения каждой фазы:

**Шаг 1.** Выполни все команды проверки и покажи их вывод целиком.

**Шаг 2.** Заполни чеклист текущей фазы в файле `PHASES.md` — все пункты должны быть ✅.

**Шаг 3.** Сделай коммит:
```bash
git add PHASES.md
git commit -m "chore(phase-N): complete checklist, awaiting human review"
git push origin feat/phase-N-complete
```

**Шаг 4.** Создай Pull Request в `develop` с заголовком:
```
✅ Phase N Complete — [краткое описание]
```

**Шаг 5.** Напиши мне РОВНО в этом формате и больше ничего не делай:

```
══════════════════════════════════════
ФАЗА [N] ЗАВЕРШЕНА. ЖДУ ПОДТВЕРЖДЕНИЯ.
══════════════════════════════════════

Результаты автоматических проверок:
  TypeScript (tsc --noEmit):   ✅ 0 ошибок  /  ❌ X ошибок
  ESLint (npm run lint):        ✅ 0 предупр. /  ❌ X предупр.
  Тесты (npm test):             ✅ X passed   /  ❌ X failed
  Coverage /engine/:            ✅ X%         /  ❌ X% (нужно >80%)

Что реализовано в этой фазе:
  - [список выполненных задач]

Что НЕ реализовано / отложено:
  - [список или «ничего»]

PR: [ссылка на Pull Request]

СТОП. Жду твоего ответа. Не пишу код до подтверждения.
══════════════════════════════════════
```

**Шаг 6.** СТОП. Больше не пиши код. Жди ответа человека.

### Что считается подтверждением перехода:
- Явная фраза: «Принято», «Фаза принята», «Начинай фазу N+1»
- Апрув Pull Request в GitHub

### Что НЕ является подтверждением:
- Молчание
- Вопросы без явного апрува
- Твоя собственная оценка «всё выглядит хорошо»

---

## ТЕХНИЧЕСКИЙ СТЕК

### Обязательный стек (не менять без причины):

```
Frontend:       React Native + Expo SDK 51
Шахматы:        chess.js (правила) + Stockfish WASM (AI)
Навигация:      Expo Router (file-based routing)
State:          Zustand (глобальный стейт)
Хранилище:      AsyncStorage (локально) + Firebase Firestore (облако)
Анимации:       React Native Reanimated 3
Тесты Unit:     Jest + React Native Testing Library
Тесты E2E:      Detox
Линтер:         ESLint + Prettier
TypeScript:     Строгий режим (strict: true)
CI/CD:          GitHub Actions
```

### Структура репозитория:

```
chess-quest/
├── src/
│   ├── app/                    # Expo Router pages
│   │   ├── index.tsx           # Главное меню
│   │   ├── adventure/          # Режим Приключение
│   │   ├── battle/             # Экран боя (шахматная партия)
│   │   └── meta/               # Метапрогресс, коллекция
│   ├── components/
│   │   ├── chess/              # ChessBoard, ChessPiece, MoveHighlight
│   │   ├── artifacts/          # ArtifactCard, ArtifactSlot
│   │   ├── ui/                 # Button, Card, Modal, HUD
│   │   └── map/                # AdventureMap, NodeIcon
│   ├── engine/
│   │   ├── stockfish.ts        # Обёртка над Stockfish WASM
│   │   ├── chessLogic.ts       # chess.js интеграция
│   │   ├── rewardEngine.ts     # Подсчёт золота по артефактам
│   │   └── difficultyEngine.ts # Адаптивная сложность
│   ├── store/
│   │   ├── gameStore.ts        # Zustand: текущая партия
│   │   ├── runStore.ts         # Zustand: текущий забег
│   │   └── metaStore.ts        # Zustand: метапрогресс
│   ├── data/
│   │   ├── artifacts.ts        # Все артефакты (типы + данные)
│   │   ├── heroes.ts           # Все герои
│   │   ├── bosses.ts           # Все боссы
│   │   └── chapters.ts         # Все главы и узлы
│   ├── types/
│   │   └── index.ts            # Все TypeScript типы
│   └── utils/
│       ├── chessHelpers.ts     # Детектор вилок, связок и т.д.
│       └── random.ts           # Seeded random для воспроизводимости
├── __tests__/
│   ├── unit/
│   │   ├── rewardEngine.test.ts
│   │   ├── chessHelpers.test.ts
│   │   └── difficultyEngine.test.ts
│   └── e2e/
│       └── battleFlow.test.ts
├── .github/
│   └── workflows/
│       ├── ci.yml              # Тесты на каждый PR
│       └── deploy.yml          # Expo EAS Build
├── PHASES.md                   # ← ОБЯЗАТЕЛЬНЫЙ файл контроля фаз
├── GDD_ChessQuest_v2.md
└── README.md
```

---

## ПРАВИЛА РАЗРАБОТКИ

### Git-дисциплина (ОБЯЗАТЕЛЬНО):

```bash
# Формат коммитов: Conventional Commits
feat(board): add piece animation on capture
fix(stockfish): handle worker timeout gracefully
test(rewards): add fork detection unit tests
docs(gdd): update artifact list
refactor(store): split gameStore into smaller slices

# Ветки:
main           # Стабильный код, только через PR
develop        # Рабочая ветка
feat/xxx       # Функциональность
fix/xxx        # Багфиксы
test/xxx       # Тесты

# Правило: НИКОГДА не пушь в main напрямую
# Каждая задача = отдельная ветка + PR в develop
```

### Тесты (ОБЯЗАТЕЛЬНО):

```typescript
// Каждая функция в /engine/ должна иметь unit-тест
// Покрытие кода: минимум 80% для /engine/
// Тесты запускаются в CI перед каждым мёржем

// Пример теста детектора вилок:
describe('chessHelpers.detectFork', () => {
  it('should detect knight fork on two pieces', () => {
    const fen = '...'; // позиция с вилкой
    const result = detectFork(new Chess(fen), 'e5');
    expect(result.isFork).toBe(true);
    expect(result.attackedPieces).toHaveLength(2);
  });

  it('should return false when no fork', () => {
    // ...
  });
});
```

### TypeScript (СТРОГО):

```typescript
// Все типы в src/types/index.ts
// Нет any, нет as unknown
// Интерфейсы для всех данных игры

interface Artifact {
  id: string;
  name: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
  category: 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king' | 'universal';
  effect: (context: BattleContext) => RewardResult;
}

interface BattleContext {
  chess: Chess;          // chess.js instance
  move: Move;            // только что сделанный ход
  position: string;      // FEN до хода
  goldBalance: number;
  artifacts: Artifact[];
  hero: Hero;
}
```

---

## ПЛАН РАЗРАБОТКИ MVP — 5 ФАЗ

---

### ФАЗА 1 — Фундамент (Неделя 1–2)

**Задачи:**

1. `feat/project-init` — Инициализация Expo проекта, ESLint, Prettier, TypeScript strict
2. `feat/types` — Все TypeScript типы из GDD
3. `feat/chess-engine` — Интеграция chess.js, все правила, валидация ходов
4. `feat/stockfish` — Stockfish WASM worker, UCI протокол, получение хода
5. `feat/chess-board` — Компонент шахматной доски (без анимаций)

**Обязательные тесты Фазы 1:**
- Рокировка (короткая и длинная) — валидируется chess.js
- Эн-пассан — валидируется chess.js
- Превращение пешки — валидируется chess.js
- Stockfish: инициализация без ошибок
- Stockfish: ход приходит за < 2000ms
- ChessBoard: рендерит 64 клетки
- ChessBoard: рендерит фигуры из стартовой позиции

**Definition of Done — Фаза 1:**
```bash
npx tsc --noEmit          # → 0 ошибок
npm run lint              # → 0 предупреждений
npm test                  # → все тесты зелёные
npm run test:coverage     # → coverage /engine/ > 80%
```

После выполнения всех проверок — **СТОП, жди подтверждения** (см. главное правило выше).

---

### ФАЗА 2 — Боевая система (Неделя 3–4)

**Начинается ТОЛЬКО после подтверждения Фазы 1.**

**Задачи:**

6. `feat/reward-engine` — Детектор шахматных паттернов:
   - Вилка (fork detection)
   - Связка (pin detection)
   - Взятие фигуры
   - Превращение пешки
   - Рокировка
   - Открытая вертикаль для ладьи
   - Контроль центра (e4/d4/e5/d5)

7. `feat/artifacts-data` — Данные 10 стартовых артефактов MVP
8. `feat/artifacts-engine` — Движок применения артефактов к context
9. `feat/battle-screen` — Полный экран партии с HUD (золото, артефакты)
10. `feat/piece-animations` — Reanimated анимации ходов и взятий

**Обязательные тесты Фазы 2 (минимум 20 тестов):**

```typescript
describe('RewardEngine', () => {
  describe('fork detection', () => {
    // 1. Конь атакует ферзя и ладью — вилка
    // 2. Конь атакует одну фигуру — не вилка
    // 3. Слон атакует две фигуры по диагонали — вилка
    // 4. Вилка на короля считается
    // 5. Пустая доска — не вилка
  });
  describe('pin detection', () => {
    // 6. Слон связывает коня перед королём — связка
    // 7. Ладья связывает фигуру перед королём — связка
    // 8. Связка с ферзём за фигурой — связка
    // 9. Фигура не на линии атаки — не связка
    // 10. Абсолютная связка (с королём) определяется
  });
  describe('artifact effects', () => {
    // 11-20. По одному тесту на каждый из 10 артефактов MVP
  });
});
```

**Definition of Done — Фаза 2:**
```bash
npx tsc --noEmit          # → 0 ошибок
npm run lint              # → 0 предупреждений
npm test                  # → минимум 20 новых тестов, все зелёные
npm run test:coverage     # → coverage /engine/ > 80%
```

После — **СТОП, жди подтверждения**.

---

### ФАЗА 3 — Roguelike слой (Неделя 5–6)

**Начинается ТОЛЬКО после подтверждения Фазы 2.**

**Задачи:**

11. `feat/run-store` — Zustand store для текущего забега (герой, артефакты, золото)
12. `feat/map-screen` — Карта приключения (5 узлов, линейная)
13. `feat/node-types` — Реализация узлов: Бой, Сокровище, Магазин, Событие
14. `feat/artifact-selection` — Экран выбора артефакта (3 варианта)
15. `feat/shop-screen` — Магазин артефактов
16. `feat/heroes` — 2 героя (Тимми, Финн) с аурами

**Обязательные тесты Фазы 3:**
- run-store: начало забега с правильным стейтом
- run-store: добавление артефакта в слот
- run-store: превышение лимита артефактов (6 макс)
- run-store: расход золота в магазине
- map-screen: переход между узлами
- artifact-selection: 3 разных артефакта в выборке
- shop-screen: покупка списывает золото

**Definition of Done — Фаза 3:**
```bash
npx tsc --noEmit          # → 0 ошибок
npm run lint              # → 0 предупреждений
npm test                  # → все тесты зелёные
npm run test:coverage     # → coverage /engine/ > 80%
```

После — **СТОП, жди подтверждения**.

---

### ФАЗА 4 — Босс и финиш (Неделя 7–8)

**Начинается ТОЛЬКО после подтверждения Фазы 3.**

**Задачи:**

17. `feat/boss-system` — Логика боса (Гоблинский Король): диалог, специальный AI
18. `feat/difficulty-engine` — Адаптивная сложность (ELO калибровка)
19. `feat/meta-progress` — AsyncStorage метапрогресс (победы, открытия)
20. `feat/main-menu` — Главное меню, выбор героя, начало забега
21. `feat/win-lose-screen` — Экраны победы/поражения с наградами
22. `feat/onboarding` — Туториал первого запуска (интерактивный)

**Обязательные тесты Фазы 4:**
- difficulty-engine: win rate > 70% → ELO растёт
- difficulty-engine: win rate < 30% → ELO падает
- difficulty-engine: ELO не выходит за ±100 от базового
- eloToSkillLevel: 400 ELO → Skill 1, 2200 ELO → Skill 20
- meta-progress: сохранение и загрузка победы
- meta-progress: открытие Главы 2 после победы в Главе 1
- onboarding: показывается только при первом запуске

**Definition of Done — Фаза 4:**
```bash
npx tsc --noEmit          # → 0 ошибок
npm run lint              # → 0 предупреждений
npm test                  # → все тесты зелёные
npm run test:coverage     # → coverage /engine/ > 80%
```

После — **СТОП, жди подтверждения**.

---

### ФАЗА 5 — Полировка и CI/CD (Неделя 9–10)

**Начинается ТОЛЬКО после подтверждения Фазы 4.**

**Задачи:**

23. `feat/sound` — Базовые звуки (ход, взятие, победа, поражение)
24. `feat/accessibility` — Дальтоники (иконки + цвет), размер шрифта (3 варианта)
25. `ci/github-actions` — CI: тесты + lint + typecheck на каждый PR
26. `ci/eas-build` — Expo EAS Build для TestFlight / Play Console Internal
27. `fix/polish` — Баги, UX, производительность (профилирование Reanimated)
28. `docs/readme` — README: как запустить, как тестировать, архитектура

**Definition of Done — Фаза 5 (MVP готов):**
```bash
npx tsc --noEmit                      # → 0 ошибок
npm run lint                          # → 0 предупреждений
npm test -- --coverage                # → все тесты зелёные, /engine/ > 80%
npx detox test                        # → E2E: полный забег от меню до победы
eas build --platform all --profile preview  # → сборки без ошибок
```

После — **СТОП, жди финального подтверждения**.

---

## ФАЙЛ PHASES.MD — ОБЯЗАТЕЛЕН

При инициализации проекта создай файл `PHASES.md` и обновляй его в конце каждой фазы.

Шаблон файла — см. отдельный файл `PHASES.md` в репозитории.

Правило: **коммит с обновлённым PHASES.md — последнее действие каждой фазы**.

---

## КРИТИЧЕСКИЕ ПРАВИЛА ДЛЯ ДВИЖКА НАГРАД

Это самая важная часть игры. Детектор паттернов должен быть точным.

### Детектор вилки (fork):
```typescript
// Вилка = один ход атакует 2+ фигуры оппонента одновременно
function detectFork(chess: Chess, move: Move): ForkResult {
  // 1. Сделать ход
  // 2. Получить все атакованные клетки новой позиции фигуры
  // 3. Посчитать фигуры оппонента под атакой
  // 4. Если 2+ фигуры (одна из которых ≠ пешка или хотя бы одна = король) — вилка
  // 5. Вернуть isFork: true, attackedPieces: Piece[]
}
```

### Детектор связки (pin):
```typescript
// Связка = фигура не может сдвинуться, т.к. откроет атаку на более ценную
// Проверяем: есть ли после хода фигура оппонента, которая:
// - атакует нашу фигуру по прямой/диагонали
// - за нашей фигурой стоит более ценная фигура оппонента (ферзь или король)
```

### Детектор открытой вертикали:
```typescript
// Открытая вертикаль = вертикаль без пешек обеих сторон
// Полуоткрытая = только без наших пешек
// Проверяем все 8 вертикалей после каждого хода ладьёй
```

---

## РАБОТА СО STOCKFISH

```typescript
// Stockfish запускается как Web Worker — НИКОГДА не в main thread

// Инициализация:
worker.postMessage('uci');
worker.postMessage('setoption name Skill Level value 3'); // 0-20

// Получить ход:
worker.postMessage(`position fen ${fen}`);
worker.postMessage('go movetime 500'); // 500ms на ход

// Адаптивная сложность:
const skillLevel = eloToSkillLevel(targetELO);
worker.postMessage(`setoption name Skill Level value ${skillLevel}`);

// Таймаут: если ход не пришёл за 3000ms — fallback на случайный легальный ход
```

---

## АДАПТИВНАЯ СЛОЖНОСТЬ — АЛГОРИТМ

```typescript
interface DifficultyState {
  currentELO: number;
  recentResults: boolean[]; // последние 5 партий
  chapterBaseELO: number;
}

function calculateNextOpponentELO(state: DifficultyState): number {
  const winRate = state.recentResults.filter(Boolean).length / state.recentResults.length;
  let adjustment = 0;
  if (winRate > 0.7) adjustment = +50;
  if (winRate < 0.3) adjustment = -50;
  return Math.max(
    state.chapterBaseELO - 100,
    Math.min(state.chapterBaseELO + 100, state.chapterBaseELO + adjustment)
  );
}

function eloToSkillLevel(elo: number): number {
  return Math.max(1, Math.min(20, Math.round((elo - 400) / (1800 / 19)) + 1));
}
```

---

## CI/CD КОНФИГУРАЦИЯ

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [develop, 'feat/**', 'fix/**']
  pull_request:
    branches: [develop, main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test -- --coverage --coverageThreshold='{"global":{"lines":80}}'

  e2e:
    if: github.base_ref == 'main'
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx detox build --configuration ios.sim.debug
      - run: npx detox test --configuration ios.sim.debug
```

**Branch Protection в GitHub (настрой вручную):**
```
Settings → Branches → Add rule → Branch: develop
☑ Require pull request before merging
☑ Require approvals: 1
☑ Require status checks: ci/test, ci/lint, ci/typecheck
☑ Require branches to be up to date before merging
```

---

## ПОРЯДОК РАБОТЫ КАЖДОЙ СЕССИИ

В начале каждой сессии выполни:

```bash
cat GDD_ChessQuest_v2.md          # 1. Прочитай GDD
cat PHASES.md                     # 2. Проверь статус фаз
git status                        # 3. Что не закоммичено
git log --oneline -10             # 4. История
```

Затем:
1. Найди текущую активную фазу в PHASES.md
2. Найди первый незавершённый пункт чеклиста
3. Создай ветку: `git checkout -b feat/task-name`
4. Напиши тесты ПЕРЕД кодом (TDD)
5. Напиши код до прохождения тестов
6. Коммит + пуш

---

## ЧЕКЛИСТ КАЧЕСТВА (перед каждым коммитом)

- [ ] `npx tsc --noEmit` → 0 ошибок
- [ ] `npm run lint` → 0 предупреждений
- [ ] `npm test` → все тесты зелёные
- [ ] Coverage /engine/ > 80%
- [ ] Нет `console.log` в production коде
- [ ] Stockfish только в Web Worker
- [ ] Все ходы валидируются через chess.js
- [ ] Компоненты < 200 строк, функции < 40 строк
- [ ] PHASES.md актуален

---

## ВАЖНЫЕ ОГРАНИЧЕНИЯ

1. **Шахматные правила — священны.** chess.js для валидации КАЖДОГО хода. Нет обходных путей.
2. **Stockfish — только в воркере.** Никогда не в main thread.
3. **Тесты — не опциональны.** Движок наград без тестов не принимается.
4. **TypeScript strict.** Нет `any`. Нет `as unknown`.
5. **Фазы — только с подтверждением человека.** Это не рекомендация — это блокер.

---

## НАЧАЛО РАБОТЫ

```bash
# 1. Прочитай GDD
cat GDD_ChessQuest_v2.md

# 2. Инициализируй проект
npx create-expo-app chess-quest --template blank-typescript
cd chess-quest

# 3. Установи зависимости
npm install chess.js zustand @react-native-async-storage/async-storage
npm install react-native-reanimated react-native-gesture-handler
npm install --save-dev jest @testing-library/react-native detox

# 4. Настрой Git
git init
git remote add origin <REPO_URL>
git checkout -b develop
git add .
git commit -m "feat: initial project setup"
git push -u origin develop

# 5. Создай PHASES.md (скопируй из шаблона)

# 6. Начни Фазу 1
git checkout -b feat/phase-1-types
```
