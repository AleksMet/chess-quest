# Chess Quest

> Roguelike chess adventure — learn chess while having fun.

A mobile game where every chess match is an adventure. Inspired by Balatro, Slay the Spire, and Hades. Built with Expo + React Native.

---

## Quick Start

```bash
npm install
npm start          # → Expo dev server
npm run ios        # → iOS simulator
npm run android    # → Android emulator
npm run web        # → browser (web fallback)
```

## Quality Checks

```bash
npm run lint          # ESLint (0 warnings enforced)
npm run typecheck     # TypeScript strict mode
npm test              # Jest unit tests
npm run test:coverage # Tests + coverage report
```

## Architecture

```
src/
├── app/               # Expo Router screens
│   ├── index.tsx          # Main menu (fantasy style)
│   ├── adventure/         # Chapter map
│   ├── battle/            # Chess board + HUD
│   ├── artifact-selection # Choose 3 artifacts
│   ├── shop.tsx           # Buy / sell artifacts
│   ├── victory.tsx        # Win screen
│   ├── defeat.tsx         # Lose screen
│   └── onboarding.tsx     # First-run tutorial
├── components/
│   ├── chess/             # ChessBoard + ChessPieceSVG (Cburnett)
│   ├── artifacts/         # ArtifactCard (rarity glow)
│   ├── battle/            # BattleScreen HUD
│   └── map/               # AdventureMap, NodeIcon
├── engine/
│   ├── chessLogic.ts      # chess.js wrapper + move validation
│   ├── rewardEngine.ts    # Gold rewards per artifact effect
│   ├── difficultyEngine.ts# Adaptive ELO calibration
│   └── stockfish.ts       # Stockfish WebView bridge
├── store/
│   ├── runStore.ts        # Zustand: current run state
│   └── metaStore.ts       # Zustand + AsyncStorage: meta progress
├── data/
│   ├── artifacts.ts       # 10 MVP artifacts
│   ├── heroes.ts          # Timmy + Finn
│   ├── bosses.ts          # Goblin King Gustav
│   └── chapters.ts        # Chapter themes (FOREST_THEME, etc.)
├── contexts/
│   ├── ChapterThemeContext.tsx  # Visual theme per chapter
│   └── AccessibilityContext.tsx # Font scale (S/M/L)
└── types/index.ts         # All TypeScript interfaces
```

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Expo SDK 54 + React Native 0.81 |
| Router | Expo Router v6 (file-based) |
| Chess rules | chess.js |
| Chess AI | Stockfish via react-native-webview |
| State | Zustand v5 |
| Storage | AsyncStorage |
| Animations | React Native Reanimated 4 |
| SVG Pieces | react-native-svg (Cburnett style, CC BY-SA 3.0) |
| Tests | Jest + jest-expo + @testing-library/react-native |
| CI | GitHub Actions |
| Builds | EAS Build (TestFlight + Play Internal) |

## Game Structure

```
Main Menu → Select Hero → Adventure Map (5 nodes) → Battles + Events → Boss
```

**Heroes**: Timmy Pawn (+25% promotion rewards) · Finn Knight (+30% fork rewards)

**Artifacts**: 10 MVP artifacts (common → mythic rarity, glow effect per tier)

**Adaptive AI**: Stockfish ELO 400–600 (Chapter 1, Forest of Pawns)

## CI/CD

GitHub Actions runs on every push and PR:
- ESLint (0 warnings)
- TypeScript strict check
- Jest unit tests + 80% engine coverage

EAS Build is triggered on merge to `main` for TestFlight + Play Console Internal distribution.

## Contributing

```bash
git checkout -b feat/your-feature
# write tests first (TDD)
npm test
npm run lint && npm run typecheck
git commit -m "feat(area): description"
```

Branch naming: `feat/` · `fix/` · `test/` · `ci/` · `docs/`

## Credits

Celtic chess pieces by Maurizio Monge, MIT license (https://github.com/maurimo/chess-art)

---

*Chess Quest MVP — built for iOS + Android*
