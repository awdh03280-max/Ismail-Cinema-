---
name: Expo web streaming setup
description: How to use react-native-webview in an Expo project that also targets web.
---

react-native-webview is a native-only module. Metro does static require() analysis, so even a `Platform.OS !== 'web'` guard does not prevent bundling on web — the module fails to resolve and logs "Requiring unknown module 'undefined'".

**Rule:** Use Metro platform-specific file extensions:
- `Component.native.tsx` — native (iOS/Android) implementation using WebView
- `Component.web.tsx` — web implementation using `<iframe>`
- `Component.tsx` — TypeScript shim that re-exports from .web.tsx so tsc can resolve the import

Metro automatically picks the right file at runtime; TypeScript uses the .tsx shim for type checking.

**Why:** Metro resolves `.native.tsx` before `.tsx` on native platforms and `.web.tsx` before `.tsx` on web, so the shim is never actually bundled.

**How to apply:** Any time a native-only module (react-native-webview, react-native-maps, etc.) needs to be used in an Expo project with a web target, create platform-split files.
