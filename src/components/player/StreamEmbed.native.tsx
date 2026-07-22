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
 *
 * Navigation guard (onShouldStartLoadWithRequest):
 *   Intercepts every top-level navigation Android WebView is about to follow.
 *   Non-top-frame requests (subframes / iframes) are always allowed — the
 *   actual video player lives inside cross-origin subframes and must not be
 *   blocked.  At the top level we allow only the initial embed domain; all
 *   other destinations (ad redirects, app-scheme deep links) are blocked and
 *   logged without triggering a server switch.
 */
import React, { useCallback } from 'react';
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
// Navigation guard — blocked URL schemes.
// Any top-level navigation whose scheme appears here is silently dropped.
// Adding a scheme here prevents the Android WebView from following it,
// which previously caused onError to fire (triggering a false server switch)
// or opened an external app.
// ---------------------------------------------------------------------------
const BLOCKED_SCHEMES = new Set([
  'intent',    // Android deep-link wrapper — always an app launch, never a page
  'market',    // Google Play Store
  'tel',       // phone dialler
  'sms',       // SMS app
  'mailto',    // email client
  'whatsapp',  // WhatsApp
  'tg',        // Telegram
  'fb',        // Facebook
  'facebook',  // Facebook (alternate)
  'instagram', // Instagram
  'twitter',   // Twitter / X
  'snapchat',  // Snapchat
  'viber',     // Viber
  'skype',     // Skype
  'line',      // Line messenger
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract the scheme from any URL string, lower-cased. Returns '' on failure. */
const getScheme = (url: string): string => {
  const match = url.match(/^([a-zA-Z][a-zA-Z0-9+\-.]*):\/\//);
  return match ? match[1].toLowerCase() : '';
};

/**
 * Extract the hostname from a URL string.
 * Returns '' if the URL cannot be parsed (e.g. intent:// or malformed strings).
 */
const getHostname = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
};

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
}) => {
  /**
   * Navigation guard — called by the Android/iOS WebView before every
   * top-level or subframe navigation.
   *
   * Return true  → allow the navigation (WebView loads the URL).
   * Return false → block the navigation (WebView stays on current page,
   *                no onError is raised, no server switch occurs).
   */
  const onShouldStartLoadWithRequest = useCallback(
    (request: { url: string; isTopFrame: boolean }): boolean => {
      const { url, isTopFrame } = request;

      // ── Subframes (iframes inside the embed) ─────────────────────────────
      // The actual video player lives in cross-origin subframes.  Blocking
      // subframe navigations breaks playback.  Always allow.
      if (!isTopFrame) {
        return true;
      }

      // ── Top-level navigation from here ───────────────────────────────────
      const scheme = getScheme(url);

      // 1. Known app-scheme deep links — block unconditionally.
      //    These used to fire onError (unhandled scheme), which caused the
      //    server-fallback logic to switch servers incorrectly.
      if (BLOCKED_SCHEMES.has(scheme)) {
        console.log('[StreamEmbed] BLOCKED app-scheme deep link:', scheme + '://', url.substring(0, 200));
        return false;
      }

      // 2. Any other non-http(s) scheme at the top level is unknown and
      //    likely an app launch attempt.  Block it.
      if (scheme !== 'http' && scheme !== 'https') {
        console.log('[StreamEmbed] BLOCKED unknown scheme:', scheme, url.substring(0, 200));
        return false;
      }

      // 3. The initial embed URL — always allow.
      //    This covers the very first load and any reload of the same URL
      //    triggered by a server switch (key={uri} remounts the WebView).
      if (url === uri) {
        return true;
      }

      // 4. Same embed domain (including subdomains) — allow.
      //    Embed sites may internally redirect within their own domain
      //    (e.g. vidsrc.me/embed/... → vidsrc.me/player/...).  These are
      //    legitimate and must not be blocked.
      const embedHost = getHostname(uri);
      const reqHost   = getHostname(url);

      if (
        embedHost &&
        reqHost &&
        (reqHost === embedHost || reqHost.endsWith('.' + embedHost))
      ) {
        return true;
      }

      // 5. All other top-level http/https navigations are ad redirects.
      //    Streaming embed sites redirect the top-level WebView frame to ad
      //    networks (e.g. trafficjunky.com, exoclick.com) after the embed
      //    page loads.  Blocking here keeps the WebView on the embed page.
      //    No onError is raised, so no false server switch occurs.
      console.log('[StreamEmbed] BLOCKED top-level ad redirect:', url.substring(0, 200));
      return false;
    },
    [uri],
  );

  return (
    <WebView
      key={uri}
      source={{ uri }}
      style={[styles.container, style]}
      // ── Playback ──────────────────────────────────────────────────────────
      allowsFullscreenVideo
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      // ── Script / storage ──────────────────────────────────────────────────
      javaScriptEnabled
      domStorageEnabled
      // ── Load events ───────────────────────────────────────────────────────
      onLoadStart={onLoadStart}
      onLoadEnd={onLoadEnd}
      onError={() => onError?.()}
      onHttpError={({ nativeEvent }: { nativeEvent: { statusCode: number } }) => {
        if (nativeEvent.statusCode >= 400) onHttpError?.(nativeEvent.statusCode);
      }}
      // ── Navigation guard ──────────────────────────────────────────────────
      onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
      // ── Ad / popup guard ──────────────────────────────────────────────────
      injectedJavaScript={INJECT_JS}
      // ── Network / UA ──────────────────────────────────────────────────────
      userAgent="Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
      originWhitelist={['*']}
      mixedContentMode="always"
      thirdPartyCookiesEnabled
      sharedCookiesEnabled
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});

export default StreamEmbed;
