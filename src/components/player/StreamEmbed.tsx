/**
 * TypeScript type shim.
 * Metro bundler replaces this at runtime with StreamEmbed.native.tsx (iOS/Android)
 * or StreamEmbed.web.tsx (browser), which are the actual implementations.
 *
 * This file exists only so tsc can resolve the import in PlayerScreen.
 */
import StreamEmbed from './StreamEmbed.web';
export default StreamEmbed;
