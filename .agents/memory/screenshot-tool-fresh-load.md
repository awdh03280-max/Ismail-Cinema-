---
name: Screenshot tool fresh load caveat
description: app_preview screenshots reload the page each call, resetting client-side timers and animations.
---

Each call to the `app_preview` screenshot tool appears to perform a fresh navigation/reload of the target path rather than reusing an existing browser session. For apps with client-side timers on mount (splash screen intros, onboarding animations, delayed redirects), repeated screenshots at the same path can look "stuck" at an early frame even though the animation is progressing correctly — because each screenshot restarts the timer from zero.

**Why:** Observed while auditing a 3-second splash screen animation (Ismail Cinema) — consecutive screenshots several seconds apart still showed near-identical early-animation frames, which initially looked like a stuck/broken animation but was just the reload artifact.

**How to apply:** When verifying time-based UI (splash screens, toasts, auto-redirects) via screenshots, don't conclude something is stuck just because consecutive screenshots look similar. Prefer reading the component's timer/animation code directly, checking browser console logs for errors, or comparing subtle frame differences (e.g. opacity/text visibility) across shots to confirm progression before assuming a bug.
