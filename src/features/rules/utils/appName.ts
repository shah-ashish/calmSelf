/**
 * Friendly Application Metadata Resolver
 * Formats package names (e.g., com.instagram.android) into human-friendly names, icons, and colors.
 */

export interface AppMetadata {
  readonly name: string;
  readonly icon: string;
  readonly brandColor: string;
}

const KNOWN_APPS: Record<string, AppMetadata> = {
  'com.instagram.android': {
    name: 'Instagram',
    icon: '📸',
    brandColor: '#E1306C',
  },
  'com.google.android.youtube': {
    name: 'YouTube',
    icon: '▶️',
    brandColor: '#FF0000',
  },
  'com.reddit.frontpage': {
    name: 'Reddit',
    icon: '🤖',
    brandColor: '#FF4500',
  },
  'com.zhiliaoapp.musically': {
    name: 'TikTok',
    icon: '🎵',
    brandColor: '#000000',
  },
  'com.ss.android.ugc.trill': {
    name: 'TikTok',
    icon: '🎵',
    brandColor: '#000000',
  },
  'com.twitter.android': {
    name: 'X (Twitter)',
    icon: '🐦',
    brandColor: '#1DA1F2',
  },
  'com.facebook.katana': {
    name: 'Facebook',
    icon: '👥',
    brandColor: '#1877F2',
  },
  'com.snapchat.android': {
    name: 'Snapchat',
    icon: '👻',
    brandColor: '#FFFC00',
  },
  'com.netflix.mediaclient': {
    name: 'Netflix',
    icon: '🎬',
    brandColor: '#E50914',
  },
  'com.pinterest': {
    name: 'Pinterest',
    icon: '📌',
    brandColor: '#E60023',
  },
  'com.linkedin.android': {
    name: 'LinkedIn',
    icon: '💼',
    brandColor: '#0A66C2',
  },
  'com.discord': {
    name: 'Discord',
    icon: '💬',
    brandColor: '#5865F2',
  },
  'com.whatsapp': {
    name: 'WhatsApp',
    icon: '📱',
    brandColor: '#25D366',
  },
  'com.spotify.music': {
    name: 'Spotify',
    icon: '🎧',
    brandColor: '#1DB954',
  },
  'com.amazon.mShop.android.shopping': {
    name: 'Amazon',
    icon: '📦',
    brandColor: '#FF9900',
  },
  'com.twitch.android.app': {
    name: 'Twitch',
    icon: '🎮',
    brandColor: '#9146FF',
  },
};

/**
 * Returns user-friendly metadata for any Android package name.
 */
export function resolveAppMetadata(packageId: string): AppMetadata {
  if (KNOWN_APPS[packageId]) {
    return KNOWN_APPS[packageId];
  }

  // Fallback: extract last segment of package name and capitalize
  const parts = packageId.split('.');
  const lastPart = parts[parts.length - 1] || packageId;
  const capitalized = lastPart.charAt(0).toUpperCase() + lastPart.slice(1);

  return {
    name: capitalized,
    icon: '📱',
    brandColor: '#64748B',
  };
}
