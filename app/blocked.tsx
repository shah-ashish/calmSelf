import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  BackHandler,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useEnforcement } from '@/features/enforcement';
import type { InterceptEvaluation } from '@/features/enforcement/types';
import { resolveAppMetadata } from '@/features/rules/utils/appName';
import { colors, radii, shadows, spacing, typography } from '@/ui/theme';

export default function BlockedScreen() {
  const { app: appNameParam, package: packageNameParam } = useLocalSearchParams<{
    app?: string;
    package?: string;
    reason?: string;
  }>();

  const packageName = packageNameParam || '';
  const meta = useMemo(() => resolveAppMetadata(packageName), [packageName]);
  const displayName = appNameParam || meta.name;

  const { evaluateAppOpen, temporaryUnlock } = useEnforcement();
  const [evaluation, setEvaluation] = useState<InterceptEvaluation | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

  // Evaluate enforcement when screen mounts
  useEffect(() => {
    let isMounted = true;

    async function evaluate() {
      if (!packageName) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const result = await evaluateAppOpen(packageName);
        if (isMounted) {
          setEvaluation(result);
          if (result.decision.type === 'show_message') {
            setSecondsRemaining(result.decision.delaySeconds);
          }
          setLoading(false);
        }
      } catch {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void evaluate();

    return () => {
      isMounted = false;
    };
  }, [packageName, evaluateAppOpen]);

  // Countdown timer for pause delay
  useEffect(() => {
    if (secondsRemaining <= 0) return;

    const timer = setTimeout(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearTimeout(timer);
  }, [secondsRemaining]);

  const handleStepAway = useCallback(() => {
    // Primary mindful action: close app or go home
    if (BackHandler.exitApp) {
      BackHandler.exitApp();
    } else {
      router.replace('/');
    }
  }, []);

  const handleContinue = useCallback(async () => {
    // Grant temporary unlock on native watcher for the rule's limit
    if (evaluation?.rule) {
      const remainingMinutes = Math.max(1, evaluation.rule.limitMinutes);
      await temporaryUnlock(remainingMinutes);
    }
    // Return to the protected app
    if (BackHandler.exitApp) {
      BackHandler.exitApp();
    } else {
      router.replace('/');
    }
  }, [evaluation, temporaryUnlock]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingTitle}>Taking a mindful pause...</Text>
      </View>
    );
  }

  // Fallback if no package param was supplied or rule allows access
  if (!packageName || !evaluation || evaluation.decision.type === 'allow') {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.appIconLarge}>{meta.icon}</Text>
        <Text style={styles.title}>{displayName}</Text>
        <Text style={styles.subtitle}>No active restrictions on this application.</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.replace('/')}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Return to home screen"
        >
          <Text style={styles.primaryButtonText}>Return Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { decision, rule, appState } = evaluation;

  // 1. Locked State: Daily limit exceeded or active cooldown
  if (decision.type === 'lock') {
    const lockExpiryTime = new Date(decision.lockedUntil).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View style={styles.container}>
        <View style={styles.lockedCard}>
          <View style={styles.lockBadgeIconWrap}>
            <Text style={styles.lockBadgeEmoji}>🔒</Text>
          </View>

          <Text style={styles.lockedHeading}>Daily Limit Reached</Text>
          <Text style={styles.appTag}>
            {meta.icon} {displayName}
          </Text>

          <View style={styles.lockNoticeBox}>
            <Text style={styles.lockNoticeLabel}>Locked until</Text>
            <Text style={styles.lockNoticeTime}>{lockExpiryTime}</Text>
          </View>

          <Text style={styles.lockedMessage}>
            You have used all {rule?.limitMinutes ?? 30} minutes for today. Take a mindful break,
            recharge, and return once cooldown expires.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleStepAway}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Close app and step away"
          >
            <Text style={styles.primaryButtonText}>🌱 Step Away & Recharge</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 2. Intervention Message State: Pause delay and reflection
  const usedMinutes = appState ? Math.floor(appState.usedTodaySeconds / 60) : 0;
  const limitMinutes = rule?.limitMinutes ?? 30;
  const usageRatio = Math.min(1, limitMinutes > 0 ? usedMinutes / limitMinutes : 0);
  const canContinue = secondsRemaining === 0;

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.appHeaderRow}>
        <Text style={styles.appIconBadge}>{meta.icon}</Text>
        <View style={styles.appHeaderCol}>
          <Text style={styles.appNameHeading}>{displayName}</Text>
          <Text style={styles.appUsageRatio}>
            ⏱️ {usedMinutes} of {limitMinutes} min used today
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarTrack}>
        <View style={[styles.progressBarFill, { width: `${Math.round(usageRatio * 100)}%` }]} />
      </View>

      {/* Mindful Message Card */}
      <View style={styles.messageCard}>
        <Text style={styles.quoteDecor}>“</Text>
        <Text style={styles.mindfulMessageText}>{decision.message}</Text>
        <Text style={styles.messageAuthorLabel}>
          — A reminder from your past self
        </Text>
      </View>

      {/* Pause Countdown Indicator */}
      <View style={styles.countdownContainer}>
        {secondsRemaining > 0 ? (
          <View style={styles.timerBadge}>
            <Text style={styles.timerNumber}>{secondsRemaining}</Text>
            <Text style={styles.timerUnit}>seconds to reflect</Text>
          </View>
        ) : (
          <View style={[styles.timerBadge, styles.timerReadyBadge]}>
            <Text style={styles.timerReadyEmoji}>✨</Text>
            <Text style={styles.timerReadyText}>Ready when you are</Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.buttonStack}>
        {/* Primary Mindful Action: Step away */}
        <TouchableOpacity
          style={styles.stepAwayButton}
          onPress={handleStepAway}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Put down phone and step away"
        >
          <Text style={styles.stepAwayButtonText}>🌱 Put Down Phone & Focus</Text>
        </TouchableOpacity>

        {/* Secondary Action: Continue after delay */}
        <TouchableOpacity
          style={[styles.continueButton, !canContinue && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!canContinue}
          accessible
          accessibilityRole="button"
          accessibilityState={{ disabled: !canContinue }}
          accessibilityLabel={
            canContinue
              ? `Continue to ${displayName}`
              : `Wait ${secondsRemaining} seconds before continuing`
          }
        >
          <Text style={[styles.continueButtonText, !canContinue && styles.continueButtonTextDisabled]}>
            {canContinue ? `Continue to ${displayName}` : `Wait (${secondsRemaining}s)`}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
    justifyContent: 'center',
    minHeight: '100%',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingTitle: {
    ...typography.h3,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  appIconLarge: {
    fontSize: 56,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodyMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  lockedCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.lg,
  },
  lockBadgeIconWrap: {
    width: 64,
    height: 64,
    borderRadius: radii.full,
    backgroundColor: colors.dangerLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  lockBadgeEmoji: {
    fontSize: 32,
  },
  lockedHeading: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  appTag: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  lockNoticeBox: {
    backgroundColor: colors.dangerLight,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.md,
    width: '100%',
  },
  lockNoticeLabel: {
    ...typography.caption,
    color: colors.dangerText,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  lockNoticeTime: {
    ...typography.h1,
    color: colors.dangerText,
    fontSize: 26,
    fontWeight: '800',
  },
  lockedMessage: {
    ...typography.bodyMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  appHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  appIconBadge: {
    fontSize: 36,
    marginRight: spacing.md,
  },
  appHeaderCol: {
    flex: 1,
  },
  appNameHeading: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  appUsageRatio: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: colors.borderSubtle,
    borderRadius: radii.full,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radii.full,
  },
  messageCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.md,
  },
  quoteDecor: {
    fontSize: 48,
    color: colors.primary,
    lineHeight: 48,
    fontFamily: 'serif',
  },
  mindfulMessageText: {
    ...typography.body,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600',
    color: colors.textPrimary,
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },
  messageAuthorLabel: {
    ...typography.caption,
    color: colors.primaryDark,
    fontWeight: '600',
  },
  countdownContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentAmberLight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.full,
  },
  timerReadyBadge: {
    backgroundColor: colors.primaryLight,
  },
  timerNumber: {
    ...typography.h3,
    color: '#B45309',
    fontWeight: '800',
    marginRight: spacing.xs,
  },
  timerUnit: {
    ...typography.caption,
    color: '#92400E',
    fontWeight: '600',
  },
  timerReadyEmoji: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  timerReadyText: {
    ...typography.caption,
    color: colors.primaryDark,
    fontWeight: '700',
  },
  buttonStack: {
    gap: spacing.md,
  },
  stepAwayButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    ...shadows.md,
  },
  stepAwayButtonText: {
    ...typography.button,
    color: colors.textInverted,
    fontSize: 16,
  },
  continueButton: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  continueButtonDisabled: {
    backgroundColor: colors.backgroundSubtle,
    borderColor: colors.borderSubtle,
  },
  continueButtonText: {
    ...typography.button,
    color: colors.textPrimary,
  },
  continueButtonTextDisabled: {
    color: colors.textMuted,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    ...shadows.md,
    width: '100%',
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.textInverted,
  },
});
