import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../src/ui/theme';

export default function RootLayout() {
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
      </Stack>
    </>
  );
}
