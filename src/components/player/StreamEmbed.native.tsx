/**
 * StreamEmbed — native platform implementation (Android + iOS).
 * Uses react-native-webview for full-featured in-app streaming.
 *
 * Ad/redirect strategy — intentionally NO onShouldStartLoadWithRequest:
 *   The whitelist approach broke VidSrc and other embed sites that redirect
 *   through intermediate CDN / player domains during loading, causing a blank
 *   white screen. Embed sites need to redirect freely to reach their video CDN.
 *
 * Instead we rely on three injected-JS guards:
 *   1. window.open() → null  — kills popup/tab-open ads.
 *   2. _blank rewrite       — in-page link clicks stay inside the WebView.
 *   3. Content detector     — polls for <video>; after 8 s with no video/iframe
 *                             posts BLANK_PAGE so PlayerScreen auto-switches.
 *      When a <video> appears it posts VIDEO_OK so the fallback timer is cancelled.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import WebViewRN from 'react-native-webview';

const WebView = WebViewRN as any;

// ---------------------------------------------------------------------------
// Injected JavaScript — runs once in the WebView's page context.
// ---------------------------------------------------------------------------
const INJECT_JS = `
(function() {
  // 1. Block window.open() pop-ups
  window.open = function() { return null; };

  // 2. Rewrite _blank links so they navigate inside the WebView
  document.addEventListener('click', function(e) {
    try {
      var el = e.target && e.target.closest ? e.target.closest('a') : null;
      if (el && el.target === '_blank') el.target = '_self';
    } catch(err) {}
  }, true);

  function post(type, detail) {
    try {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({ type: type, detail: detail || null })
      );
    } catch(err) {}
  }

  // 3a. Poll every 500 ms for a <video> element → VIDEO_OK
  var videoCheckInterval = setInterval(function() {
    try {
      var v = document.querySelector('video');
      if (v) {
        clearInterval(videoCheckInterval);
        clearTimeout(blankTimer);
        post('VIDEO_OK');
      }
    } catch(err) {}
  }, 500);

  // 3b. After 8 s, if still no video and no substantial iframe → BLANK_PAGE
  var blankTimer = setTimeout(function() {
    try {
      clearInterval(videoCheckInterval);
      var hasVideo  = !!document.querySelector('video');
      var hasIframe = !!document.querySelector('iframe');
      var bodyLen   = document.body ? document.body.innerText.trim().length : 0;
      if (!hasVideo && !hasIframe && bodyLen < 80) {
        post('BLANK_PAGE');
      }
    } catch(err) {}
  }, 8000);
})();
true;
`;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface Props {
  uri: string;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: () => void;
  /**
   * Called with a parsed JSON message from the injected JS.
   * Known types: 'VIDEO_OK' | 'BLANK_PAGE'
   */
  onWebMessage?: (msg: { type: string; detail?: string | null }) => void;
  style?: object;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const StreamEmbed: React.FC<Props> = ({
  uri,
  onLoadStart,
  onLoadEnd,
  onError,
  onWebMessage,
  style,
}) => (
  <WebView
    source={{ uri }}
    style={[styles.container, style]}
    // ── Playback permissions ──────────────────────────────────────────────
    allowsFullscreenVideo
    allowsInlineMediaPlayback
    mediaPlaybackRequiresUserAction={false}
    // ── Script / storage ─────────────────────────────────────────────────
    javaScriptEnabled
    domStorageEnabled
    // ── Load callbacks ───────────────────────────────────────────────────
    onLoadStart={onLoadStart}
    onLoadEnd={onLoadEnd}
    onError={onError}
    onHttpError={({ nativeEvent }: { nativeEvent: any }) => {
      if (nativeEvent.statusCode >= 400 && onError) onError();
    }}
    // ── Message bridge (injected JS → React Native) ───────────────────────
    onMessage={(event: any) => {
      if (!onWebMessage) return;
      try {
        const msg = JSON.parse(event.nativeEvent.data);
        onWebMessage(msg);
      } catch { /* ignore non-JSON messages */ }
    }}
    // ── Popup / redirect guards ───────────────────────────────────────────
    injectedJavaScript={INJECT_JS}
    // ── Network / UA ─────────────────────────────────────────────────────
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
