/**
 * StreamEmbed — bare-extension re-export.
 *
 * Metro's platform resolver picks StreamEmbed.native.tsx / StreamEmbed.web.tsx
 * automatically at bundle/runtime, so this file is never actually bundled.
 * It exists purely so TypeScript (which does not apply Metro's platform
 * resolution) can resolve the extensionless `./StreamEmbed` import used by
 * PlayerScreen.
 */
import StreamEmbed from './StreamEmbed.web';
export default StreamEmbed;
