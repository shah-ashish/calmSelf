import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '@/ui/theme';

export interface EmptyRulesViewProps {
  readonly onCreateRule: () => void;
}

export function EmptyRulesView({ onCreateRule }: EmptyRulesViewProps) {
  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel="No active protection rules yet. Tap the button below to create your first rule."
    >
      <View style={styles.iconCircle}>
        <Text style={styles.icon}>🌿</Text>
      </View>

      <Text style={styles.title}>Cultivate Mindful Habits</Text>

      <Text style={styles.description}>
        Write thoughtful messages to your future self. When you open tempting apps, Calm Self gently
        reminds you of what matters most before you start scrolling.
      </Text>

      <View style={styles.benefitsContainer}>
        <View style={styles.benefitItem}>
          <Text style={styles.benefitBullet}>✨</Text>
          <Text style={styles.benefitText}>Custom mindful messages chosen randomly</Text>
        </View>
        <View style={styles.benefitItem}>
          <Text style={styles.benefitBullet}>⏱️</Text>
          <Text style={styles.benefitText}>Independent daily time limits per app</Text>
        </View>
        <View style={styles.benefitItem}>
          <Text style={styles.benefitBullet}>🔒</Text>
          <Text style={styles.benefitText}>Automatic cooldown locks once limits are reached</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.ctaButton}
        onPress={onCreateRule}
        activeOpacity={0.85}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Create your first rule"
        accessibilityHint="Opens the rule creation form"
      >
        <Text style={styles.ctaButtonText}>+ Create Your First Rule</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginVertical: spacing.sm,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: radii.full,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  icon: {
    fontSize: 32,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.bodyMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  benefitsContainer: {
    width: '100%',
    backgroundColor: colors.backgroundSubtle,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  benefitBullet: {
    fontSize: 14,
    marginRight: spacing.sm,
  },
  benefitText: {
    ...typography.body,
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  ctaButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.xl,
    width: '100%',
    alignItems: 'center',
    ...shadows.sm,
  },
  ctaButtonText: {
    ...typography.button,
    color: colors.textInverted,
    fontSize: 15,
  },
});
