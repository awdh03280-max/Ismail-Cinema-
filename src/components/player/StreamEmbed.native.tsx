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
 *   IMPORTANT — on Android, the guard is NOT called for the very first load
 *   (including any server-side 301/302 redirect chain that happens during it).
 *   It IS called for every subsequent JS-initiated or link-click navigation.
 *
 *   Non-top-frame requests (subframes / iframes) are always allowed — the
 *   actual video player lives inside cross-origin subframes and must not be
 *   blocked.
 *
 *   currentHostRef tracks the hostname of the page currently shown in the
 *   WebView, updated by onLoadStart's nativeEvent.url.  This keeps the guard
 *   correct even when a server-side redirect has moved the page to a different
 *   domain from the original uri prop (e.g. vidsrc.me → vidsrcme.ru).
 *
 *   At the top level only these navigations are permitted:
 *     • The original URI (first load / server-switch reload)
 *     • http/https URLs on the same host as the currently loaded page
 *     • http/https URLs on the same host as the original uri prop
 *   Everything else — app-scheme deep links, ad redirects to external domains
 *   — is blocked silently without raising onError.
 */
import React, { useCallback, useRef } from 'react';
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
// Previously these triggered onError, which incorrectly caused the server-
// fallback logic to switch to the next server.
// ---------------------------------------------------------------------------
const BLOCKED_SCHEMES = new Set([
  'intent',    // Android deep-link wrapper — always an app launch, never a page
  'market',    // Google Play Store
  'tel',       // phone dialler
  'sms',       // SMS app
  'mailto',    // email client
  'whatsapp',  // WhatsApp
  'tg',        // Telegram
  'fb',        // Facebook (alternate scheme)
  'facebook',  // Facebook
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

/** Extract the URL scheme, lower-cased.  Returns '' on failure. */
const getScheme = (url: string): string => {
  const match = url.match(/^([a-zA-Z][a-zA-Z0-9+\-.]*):\/\//);
  return match ? match[1].toLowerCase() : '';
};

/** Extract hostname.  Returns '' if the URL cannot be parsed. */
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
   * currentHostRef — hostname of the page currently shown in the WebView.
   *
   * Initialised to the hostname of the uri prop.  Updated every time
   * onLoadStart fires, using nativeEvent.url from the WebView event.
   * This means the ref stays accurate even after a server-side 301/302
   * redirect moves the page to a different domain (e.g. vidsrc.me →
   * vidsrcme.ru): onLoadStart fires for the redirected URL, so the ref
   * is updated before any JS on that page can trigger a navigation.
   */
  const currentHostRef = useRef<string>(getHostname(uri));

  /**
   * Navigation guard — called before every navigation the WebView is about
   * to follow.  On Android this is NOT called for the first load (including
   * its server-side redirect chain); on iOS it is called for everything.
   *
   * Return true  → allow.
   * Return false → block silently (no onError, no server switch).
   */
  const onShouldStartLoadWithRequest = useCallback(
    (request: { url: string; isTopFrame: boolean }): boolean => {
      const { url, isTopFrame } = request;

      // ── Subframes (cross-origin iframes inside the embed) ────────────────
      // The actual video player lives inside subframes.  Always allow.
      if (!isTopFrame) {
        return true;
      }

      // ── Top-level navigation from here ───────────────────────────────────
      const scheme = getScheme(url);

      // 1. Known app-scheme deep links — block unconditionally.
      //    These previously triggered onError → false server switch.
      if (BLOCKED_SCHEMES.has(scheme)) {
        console.log('[StreamEmbed] BLOCKED app-scheme deep link:', scheme + '://', url.substring(0, 200));
        return false;
      }

      // 2. Any other non-http(s) scheme at the top level is an unknown app
      //    launch.  Block it.
      if (scheme !== 'http' && scheme !== 'https') {
        console.log('[StreamEmbed] BLOCKED unknown scheme:', scheme, url.substring(0, 200));
        return false;
      }

      // 3. The original embed URI — always allow (first load / reload).
      if (url === uri) {
        return true;
      }

      const reqHost = getHostname(url);

      // 4. Same host as the page currently shown in the WebView — allow.
      //    Covers legitimate within-domain navigations on the final redirected
      //    page (e.g. vidsrcme.ru/sbx.html after a vidsrc.me→vidsrcme.ru
      //    redirect), without letting ad networks hijack the top frame.
      const currentHost = currentHostRef.current;
      if (
        currentHost &&
        reqHost &&
        (reqHost === currentHost || reqHost.endsWith('.' + currentHost))
      ) {
        return true;
      }

      // 5. Same host as the original uri prop — allow.
      //    Belt-and-suspenders: covers the case where currentHostRef has not
      //    yet been updated (race between onLoadStart and a fast JS redirect).
      const embedHost = getHostname(uri);
      if (
        embedHost &&
        reqHost &&
        (reqHost === embedHost || reqHost.endsWith('.' + embedHost))
      ) {
        return true;
      }

      // 6. All other top-level http/https navigations are ad redirects.
      //    Block them — keep the WebView on the current embed page.
      //    No onError is raised, so no false server switch occurs.
      console.log('[StreamEmbed] BLOCKED top-level ad redirect:', url.substring(0, 200));
      return false;
    },
    [uri],
  );

  /** Intercept onLoadStart to update currentHostRef with the navigated URL. */
  const handleLoadStart = useCallback(
    (event: any) => {
      const loadingUrl: string | undefined = event?.nativeEvent?.url;
      if (loadingUrl) {
        const host = getHostname(loadingUrl);
        if (host) {
          currentHostRef.current = host;
        }
      }
      onLoadStart?.();
    },
    [onLoadStart],
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
      onLoadStart={handleLoadStart}
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
