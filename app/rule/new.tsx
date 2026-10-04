import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import { router } from 'expo-router';
import { useRules, RuleForm } from '../../src/features/rules';
import { usePermissions } from '../../src/features/permissions';
import type { RuleInput, RuleValidationError } from '../../src/domain/validation';
import { colors } from '../../src/ui/theme';

export default function NewRuleScreen() {
  const { createRule, getAssignedApps } = useRules();
  const { allGranted } = usePermissions();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const assignedAppsMap = useMemo(() => getAssignedApps(), [getAssignedApps]);

  const handleSave = async (input: RuleInput): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      const result = await createRule(input);
      if (!result.ok) {
        let errorMsg = 'Unable to save rule.';
        if (Array.isArray(result.error)) {
          errorMsg = (result.error as readonly RuleValidationError[])
            .map((e) => e.message)
            .join('\n');
        } else if (result.error instanceof Error) {
          errorMsg = result.error.message;
        }
        Alert.alert('Unable to Save Rule', errorMsg);
        setIsSubmitting(false);
        return false;
      }

      if (!allGranted) {
        Alert.alert(
          'Rule Created — Permissions Needed',
          'To monitor apps and show mindful pauses, Android requires "Display Over Other Apps" and "Usage Access" permissions.',
          [
            {
              text: 'Done',
              style: 'cancel',
              onPress: () => router.replace('/'),
            },
            {
              text: 'Enable Permissions',
              onPress: () => router.replace('/onboarding/permissions'),
            },
          ]
        );
        return true;
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

  return (
    <View style={styles.container}>
      <RuleForm
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
});
