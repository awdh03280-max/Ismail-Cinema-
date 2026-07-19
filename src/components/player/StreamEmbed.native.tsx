/**
 * StreamEmbed — native (Android / iOS).
 *
 * Detection strategy — native WebView events only, no injected video detector:
 *   onLoadStart  → page request started
 *   onLoadEnd    → page finished loading (cancel the 10 s timeout)
 *   onError      → network / SSL failure  → immediate server switch
 *   onHttpError  → HTTP 4xx / 5xx        → immediate server switch
 *
 * Injected JS is limited to ad-blocking only (window.open + _blank rewrite).
 * We deliberately do NOT poll for <video> inside the page — all streaming
 * embed sites put their player inside a cross-origin iframe, so
 * document.querySelector('video') always returns null in the parent frame.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import WebViewRN from 'react-native-webview';

const WebView = WebViewRN as any;

// ---------------------------------------------------------------------------
// Injected JS — ad / popup blocking only.  No content detection.
// ---------------------------------------------------------------------------
const INJECT_JS = `
(function() {
  window.open = function() { return null; };
  document.addEventListener('click', function(e) {
    try {
      var el = e.target && e.target.closest ? e.target.closest('a') : null;
      if (el && el.target === '_blank') el.target = '_self';
    } catch(err) {}
  }, true);
})();
true;
`;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface StreamEmbedProps {
  uri: string;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  /** Network / SSL failure — switch server immediately. */
  onError?: () => void;
  /** HTTP 4xx / 5xx — switch server immediately. */
  onHttpError?: (statusCode: number) => void;
  style?: object;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const StreamEmbed: React.FC<StreamEmbedProps> = ({
  uri,
  onLoadStart,
  onLoadEnd,
  onError,
  onHttpError,
  style,
}) => (
  <WebView
    key={uri}
    source={{ uri }}
    style={[styles.container, style]}
    // ── Playback ────────────────────────────────────────────────────────────
    allowsFullscreenVideo
    allowsInlineMediaPlayback
    mediaPlaybackRequiresUserAction={false}
    // ── Script / storage ────────────────────────────────────────────────────
    javaScriptEnabled
    domStorageEnabled
    // ── Load events ─────────────────────────────────────────────────────────
    onLoadStart={onLoadStart}
    onLoadEnd={onLoadEnd}
    onError={() => onError?.()}
    onHttpError={({ nativeEvent }: { nativeEvent: { statusCode: number } }) => {
      if (nativeEvent.statusCode >= 400) onHttpError?.(nativeEvent.statusCode);
    }}
    // ── Ad / popup guard ────────────────────────────────────────────────────
    injectedJavaScript={INJECT_JS}
    // ── Network / UA ────────────────────────────────────────────────────────
    userAgent="Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
    originWhitelist={['*']}
    mixedContentMode="always"
    thirdPartyCookiesEnabled
    sharedCookiesEnabled
  />
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});

export default StreamEmbed;
