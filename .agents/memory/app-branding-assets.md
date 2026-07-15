---
name: App branding / logo assets
description: Where the app logo lives and how to regenerate icon/splash/favicon variants from a new master image.
---

`assets/branding/logo.png` (512x512) is the master in-app UI logo, referenced via `require()` from Image components in SplashScreen, LoginScreen, SignUpScreen, ProfileSignInPrompt, and HomeScreen's header — these all use a raster image, not styled text, for the brand mark.

`assets/icon.png` (1024x1024, direct resize of the source logo) and `assets/adaptive-icon.png` (logo scaled to ~68% and centered on a black 1024x1024 canvas) are separate exports — the adaptive icon needs the shrink+pad step so Android's circular/squircle mask doesn't clip the artwork.

**Why:** the source logo art fills nearly the full square canvas edge-to-edge; used as-is for the Android adaptive icon foreground, the OS mask would crop the outer ring/props.

**How to apply:** when swapping the app logo, regenerate all of `assets/icon.png`, `assets/adaptive-icon.png`, `assets/favicon.png`, `assets/splash.png`, and `assets/branding/logo.png` from the new master with ImageMagick (`magick <src> -resize ...`), keeping the adaptive-icon safe-zone padding step — then update all five `require()` call sites above (grep `branding/logo.png` and `assets/icon.png` etc.) rather than editing app.json paths, since filenames stay constant.
