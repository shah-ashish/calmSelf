import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, radii, shadows, spacing, typography } from '../src/ui/theme';
import { usePermissions } from '../src/features/permissions';
import { useRules, RuleCard, EmptyRulesView } from '../src/features/rules';
import type { Rule } from '../src/domain/types';

export default function HomeScreen() {
  const router = useRouter();
  const { allGranted, checkPermissions } = usePermissions();
  const { rules, appStates, refresh, toggleRule, undoPending, deleteRule } = useRules();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([checkPermissions(), refresh()]);
    } finally {
      setRefreshing(false);
    }
  }, [checkPermissions, refresh]);

  const handleToggle = useCallback(
    async (rule: Rule) => {
      await toggleRule(rule.id);
    },
    [toggleRule]
  );

  const handleUndoPending = useCallback(
    async (rule: Rule) => {
      await undoPending(rule.id);
    },
    [undoPending]
  );

  const handleEdit = useCallback(
    (rule: Rule) => {
      router.push(`/rule/${rule.id}`);
    },
    [router]
  );

  const handleDelete = useCallback(
    (rule: Rule) => {
      Alert.alert(
        'Delete Rule?',
        'Are you sure you want to delete this protection rule? This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              void deleteRule(rule.id);
            },
          },
        ]
      );
    },
    [deleteRule]
  );

  const handleCreateRule = useCallback(() => {
    router.push('/rule/new');
  }, [router]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      {/* Mindful Welcome & Permissions Safeguard Banner */}
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
          accessibilityLabel={
            allGranted ? 'View system permissions, all active' : 'Permissions needed, tap to setup'
          }
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
        <View style={styles.titleContainer}>
          <Text style={styles.sectionTitle}>Active Protection Rules</Text>
          {rules.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{rules.length}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={handleCreateRule}
          activeOpacity={0.8}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Add new rule"
          accessibilityHint="Navigates to the rule creation screen"
        >
          <Text style={styles.addButtonText}>+ New Rule</Text>
        </TouchableOpacity>
      </View>

      {/* Rules List or Empty State */}
      {rules.length === 0 ? (
        <EmptyRulesView onCreateRule={handleCreateRule} />
      ) : (
        rules.map((rule) => (
          <RuleCard
            key={rule.id}
            rule={rule}
            appStates={appStates}
            onToggle={handleToggle}
            onUndoPending={handleUndoPending}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))
      )}
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
    color: '#92400E',
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
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    ...typography.h3,
  },
  countBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.xs + 3,
    paddingVertical: 2,
    borderRadius: radii.full,
    marginLeft: spacing.xs + 2,
  },
  countBadgeText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primaryDark,
    fontSize: 11,
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
});
