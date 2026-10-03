import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { AppState } from '@/domain/types';
import { resolveAppMetadata } from '../utils/appName';
import { colors, radii, spacing, typography } from '@/ui/theme';

export interface AppUsageBadgeProps {
  readonly appId: string;
  readonly limitMinutes: number;
  readonly appState?: AppState;
  readonly now?: number;
}

export function AppUsageBadge({ appId, limitMinutes, appState, now }: AppUsageBadgeProps) {
  const meta = resolveAppMetadata(appId);
  const [fallbackNow] = React.useState(() => Date.now());
  const effectiveNow = now ?? fallbackNow;

  const usedSeconds = appState?.usedTodaySeconds ?? 0;
  const usedMinutes = Math.floor(usedSeconds / 60);

  const isLocked = Boolean(appState?.lockedUntil && appState.lockedUntil > effectiveNow);

  const ratio = Math.min(1, usedMinutes / Math.max(1, limitMinutes));
  const percent = Math.round(ratio * 100);

  let lockTimeString = '';
  if (isLocked && appState?.lockedUntil) {
    try {
      const lockDate = new Date(appState.lockedUntil);
      const hours = lockDate.getHours().toString().padStart(2, '0');
      const mins = lockDate.getMinutes().toString().padStart(2, '0');
      lockTimeString = `${hours}:${mins}`;
    } catch {
      lockTimeString = '';
    }
  }

  // Pick color for progress bar
  let barColor: string = colors.primary;
  if (isLocked) {
    barColor = colors.danger;
  } else if (ratio >= 0.8) {
    barColor = colors.accentPeach;
  } else if (ratio >= 0.5) {
    barColor = colors.accentAmber;
  }

  return (
    <View
      style={[styles.container, isLocked && styles.containerLocked]}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`${meta.name}: ${usedMinutes} of ${limitMinutes} minutes used today.${
        isLocked ? ` Currently locked until ${lockTimeString}` : ''
      }`}
    >
      <View style={styles.topRow}>
        <View style={styles.appIdentity}>
          <Text style={styles.appIcon}>{meta.icon}</Text>
          <Text style={styles.appName} numberOfLines={1}>
            {meta.name}
          </Text>
        </View>

        <View style={styles.usageIndicator}>
          {isLocked ? (
            <View style={styles.lockedBadge}>
              <Text style={styles.lockedBadgeText}>
                🔒 Locked{lockTimeString ? ` until ${lockTimeString}` : ''}
              </Text>
            </View>
          ) : (
            <Text style={styles.usageText}>
              <Text style={styles.usageBold}>{usedMinutes}</Text>
              <Text style={styles.usageMuted}> / {limitMinutes} min</Text>
            </Text>
          )}
        </View>
      </View>

      {/* Progress track */}
      <View style={styles.progressBarTrack}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${isLocked ? 100 : percent}%`, backgroundColor: barColor },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundSubtle,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 3,
    marginBottom: spacing.xs + 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  containerLocked: {
    borderColor: colors.dangerLight,
    backgroundColor: '#FFF5F5',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  appIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  appIcon: {
    fontSize: 16,
    marginRight: spacing.xs + 2,
  },
  appName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    flexShrink: 1,
  },
  usageIndicator: {
    alignItems: 'flex-end',
  },
  usageText: {
    ...typography.caption,
  },
  usageBold: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  usageMuted: {
    color: colors.textSecondary,
  },
  lockedBadge: {
    backgroundColor: colors.dangerLight,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  lockedBadgeText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.dangerText,
    fontSize: 11,
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: radii.full,
  },
});
