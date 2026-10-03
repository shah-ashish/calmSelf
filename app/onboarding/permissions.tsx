import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, radii, shadows, spacing, typography } from '../../src/ui/theme';
import {
  usePermissions,
  PermissionItemCard,
  PermissionStatusBanner,
} from '../../src/features/permissions';

export default function PermissionsScreen() {
  const router = useRouter();
  const { status, allGranted, requestOverlay, requestUsageAccess } = usePermissions();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Status Overview Banner */}
      <PermissionStatusBanner
        allGranted={allGranted}
        overlayGranted={status.overlayGranted}
        usageAccessGranted={status.usageAccessGranted}
      />

      {/* Intro Header */}
      <View style={styles.introCard}>
        <Text style={styles.introTitle}>Private & Local Safeguards</Text>
        <Text style={styles.introSubtitle}>
          Calm Self runs 100% on your device with no internet access. To show your mindful pause
          overlay and track your focus limits, Android requires two specific system permissions:
        </Text>
      </View>

      {/* 1. Display Over Other Apps */}
      <PermissionItemCard
        title="Display Over Other Apps"
        icon="✨"
        isGranted={status.overlayGranted}
        whyNeeded="Allows Calm Self to draw your mindful intervention messages and the countdown pause overlay directly over protected apps when you open them."
        onOpenSettings={requestOverlay}
        testID="permission-card-overlay"
      />

      {/* 2. Usage Access */}
      <PermissionItemCard
        title="Usage Access"
        icon="⏱️"
        isGranted={status.usageAccessGranted}
        whyNeeded="Allows Calm Self to detect when a protected app transitions to the foreground to calculate your daily time limit and trigger lock durations."
        onOpenSettings={requestUsageAccess}
        testID="permission-card-usage"
      />

      {/* Privacy Guarantee Note */}
      <View style={styles.privacyNote}>
        <Text style={styles.privacyNoteIcon}>🔒</Text>
        <Text style={styles.privacyNoteText}>
          <Text style={styles.privacyNoteBold}>Privacy Guarantee: </Text>
          Your message text, app usage, and habits are stored strictly on your phone and never
          transmitted anywhere.
        </Text>
      </View>

      {/* Optional / Denied Guidance */}
      {!allGranted && (
        <View style={styles.deniedNotice}>
          <Text style={styles.deniedNoticeTitle}>Permissions are optional</Text>
          <Text style={styles.deniedNoticeText}>
            You can still browse and configure rules without granting permissions now. Active
            interventions will start once both permissions are enabled in Android Settings.
          </Text>
        </View>
      )}

      {/* Done Button */}
      <TouchableOpacity
        style={styles.doneButton}
        onPress={() => router.back()}
        activeOpacity={0.8}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Done and return to home"
        accessibilityHint="Navigates back to the Calm Self home screen"
      >
        <Text style={styles.doneButtonText}>Done & Return to Home</Text>
      </TouchableOpacity>
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
    paddingBottom: spacing.xxl,
  },
  introCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  introTitle: {
    ...typography.h2,
    fontSize: 20,
    marginBottom: spacing.xs,
  },
  introSubtitle: {
    ...typography.bodyMuted,
    lineHeight: 22,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSubtle,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  privacyNoteIcon: {
    fontSize: 20,
    marginRight: spacing.sm + 2,
  },
  privacyNoteText: {
    ...typography.bodyMuted,
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  privacyNoteBold: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  deniedNotice: {
    backgroundColor: colors.accentAmberLight,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.accentAmber,
  },
  deniedNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  deniedNoticeText: {
    ...typography.bodyMuted,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  doneButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
    ...shadows.sm,
  },
  doneButtonText: {
    color: colors.textInverted,
    fontSize: 16,
    fontWeight: '700',
  },
});
