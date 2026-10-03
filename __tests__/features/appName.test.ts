import { resolveAppMetadata } from '@/features/rules/utils/appName';

describe('resolveAppMetadata (Friendly App Names & Icons)', () => {
  it('resolves known popular apps with custom icons and brand colors', () => {
    const instagram = resolveAppMetadata('com.instagram.android');
    expect(instagram.name).toBe('Instagram');
    expect(instagram.icon).toBe('📸');
    expect(instagram.brandColor).toBe('#E1306C');

    const youtube = resolveAppMetadata('com.google.android.youtube');
    expect(youtube.name).toBe('YouTube');
    expect(youtube.icon).toBe('▶️');

    const reddit = resolveAppMetadata('com.reddit.frontpage');
    expect(reddit.name).toBe('Reddit');
    expect(reddit.icon).toBe('🤖');

    const tiktok = resolveAppMetadata('com.zhiliaoapp.musically');
    expect(tiktok.name).toBe('TikTok');
    expect(tiktok.icon).toBe('🎵');

    const twitter = resolveAppMetadata('com.twitter.android');
    expect(twitter.name).toBe('X (Twitter)');
    expect(twitter.icon).toBe('🐦');
  });

  it('gracefully handles unknown packages by capitalizing the last segment', () => {
    const customApp = resolveAppMetadata('com.example.chessmaster');
    expect(customApp.name).toBe('Chessmaster');
    expect(customApp.icon).toBe('📱');
    expect(customApp.brandColor).toBe('#64748B');

    const simpleName = resolveAppMetadata('sudoku');
    expect(simpleName.name).toBe('Sudoku');
    expect(simpleName.icon).toBe('📱');
  });
});
