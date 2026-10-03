import React from 'react';
import ReactTestRenderer, { act, ReactTestInstance } from 'react-test-renderer';
import type { InterceptEvaluation } from '@/features/enforcement/types';

const mockReplace = jest.fn();
let mockParams: { app?: string; package?: string; reason?: string } = {
  package: 'com.instagram.android',
  app: 'Instagram',
};

jest.mock('expo-router', () => ({
  router: {
    replace: (...args: unknown[]) => mockReplace(...args),
  },
  useLocalSearchParams: () => mockParams,
}));

const mockEvaluateAppOpen = jest.fn();

jest.mock('@/features/enforcement', () => ({
  useEnforcement: () => ({
    evaluateAppOpen: mockEvaluateAppOpen,
    syncRulesToBlocker: jest.fn(),
    recordAppUsage: jest.fn(),
    drainIntercepts: jest.fn(),
    state: {
      monitoringActive: true,
      blockedPackages: ['com.instagram.android'],
      totalIntercepts: 0,
      lastSyncedAt: 1000,
    },
  }),
}));

const mockExitApp = jest.fn();

jest.mock('react-native', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactActual = require('react');
  return {
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
    },
    Text: (props: Record<string, unknown>) =>
      ReactActual.createElement('Text', props, props.children),
    View: (props: Record<string, unknown>) =>
      ReactActual.createElement('View', props, props.children),
    TouchableOpacity: (props: Record<string, unknown>) =>
      ReactActual.createElement('TouchableOpacity', props, props.children),
    ScrollView: (props: Record<string, unknown>) =>
      ReactActual.createElement('ScrollView', props, props.children),
    ActivityIndicator: (props: Record<string, unknown>) =>
      ReactActual.createElement('ActivityIndicator', props, null),
    BackHandler: {
      exitApp: mockExitApp,
    },
  };
});

// Import screen after mocks
import BlockedScreen from '../../app/blocked';

describe('BlockedScreen (Mindful Intervention & Lock Screen)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockParams = {
      package: 'com.instagram.android',
      app: 'Instagram',
    };
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('renders unrestricted state if app has no active restrictions', async () => {
    mockEvaluateAppOpen.mockResolvedValue({
      decision: { type: 'allow' },
      appName: 'Instagram',
      packageName: 'com.instagram.android',
    });

    let tree!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = ReactTestRenderer.create(<BlockedScreen />);
    });

    const root = tree.root;
    const textNodes = root.findAllByType('Text' as any);
    const hasUnrestrictedMsg = textNodes.some((n: ReactTestInstance) =>
      n.props.children?.toString().includes('No active restrictions')
    );
    expect(hasUnrestrictedMsg).toBe(true);

    const returnBtn = root
      .findAllByType('TouchableOpacity' as any)
      .find((t: ReactTestInstance) => t.props.accessibilityLabel === 'Return to home screen');
    expect(returnBtn).toBeDefined();

    act(() => {
      returnBtn?.props.onPress();
    });

    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('renders mindful intervention message with pause delay countdown', async () => {
    const showMessageEvaluation: InterceptEvaluation = {
      decision: {
        type: 'show_message',
        message: 'Take a deep breath before opening.',
        delaySeconds: 5,
      },
      appName: 'Instagram',
      packageName: 'com.instagram.android',
      rule: {
        id: 'r1',
        messages: ['Take a deep breath before opening.'],
        limitMinutes: 30,
        delaySeconds: 5,
        blockMinutes: 60,
        appIds: ['com.instagram.android'],
        enabled: true,
        schemaVersion: 1,
      },
      appState: {
        appId: 'com.instagram.android',
        ruleId: 'r1',
        usedTodaySeconds: 600, // 10 minutes
        usageDate: '2026-10-04',
      },
    };

    mockEvaluateAppOpen.mockResolvedValue(showMessageEvaluation);

    let tree!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = ReactTestRenderer.create(<BlockedScreen />);
    });

    const root = tree.root;

    // Verify mindful message is rendered
    const textNodes = root.findAllByType('Text' as any);
    const hasMindfulMessage = textNodes.some((n: ReactTestInstance) =>
      n.props.children?.toString().includes('Take a deep breath before opening.')
    );
    expect(hasMindfulMessage).toBe(true);

    // Continue button should initially be disabled while countdown is active
    let continueBtn = root
      .findAllByType('TouchableOpacity' as any)
      .find((t: ReactTestInstance) => t.props.accessibilityState?.disabled === true);
    expect(continueBtn).toBeDefined();

    // Advance timers step by step so each re-render queues the next tick
    for (let i = 0; i < 5; i++) {
      act(() => {
        jest.advanceTimersByTime(1000);
      });
    }

    // Continue button should now be enabled
    continueBtn = root
      .findAllByType('TouchableOpacity' as any)
      .find((t: ReactTestInstance) =>
        t.props.accessibilityLabel?.includes('Continue to Instagram')
      );
    expect(continueBtn).toBeDefined();
    expect(continueBtn?.props.accessibilityState?.disabled).toBe(false);

    // Pressing continue navigates
    act(() => {
      continueBtn?.props.onPress();
    });
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('handles Step Away action by calling BackHandler.exitApp', async () => {
    const showMessageEvaluation: InterceptEvaluation = {
      decision: {
        type: 'show_message',
        message: 'Mindful pause',
        delaySeconds: 10,
      },
      appName: 'Instagram',
      packageName: 'com.instagram.android',
    };

    mockEvaluateAppOpen.mockResolvedValue(showMessageEvaluation);

    let tree!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = ReactTestRenderer.create(<BlockedScreen />);
    });

    const root = tree.root;
    const stepAwayBtn = root
      .findAllByType('TouchableOpacity' as any)
      .find((t: ReactTestInstance) =>
        t.props.accessibilityLabel?.includes('Put down phone and step away')
      );
    expect(stepAwayBtn).toBeDefined();

    act(() => {
      stepAwayBtn?.props.onPress();
    });

    expect(mockExitApp).toHaveBeenCalled();
  });

  it('renders locked cooldown state when decision is lock', async () => {
    const futureLock = new Date('2026-10-04T12:00:00.000Z').getTime();
    const lockEvaluation: InterceptEvaluation = {
      decision: {
        type: 'lock',
        lockedUntil: futureLock,
      },
      appName: 'Instagram',
      packageName: 'com.instagram.android',
      rule: {
        id: 'r1',
        messages: ['Pause'],
        limitMinutes: 30,
        delaySeconds: 10,
        blockMinutes: 60,
        appIds: ['com.instagram.android'],
        enabled: true,
        schemaVersion: 1,
      },
    };

    mockEvaluateAppOpen.mockResolvedValue(lockEvaluation);

    let tree!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = ReactTestRenderer.create(<BlockedScreen />);
    });

    const root = tree.root;
    const textNodes = root.findAllByType('Text' as any);
    const hasLockHeading = textNodes.some((n: ReactTestInstance) =>
      n.props.children?.toString().includes('Daily Limit Reached')
    );
    expect(hasLockHeading).toBe(true);

    const rechargeBtn = root
      .findAllByType('TouchableOpacity' as any)
      .find((t: ReactTestInstance) =>
        t.props.accessibilityLabel?.includes('Close app and step away')
      );
    expect(rechargeBtn).toBeDefined();

    act(() => {
      rechargeBtn?.props.onPress();
    });

    expect(mockExitApp).toHaveBeenCalled();
  });
});
