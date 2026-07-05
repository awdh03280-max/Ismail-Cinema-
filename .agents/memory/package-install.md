---
name: Package install pattern
description: npm install quirks and missing packages for this Expo project.
---

# Package Install Pattern

## Always use --legacy-peer-deps
```bash
npm install --legacy-peer-deps
```
The project has peer dependency conflicts (RN version mismatches) that require this flag.

**Why:** expo-linear-gradient, react-native-webview, and other packages specify peer deps that don't exactly match the installed RN version.

## react-native-safe-area-context
This package may need to be explicitly installed:
```bash
npm install react-native-safe-area-context --legacy-peer-deps
```
It's a peer dep of `@react-navigation/bottom-tabs` but wasn't in node_modules after initial install in this project.

## How to apply
After any `npm install`, check Metro bundler logs for "Unable to resolve" errors and install the missing packages individually.
