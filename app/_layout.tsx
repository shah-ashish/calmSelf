import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors, radii, shadows, spacing, typography } from '../src/ui/theme';
import { useAppLifecycle } from '../src/features/lifecycle';

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorIcon}>🌱</Text>
      <Text style={styles.errorTitle}>Take a Mindful Breath</Text>
      <Text style={styles.errorMessage}>
        Calm Self encountered an unexpected issue, but your rules and settings are completely safe on
        your device.
      </Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={retry}
        activeOpacity={0.8}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Try again and recover"
      >
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function RootLayout() {
  useAppLifecycle();

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.surface,
          },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: {
            fontWeight: '700',
          },
          contentStyle: {
            backgroundColor: colors.background,
          },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'Calm Self',
            headerLargeTitle: false,
          }}
        />
        <Stack.Screen
          name="onboarding/permissions"
          options={{
            title: 'Permissions',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="rule/new"
          options={{
            title: 'Create Rule',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="rule/[id]"
          options={{
            title: 'Edit Rule',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="blocked"
          options={{
            title: 'Mindful Pause',
            headerShown: false,
            presentation: 'fullScreenModal',
          }}
        />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorIcon: {
    fontSize: 56,
    marginBottom: spacing.md,
  },
  errorTitle: {
    ...typography.h2,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  errorMessage: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    maxWidth: 320,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.xl,
    ...shadows.sm,
  },
  retryButtonText: {
    ...typography.button,
    color: colors.surface,
  },
});
