import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, radii, shadows, spacing, typography } from '../src/ui/theme';

import { usePermissions } from '../src/features/permissions';

export default function HomeScreen() {
  const router = useRouter();
  const { allGranted } = usePermissions();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Mindful Welcome Banner */}
      <View style={styles.welcomeBanner}>
        <View style={[styles.bannerBadge, !allGranted && styles.bannerBadgePending]}>
          <Text style={[styles.bannerBadgeText, !allGranted && styles.bannerBadgeTextPending]}>
            {allGranted ? '🛡️ Safeguards Active' : '⚠️ Action Needed'}
          </Text>
        </View>
        <Text style={styles.welcomeTitle}>Welcome back, Ashish</Text>
        <Text style={styles.welcomeSubtitle}>
          {allGranted
            ? 'Your mindful safeguards are active and protecting your digital focus.'
            : 'Grant permissions to enable overlay messages and automatic focus limits.'}
        </Text>

        <TouchableOpacity
          style={[styles.permissionPrompt, !allGranted && styles.permissionPromptPending]}
          onPress={() => router.push('/onboarding/permissions')}
          activeOpacity={0.8}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={allGranted ? 'View system permissions, all active' : 'Permissions needed, tap to setup'}
        >
          <Text style={[styles.permissionPromptText, !allGranted && styles.permissionPromptTextPending]}>
            {allGranted
              ? '⚙️ System Permissions: All Active'
              : '👉 Tap to Enable Required Permissions'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Rules Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Active Rules</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/rule/new')}
          activeOpacity={0.8}
        >
          <Text style={styles.addButtonText}>+ New Rule</Text>
        </TouchableOpacity>
      </View>

      {/* Empty / Intro Card */}
      <View style={styles.emptyCard}>
        <View style={styles.emptyIconContainer}>
          <Text style={styles.emptyIcon}>🌿</Text>
        </View>
        <Text style={styles.emptyTitle}>Cultivate Mindful Habits</Text>
        <Text style={styles.emptyText}>
          Create your first rule to write thoughtful messages to your future self when opening
          distracting apps.
        </Text>
        <TouchableOpacity
          style={styles.createFirstButton}
          onPress={() => router.push('/rule/new')}
          activeOpacity={0.85}
        >
          <Text style={styles.createFirstButtonText}>Create Your First Rule</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  welcomeBanner: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  bannerBadge: {
    backgroundColor: colors.primaryLight,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    marginBottom: spacing.sm,
  },
  bannerBadgeText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
  bannerBadgePending: {
    backgroundColor: colors.accentAmberLight,
  },
  bannerBadgeTextPending: {
    color: colors.accentAmber,
  },
  welcomeTitle: {
    ...typography.h2,
    marginBottom: spacing.xs,
  },
  welcomeSubtitle: {
    ...typography.bodyMuted,
    marginBottom: spacing.md,
  },
  permissionPrompt: {
    backgroundColor: colors.backgroundSubtle,
    borderRadius: radii.md,
    padding: spacing.sm + 4,
    alignItems: 'center',
  },
  permissionPromptPending: {
    backgroundColor: colors.accentAmberLight,
    borderWidth: 1,
    borderColor: colors.accentAmber,
  },
  permissionPromptText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  permissionPromptTextPending: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    ...shadows.sm,
  },
  addButtonText: {
    color: colors.textInverted,
    fontSize: 14,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: 'center',
    textAlign: 'center',
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: radii.full,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyTitle: {
    ...typography.h3,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  emptyText: {
    ...typography.bodyMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  createFirstButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
    borderRadius: radii.lg,
    ...shadows.sm,
  },
  createFirstButtonText: {
    color: colors.textInverted,
    fontSize: 15,
    fontWeight: '700',
  },
});
