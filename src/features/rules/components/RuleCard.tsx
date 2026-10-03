import React from 'react';
import { StyleSheet, Text, View, Switch, TouchableOpacity } from 'react-native';
import type { Rule, AppState } from '@/domain/types';
import { colors, radii, shadows, spacing, typography } from '@/ui/theme';
import { AppUsageBadge } from './AppUsageBadge';

export interface RuleCardProps {
  readonly rule: Rule;
  readonly appStates: Record<string, AppState>;
  readonly onToggle: (rule: Rule) => void;
  readonly onUndoPending: (rule: Rule) => void;
  readonly onEdit: (rule: Rule) => void;
  readonly onDelete: (rule: Rule) => void;
}

export function RuleCard({
  rule,
  appStates,
  onToggle,
  onUndoPending,
  onEdit,
  onDelete,
}: RuleCardProps) {
  const firstMessage = rule.messages[0] || 'Take a deep breath before opening this app.';
  const extraMessagesCount = rule.messages.length - 1;

  // Generate pending change description
  let pendingMessage = '';
  if (rule.pendingChange) {
    const { patch } = rule.pendingChange;
    if (patch.enabled === false) {
      pendingMessage = 'Turning off tomorrow at midnight';
    } else if (patch.limitMinutes !== undefined) {
      pendingMessage = `Limit changing to ${patch.limitMinutes}m tomorrow`;
    } else if (patch.delaySeconds !== undefined) {
      pendingMessage = `Pause delay changing to ${patch.delaySeconds}s tomorrow`;
    } else if (patch.blockMinutes !== undefined) {
      pendingMessage = `Lock duration changing to ${patch.blockMinutes}m tomorrow`;
    } else if (patch.appIds !== undefined) {
      pendingMessage = 'Apps list updating tomorrow';
    } else {
      pendingMessage = 'Changes taking effect tomorrow';
    }
  }

  return (
    <View
      style={[styles.card, !rule.enabled && styles.cardDisabled]}
      accessible={true}
      accessibilityRole="none"
      accessibilityLabel={`Rule: ${firstMessage}. Limit ${rule.limitMinutes} minutes. Status: ${
        rule.enabled ? 'Active' : 'Disabled'
      }`}
    >
      {/* Top Bar: Status switch & Title Header */}
      <View style={styles.topRow}>
        <View style={styles.headerInfo}>
          <View style={styles.statusPill}>
            <View
              style={[
                styles.statusDot,
                rule.enabled ? styles.statusDotActive : styles.statusDotDisabled,
              ]}
            />
            <Text style={styles.statusText}>
              {rule.enabled ? 'ACTIVE SAFEGUARD' : 'PAUSED'}
            </Text>
          </View>
        </View>

        <View style={styles.switchWrapper}>
          <Switch
            value={rule.enabled}
            onValueChange={() => onToggle(rule)}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={rule.enabled ? colors.surface : '#CBD5E1'}
            accessible={true}
            accessibilityRole="switch"
            accessibilityLabel={`Toggle rule safeguard. Currently ${
              rule.enabled ? 'enabled' : 'disabled'
            }`}
            accessibilityHint={
              rule.enabled
                ? 'Turns rule off tomorrow at local midnight'
                : 'Turns rule on immediately'
            }
          />
        </View>
      </View>

      {/* Message Preview */}
      <View style={styles.messageBox}>
        <Text style={styles.quoteMark}>“</Text>
        <Text style={styles.messageText} numberOfLines={2}>
          {firstMessage}
        </Text>
        {extraMessagesCount > 0 && (
          <View style={styles.extraBadge}>
            <Text style={styles.extraBadgeText}>+{extraMessagesCount} more</Text>
          </View>
        )}
      </View>

      {/* Summary Line: Limit, Delay, Block Duration */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryBadge, styles.badgeLimit]}>
          <Text style={styles.summaryBadgeText}>⏱️ {rule.limitMinutes}m limit</Text>
        </View>
        <View style={[styles.summaryBadge, styles.badgeDelay]}>
          <Text style={styles.summaryBadgeText}>⏳ {rule.delaySeconds}s delay</Text>
        </View>
        <View style={[styles.summaryBadge, styles.badgeLock]}>
          <Text style={styles.summaryBadgeText}>🔒 {rule.blockMinutes}m lock</Text>
        </View>
      </View>

      {/* Pending Change Banner (Asymmetric Loosening Policy) */}
      {rule.pendingChange && (
        <View style={styles.pendingBanner}>
          <View style={styles.pendingInfo}>
            <Text style={styles.pendingIcon}>⏳</Text>
            <View style={styles.pendingTextContainer}>
              <Text style={styles.pendingTitle}>Change Pending</Text>
              <Text style={styles.pendingSub}>{pendingMessage}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.undoButton}
            onPress={() => onUndoPending(rule)}
            activeOpacity={0.8}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Undo pending change"
            accessibilityHint="Reverts the scheduled change immediately"
          >
            <Text style={styles.undoButtonText}>Undo</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Connected Apps & Usage Section */}
      <View style={styles.appsSection}>
        <Text style={styles.appsSectionTitle}>Protected Apps & Today’s Usage</Text>
        {rule.appIds.length === 0 ? (
          <Text style={styles.noAppsText}>No apps connected yet.</Text>
        ) : (
          rule.appIds.map((appId) => (
            <AppUsageBadge
              key={appId}
              appId={appId}
              limitMinutes={rule.limitMinutes}
              appState={appStates[appId]}
            />
          ))
        )}
      </View>

      {/* Card Actions: Edit & Delete */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => onEdit(rule)}
          activeOpacity={0.8}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Edit rule settings"
        >
          <Text style={styles.editButtonText}>✏️ Edit Rule</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => onDelete(rule)}
          activeOpacity={0.8}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Delete rule"
          accessibilityHint="Asks for confirmation before deleting"
        >
          <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.md + 4,
    marginBottom: spacing.md,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  cardDisabled: {
    opacity: 0.85,
    backgroundColor: '#FAFAFC',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: radii.full,
    marginRight: 6,
  },
  statusDotActive: {
    backgroundColor: colors.primary,
  },
  statusDotDisabled: {
    backgroundColor: colors.textMuted,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.5,
    color: colors.textSecondary,
  },
  switchWrapper: {
    transform: [{ scale: 0.9 }],
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.backgroundSubtle,
    borderRadius: radii.md,
    padding: spacing.sm + 2,
    marginVertical: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  quoteMark: {
    fontSize: 20,
    lineHeight: 22,
    color: colors.primary,
    fontWeight: '700',
    marginRight: 4,
  },
  messageText: {
    ...typography.body,
    fontStyle: 'italic',
    color: colors.textPrimary,
    flex: 1,
    lineHeight: 20,
  },
  extraBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radii.xs,
    marginLeft: spacing.xs,
    alignSelf: 'center',
  },
  extraBadgeText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primaryText,
    fontSize: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  summaryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  badgeLimit: {
    backgroundColor: colors.secondaryLight,
  },
  badgeDelay: {
    backgroundColor: colors.accentAmberLight,
  },
  badgeLock: {
    backgroundColor: colors.accentPurpleLight,
  },
  summaryBadgeText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textPrimary,
    fontSize: 12,
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.accentAmberLight,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  pendingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  pendingIcon: {
    fontSize: 18,
    marginRight: spacing.xs + 2,
  },
  pendingTextContainer: {
    flex: 1,
  },
  pendingTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: '#92400E',
  },
  pendingSub: {
    ...typography.caption,
    color: '#B45309',
    fontSize: 11,
  },
  undoButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 4,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  undoButtonText: {
    ...typography.caption,
    fontWeight: '700',
    color: '#92400E',
  },
  appsSection: {
    marginBottom: spacing.md,
  },
  appsSectionTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.xs + 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 11,
  },
  noAppsText: {
    ...typography.caption,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: spacing.sm + 2,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
    borderRadius: radii.md,
  },
  editButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    fontSize: 13,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 3,
    borderRadius: radii.md,
  },
  deleteButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.danger,
    fontSize: 13,
  },
});
