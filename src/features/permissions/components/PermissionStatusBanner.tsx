import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '@/ui/theme';

interface PermissionStatusBannerProps {
  readonly allGranted: boolean;
  readonly overlayGranted: boolean;
  readonly usageAccessGranted: boolean;
}

export const PermissionStatusBanner: React.FC<PermissionStatusBannerProps> = ({
  allGranted,
  overlayGranted,
  usageAccessGranted,
}) => {
  const grantedCount = (overlayGranted ? 1 : 0) + (usageAccessGranted ? 1 : 0);

  return (
    <View
      style={[styles.banner, allGranted ? styles.bannerActive : styles.bannerPending]}
      accessible={true}
      accessibilityRole="summary"
      accessibilityLabel={`Safeguard status: ${allGranted ? 'All safeguards active' : `${grantedCount} of 2 permissions active`}`}
    >
      <View style={styles.contentRow}>
        <Text style={styles.icon}>{allGranted ? '🛡️' : '🌿'}</Text>
        <View style={styles.textColumn}>
          <Text style={styles.title}>
            {allGranted ? 'All Safeguards Active' : 'Setup Permissions'}
          </Text>
          <Text style={styles.subtitle}>
            {allGranted
              ? 'Calm Self is actively protecting your digital focus.'
              : `${grantedCount} of 2 permissions enabled. Calm Self works 100% locally on your device.`}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    borderRadius: radii.xl,
    padding: spacing.md + 2,
    marginBottom: spacing.lg,
    ...shadows.sm,
    borderWidth: 1,
  },
  bannerActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  bannerPending: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSubtle,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 28,
    marginRight: spacing.md,
  },
  textColumn: {
    flex: 1,
  },
  title: {
    ...typography.h3,
    fontSize: 16,
    marginBottom: 2,
  },
  subtitle: {
    ...typography.bodyMuted,
    fontSize: 13,
    lineHeight: 18,
  },
});
