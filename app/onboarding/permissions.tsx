import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, radii, shadows, spacing, typography } from '../../src/ui/theme';

export default function PermissionsScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Android Safeguard Permissions</Text>
        <Text style={styles.cardSubtitle}>
          Calm Self runs locally and privately on your device. To show intervention messages and
          manage app limits, the system requires two core permissions:
        </Text>

        <View style={styles.permBlock}>
          <Text style={styles.permName}>1. Display Over Other Apps</Text>
          <Text style={styles.permDescription}>
            Allows Calm Self to display your mindful intervention messages when opening protected
            apps.
          </Text>
        </View>

        <View style={styles.permBlock}>
          <Text style={styles.permName}>2. Usage Access</Text>
          <Text style={styles.permDescription}>
            Allows detecting when a protected app transitions to the foreground to calculate daily
            time limits.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Text style={styles.doneButtonText}>Done</Text>
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
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    ...shadows.md,
  },
  cardTitle: {
    ...typography.h2,
    marginBottom: spacing.xs,
  },
  cardSubtitle: {
    ...typography.bodyMuted,
    marginBottom: spacing.lg,
  },
  permBlock: {
    backgroundColor: colors.backgroundSubtle,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  permName: {
    ...typography.h3,
    fontSize: 16,
    marginBottom: spacing.xs,
  },
  permDescription: {
    ...typography.bodyMuted,
  },
  doneButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  doneButtonText: {
    color: colors.textInverted,
    fontSize: 15,
    fontWeight: '700',
  },
});
