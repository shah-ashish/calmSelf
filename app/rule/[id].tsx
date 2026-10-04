import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useRules, RuleForm } from '../../src/features/rules';
import type { RuleInput, RuleValidationError } from '../../src/domain/validation';
import { colors, radii, spacing, typography } from '../../src/ui/theme';

export default function EditRuleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getRuleById, updateRule, getAssignedApps, loading } = useRules();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const rule = id ? getRuleById(id) : undefined;
  const assignedAppsMap = useMemo(
    () => (id ? getAssignedApps(id) : new Map<string, string>()),
    [getAssignedApps, id]
  );

  const handleSave = async (input: RuleInput): Promise<boolean> => {
    if (!id) return false;

    setIsSubmitting(true);
    try {
      const result = await updateRule(id, input);
      if (!result.ok) {
        let errorMsg = 'Unable to save changes.';
        if (Array.isArray(result.error)) {
          errorMsg = (result.error as readonly RuleValidationError[])
            .map((e) => e.message)
            .join('\n');
        } else if (result.error instanceof Error) {
          errorMsg = result.error.message;
        }
        Alert.alert('Unable to Save Changes', errorMsg);
        setIsSubmitting(false);
        return false;
      }

      router.replace('/');
      return true;
    } catch (err) {
      Alert.alert(
        'Unexpected Error',
        err instanceof Error ? err.message : 'An unknown error occurred while saving the rule.'
      );
      setIsSubmitting(false);
      return false;
    }
  };

  const handleCancel = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  if (!rule) {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading rule configuration...</Text>
        </View>
      );
    }

    return (
      <View style={styles.centerContainer}>
        <Text style={styles.notFoundIcon}>🔍</Text>
        <Text style={styles.notFoundTitle}>Rule Not Found</Text>
        <Text style={styles.notFoundSubtitle}>
          The requested protection rule does not exist or was deleted.
        </Text>
        <TouchableOpacity
          style={styles.returnButton}
          onPress={() => router.replace('/')}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Return to home screen"
        >
          <Text style={styles.returnButtonText}>Return to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <RuleForm
        initialRule={rule}
        assignedAppsMap={assignedAppsMap}
        onSave={handleSave}
        onCancel={handleCancel}
        onOpenPermissions={() => router.push('/onboarding/permissions')}
        isSubmitting={isSubmitting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.bodyMuted,
    marginTop: spacing.md,
  },
  notFoundIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  notFoundTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  notFoundSubtitle: {
    ...typography.bodyMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  returnButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  returnButtonText: {
    ...typography.button,
    color: colors.textInverted,
  },
});
