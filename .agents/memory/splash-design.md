---
name: SplashScreen cinematic design
description: Architecture decisions and pitfalls for the Ismail Cinema splash screen redesign
---

# SplashScreen Cinematic Design

## Animation architecture
- All animated props are `transform` + `opacity` only → `useNativeDriver: true` everywhere (JS fallback on Expo web is transparent)
- Glow effect: two circular Views with static `shadow*` + animated `scale`/`opacity`; shadows are NOT animated so native driver is safe
- Exit: two `setTimeout` — first at 1980 ms starts the 550 ms fade-to-black animation; second at 2530 ms calls `onComplete()`
- Total duration: ~2.53 s

## Sound
- **Web**: Web Audio API synthesised programmatically (no file, no package). Five oscillator layers (55 Hz sub → 1760 Hz air) with per-layer ADSR envelopes.
- **Native**: `expo-av` `Audio.Sound.createAsync` with `assets/sounds/cinema_startup.wav` (241 KB, 44100 Hz mono 16-bit, 2.8 s).
- `playCinematicSound()` is `async` — **always guard with a `mounted` ref**: if unmount happens before the promise resolves, the stop function must be called immediately in the `.then()` callback.

**Why:** Without the mounted-ref guard, native WAV load (which takes non-zero time) can resolve after unmount and leak a playing sound indefinitely.

## React Native Web deprecation warnings
- `shadow*` style props → `boxShadow` (CSS). Dev-only warnings; production unaffected. Use `Platform.select` if silence is required.
- `textShadow*` → `textShadow`. Same.
- `pointerEvents` prop on LinearGradient → wrap in a View with `pointerEvents="none"` (ViewProps) instead of passing it to LinearGradient directly.

## Wordmark is text, not an image
- The centerpiece is a **text-based wordmark** — "ISMAIL" (zoom-in, red/gold glow) + gold divider line + "CINEMA" (drift-up, letter-spaced gold) — rendered with `Animated.Text`/`View`, not an `Image`.
- A later branding-asset swap incorrectly replaced this wordmark with `require('../../assets/branding/logo.png')` (the new app-icon logo) inside `SplashScreen.tsx`. That was wrong — the new logo belongs on app icon/adaptive-icon/favicon only, never as the splash centerpiece.
- **Why:** user explicitly asked to keep the original animated Ismail Cinema text branding on the splash screen; the new logo swap silently broke that even though the file's own docblock still described the original text animation.
- **How to apply:** if `assets/branding/logo.png` (or any new master logo) ever gets swapped in, do NOT touch `SplashScreen.tsx`'s wordmark — only regenerate `icon.png`/`adaptive-icon.png`/`favicon.png`. LoginScreen/SignUpScreen/HomeScreen header logo usages are separate and were not part of this splash issue.

## How to apply
- Keep all glow animations as transform/opacity — never animate backgroundColor or shadow values.
- Any new timed event after the exit starts (> 1980 ms) should be covered by `clearTimeout` in the cleanup return.
- `onComplete` is `useCallback([], () => setSplashComplete(true))` in `RootNavigator` — stable reference, safe as a useEffect dependency.
