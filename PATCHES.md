# PATCHES.md — Known Fixes & Node Modules Patches

Этот файл документирует нестандартные патчи применённые к node_modules через patch-package.
Патчи хранятся в `patches/` и применяются автоматически через `postinstall` в `package.json`.

---

## Баг: TypeError: expected boolean, got string (react-native-screens + Expo Go SDK 54)

**Дата:** 2026-06-04  
**Патч:** `patches/react-native-screens+4.25.2.patch`

### Симптомы

Render Error на телефоне:
```
TypeError: expected dynamic type 'boolean', but had type 'string'
Component Stack: AnimatedComponent → Freeze → DelayedFreeze
```

### Причина

Metro использует поле `"react-native"` в `package.json` библиотек —
загружает TypeScript исходники из `src/`, а не скомпилированные `lib/`.

`react-native-screens/src/utils.ts` содержал `parseBooleanToOptionalBooleanNativeProp`
которая возвращала строки `'true'`/`'false'`/`'undefined'` вместо реальных `boolean`.
Нативный модуль Expo Go SDK 54 ожидает настоящий `boolean | undefined`.

```ts
// было — строки:
case undefined: return 'undefined';
case true:      return 'true';
case false:     return 'false';

// стало — реальные boolean:
if (prop === undefined) return undefined;
return prop === true;
```

`DelayedFreeze.tsx` оборачивал экраны через `react-freeze` → `React.Suspense` + брошенный
thenable, что тоже падало на старой архитектуре.

### Решение

`patch-package` патчит четыре файла `react-native-screens`:

| Файл | Что исправлено |
|------|---------------|
| `src/utils.ts` | **Главный источник бага** — возвращает реальные `boolean \| undefined` |
| `src/components/helpers/DelayedFreeze.tsx` | Убирает `react-freeze`/`Suspense`, рендерит `Fragment` |
| `lib/module/utils.js` | Те же изменения для не-Metro окружений |
| `lib/commonjs/utils.js` | Те же изменения для не-Metro окружений |

`postinstall` в `package.json` автоматически применяет патч после каждого `npm install`:
```json
"postinstall": "patch-package"
```

### Что НЕ помогало

- `"newArchEnabled": false` в `app.json` — не влияет на Expo Go binary
- Замена `react-native-reanimated` на стандартный `Animated` из React Native
- Metro resolver shim для `react-freeze` (`metro.config.js` → `shims/react-freeze.js`)
- Патч только `lib/module/` и `lib/commonjs/` файлов — **Metro их игнорирует**, читает `src/`

### Ключевой инсайт

При отладке патчей `node_modules` всегда проверять поле `"react-native"` в `package.json`
библиотеки — именно его Metro резолвит в первую очередь, не `"main"` и не `"module"`.

```json
{
  "main": "lib/commonjs/index",  // Node.js
  "module": "lib/module/index",  // bundlers
  "react-native": "src/index"    // Metro ← это грузит Expo
}
```
