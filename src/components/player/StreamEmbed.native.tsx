/**
 * StreamEmbed — native platform implementation (Android + iOS).
 * Uses react-native-webview for full-featured in-app streaming.
 *
 * Ad/redirect protection:
 *  - onShouldStartLoadWithRequest blocks main-frame navigations to domains
 *    that are not in the known embed-server whitelist.
 *  - Injected JS disables window.open() so pop-up ads can't open new tabs.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import WebViewRN from 'react-native-webview';

const WebView = WebViewRN as any;

// Known embed-server hostnames (and their subdomains) that are allowed to
// perform top-level navigations inside the WebView.
const ALLOWED_EMBED_HOSTS = [
  'vidsrc.xyz',
  'vidsrc.me',
  'vidsrc.to',
  'vidsrc.net',
  'vidsrc.cc',
  'vidsrc.in',
  'embed.su',
  'autoembed.cc',
  'multiembed.mov',
  '2embed.cc',
  '2embed.org',
  'moviesapi.club',
  'nontonfilm.top',
  'embedder.net',
  'player.videasy.net',
  'vidlink.pro',
  'vid2fuse.com',
  'filemoon.sx',
  'streamwish.com',
];

/** Return true when a URL's hostname is within an allowed embed domain. */
const isAllowedHost = (url: string): boolean => {
  try {
    const { hostname } = new URL(url);
    const host = hostname.replace(/^www\./, '');
    return ALLOWED_EMBED_HOSTS.some(
      (allowed) => host === allowed || host.endsWith(`.${allowed}`)
    );
  } catch {
    // Unparseable URL (data:, blob:, about:, javascript:) — let the WebView
    // handle these natively; don't block them.
    return true;
  }
};

// Injected once after the page loads — kills window.open so ad pop-ups
// can never open a new browser tab or intent.
const KILL_POPUPS_JS = `
  (function() {
    window.open = function() { return null; };
    // Also prevent any <a target="_blank"> from escaping the WebView.
    document.addEventListener('click', function(e) {
      var el = e.target && e.target.closest('a');
      if (el && el.target === '_blank') { el.target = '_self'; }
    }, true);
  })();
  true;
`;

interface Props {
  uri: string;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: () => void;
  style?: object;
}

const StreamEmbed: React.FC<Props> = ({ uri, onLoadStart, onLoadEnd, onError, style }) => (
  <WebView
    source={{ uri }}
    style={[styles.container, style]}
    allowsFullscreenVideo
    allowsInlineMediaPlayback
    mediaPlaybackRequiresUserAction={false}
    javaScriptEnabled
    domStorageEnabled
    onLoadStart={onLoadStart}
    onLoadEnd={onLoadEnd}
    onError={onError}
    onHttpError={({ nativeEvent }: { nativeEvent: any }) => {
      if (nativeEvent.statusCode >= 400 && onError) onError();
    }}
    // Block navigations that would redirect the WebView away from the embed.
    // On Android this fires only for main-frame (page-level) navigations,
    // so sub-resource loads (video segments, scripts, XHR) are unaffected.
    onShouldStartLoadWithRequest={(request: any) => {
      const { url } = request;
      // Always allow non-HTTP schemes (blob:, data:, about:, javascript:).
      if (!url.startsWith('http://') && !url.startsWith('https://')) return true;
      // Allow the initial embed URL and any known streaming domain.
      if (isAllowedHost(url)) return true;
      // Block everything else — likely an ad redirect or tracker redirect.
      return false;
    }}
    injectedJavaScript={KILL_POPUPS_JS}
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
