import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '@/ui/theme';

interface PermissionItemCardProps {
  readonly title: string;
  readonly icon: string;
  readonly isGranted: boolean;
  readonly whyNeeded: string;
  readonly onOpenSettings: () => void;
  readonly testID?: string;
}

export const PermissionItemCard: React.FC<PermissionItemCardProps> = ({
  title,
  icon,
  isGranted,
  whyNeeded,
  onOpenSettings,
  testID,
}) => {
  return (
    <View style={styles.card} testID={testID}>
      {/* Header with Icon, Title, and Status Badge */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.icon} accessibilityElementsHidden={true} importantForAccessibility="no">
            {icon}
          </Text>
          <Text style={styles.title}>{title}</Text>
        </View>

        <View
          style={[styles.badge, isGranted ? styles.badgeGranted : styles.badgePending]}
          accessible={true}
          accessibilityLabel={`Permission status: ${isGranted ? 'Granted' : 'Required'}`}
        >
          <Text
            style={[styles.badgeText, isGranted ? styles.badgeTextGranted : styles.badgeTextPending]}
          >
            {isGranted ? '✓ Active' : 'Action Needed'}
          </Text>
        </View>
      </View>

      {/* Explanation Text */}
      <View style={styles.explanationBox}>
        <Text style={styles.explanationHeading}>Why Calm Self needs this:</Text>
        <Text style={styles.explanationText}>{whyNeeded}</Text>
      </View>

      {/* Action Button */}
      <TouchableOpacity
        style={[styles.button, isGranted ? styles.buttonGranted : styles.buttonPrimary]}
        onPress={onOpenSettings}
        activeOpacity={0.8}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${title}: ${isGranted ? 'Open system settings' : 'Grant permission in Android settings'}`}
        accessibilityHint="Opens your Android system settings screen where you can enable this permission."
      >
        <Text
          style={[styles.buttonText, isGranted ? styles.buttonTextGranted : styles.buttonTextPrimary]}
        >
          {isGranted ? '⚙️ Review in Android Settings' : 'Enable in Android Settings →'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm + 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: spacing.sm,
  },
  icon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  title: {
    ...typography.h3,
    fontSize: 16,
    flexShrink: 1,
  },
  badge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  badgeGranted: {
    backgroundColor: colors.primaryLight,
  },
  badgePending: {
    backgroundColor: colors.accentAmberLight,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  badgeTextGranted: {
    color: colors.primaryDark,
  },
  badgeTextPending: {
    color: colors.accentAmber,
  },
  explanationBox: {
    backgroundColor: colors.backgroundSubtle,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  explanationHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  explanationText: {
    ...typography.bodyMuted,
    lineHeight: 20,
    fontSize: 13,
  },
  button: {
    paddingVertical: spacing.sm + 4,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
    ...shadows.sm,
  },
  buttonGranted: {
    backgroundColor: colors.backgroundSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonText: {
    ...typography.button,
  },
  buttonTextPrimary: {
    color: colors.textInverted,
  },
  buttonTextGranted: {
    color: colors.textSecondary,
  },
});
