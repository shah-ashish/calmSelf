import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { colors, radii, shadows, spacing, typography } from '../../src/ui/theme';

export default function EditRuleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Edit Protection Rule</Text>
        <Text style={styles.subtitle}>Rule ID: {id}</Text>
        <Text style={styles.note}>
          Rule editing with asymmetric change policy will be implemented in Milestone 6.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    ...shadows.md,
  },
  title: {
    ...typography.h2,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.caption,
    color: colors.primaryDark,
    marginBottom: spacing.sm,
  },
  note: {
    ...typography.bodyMuted,
  },
});
