---
name: Shadow styles on web
description: How to use shadow styles without triggering RN Web deprecation warnings.
---

React Native Web deprecates `shadow*` props (`shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`) in favour of CSS `boxShadow`.

**Fix:** Wrap ALL shadow styles in `Platform.select`:

```ts
...Platform.select({
  web: { boxShadow: '0 4px 14px rgba(0,0,0,0.5)' } as object,
  default: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
}),
```

**Gotcha:** Even `shadowOpacity: 0` or `elevation: 0` used as override/reset styles outside Platform.select trigger the warning. Wrap those too.

**Why:** `Platform.select` returns only the matching branch at runtime, so web never sees `shadow*` props.

**How to apply:** Search for bare `shadowColor` keys in StyleSheet objects not already inside a `default:` block of Platform.select.
