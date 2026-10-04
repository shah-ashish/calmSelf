import React from 'react';
import ReactTestRenderer, { act, ReactTestInstance } from 'react-test-renderer';
import type { Rule } from '@/domain/types';
import { ok, err } from '@/lib/result';

const mockReplace = jest.fn();
const mockBack = jest.fn();
let mockParams: { id?: string } = { id: 'test-rule-1' };

jest.mock('expo-router', () => ({
  router: {
    replace: (...args: unknown[]) => mockReplace(...args),
    back: (...args: unknown[]) => mockBack(...args),
    canGoBack: () => true,
  },
  useLocalSearchParams: () => mockParams,
}));

const mockCreateRule = jest.fn();
const mockUpdateRule = jest.fn();
const mockGetRuleById = jest.fn();
const mockGetAssignedApps = jest.fn().mockReturnValue(new Map());

jest.mock('@/features/rules', () => {
  const actual = jest.requireActual('@/features/rules');
  return {
    ...actual,
    useRules: () => ({
      createRule: mockCreateRule,
      updateRule: mockUpdateRule,
      getRuleById: mockGetRuleById,
      getAssignedApps: mockGetAssignedApps,
      rules: [],
      appStates: {},
      loading: false,
      error: null,
      refresh: jest.fn(),
      toggleRule: jest.fn(),
      undoPending: jest.fn(),
      deleteRule: jest.fn(),
    }),
  };
});

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
    TextInput: (props: Record<string, unknown>) =>
      ReactActual.createElement('TextInput', props, null),
    ScrollView: (props: Record<string, unknown>) =>
      ReactActual.createElement('ScrollView', props, props.children),
    KeyboardAvoidingView: (props: Record<string, unknown>) =>
      ReactActual.createElement('KeyboardAvoidingView', props, props.children),
    ActivityIndicator: (props: Record<string, unknown>) =>
      ReactActual.createElement('ActivityIndicator', props, null),
    Platform: {
      OS: 'android',
      select: (obj: Record<string, unknown>) => obj.android ?? obj.default,
    },
    Alert: {
      alert: jest.fn(),
    },
    Image: (props: Record<string, unknown>) =>
      ReactActual.createElement('Image', props, null),
  };
});

jest.mock('@/features/permissions', () => ({
  usePermissions: () => ({
    allGranted: true,
    status: {
      overlayGranted: true,
      usageAccessGranted: true,
      notificationsGranted: true,
    },
    checkPermissions: jest.fn().mockResolvedValue(true),
    requestOverlay: jest.fn(),
    requestUsageAccess: jest.fn(),
  }),
}));

// Import screens after mocks
import NewRuleScreen from '../../app/rule/new';
import EditRuleScreen from '../../app/rule/[id]';

describe('Rule Screens Integration', () => {
  const existingRule: Rule = {
    id: 'test-rule-1',
    messages: ['Pause message'],
    limitMinutes: 30,
    delaySeconds: 10,
    blockMinutes: 60,
    appIds: ['com.instagram.android'],
    enabled: true,
    schemaVersion: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = { id: 'test-rule-1' };
  });

  describe('NewRuleScreen', () => {
    it('renders NewRuleScreen and handles successful save', async () => {
      mockCreateRule.mockResolvedValue(ok(existingRule));

      let tree!: ReactTestRenderer.ReactTestRenderer;
      act(() => {
        tree = ReactTestRenderer.create(<NewRuleScreen />);
      });

      const root = tree.root;
      const saveBtn = root
        .findAllByType('TouchableOpacity' as any)
        .find((t: ReactTestInstance) => t.props.accessibilityLabel === 'Create protection rule');
      expect(saveBtn).toBeDefined();

      await act(async () => {
        await saveBtn?.props.onPress();
      });

      expect(mockCreateRule).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith('/');
    });

    it('handles cancel in NewRuleScreen', () => {
      let tree!: ReactTestRenderer.ReactTestRenderer;
      act(() => {
        tree = ReactTestRenderer.create(<NewRuleScreen />);
      });

      const root = tree.root;
      const cancelBtn = root
        .findAllByType('TouchableOpacity' as any)
        .find((t: ReactTestInstance) => t.props.accessibilityLabel === 'Cancel and return to home');

      act(() => {
        cancelBtn?.props.onPress();
      });

      expect(mockBack).toHaveBeenCalled();
    });

    it('shows alert when createRule fails', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Alert } = require('react-native');
      mockCreateRule.mockResolvedValue(err(new Error('Storage failure')));

      let tree!: ReactTestRenderer.ReactTestRenderer;
      act(() => {
        tree = ReactTestRenderer.create(<NewRuleScreen />);
      });

      const root = tree.root;
      const saveBtn = root
        .findAllByType('TouchableOpacity' as any)
        .find((t: ReactTestInstance) => t.props.accessibilityLabel === 'Create protection rule');

      await act(async () => {
        await saveBtn?.props.onPress();
      });

      expect(Alert.alert).toHaveBeenCalledWith('Unable to Save Rule', 'Storage failure');
    });
  });

  describe('EditRuleScreen', () => {
    it('shows Rule Not Found state when rule does not exist', () => {
      mockGetRuleById.mockReturnValue(undefined);

      let tree!: ReactTestRenderer.ReactTestRenderer;
      act(() => {
        tree = ReactTestRenderer.create(<EditRuleScreen />);
      });

      const root = tree.root;
      const textNodes = root.findAllByType('Text' as any);
      expect(
        textNodes.some((n: ReactTestInstance) =>
          n.props.children?.toString().includes('Rule Not Found')
        )
      ).toBe(true);

      // Return button works
      const returnBtn = root
        .findAllByType('TouchableOpacity' as any)
        .find((t: ReactTestInstance) => t.props.accessibilityLabel === 'Return to home screen');

      act(() => {
        returnBtn?.props.onPress();
      });

      expect(mockReplace).toHaveBeenCalledWith('/');
    });

    it('renders EditRuleScreen with rule and handles successful update', async () => {
      mockGetRuleById.mockReturnValue(existingRule);
      mockUpdateRule.mockResolvedValue(ok(existingRule));

      let tree!: ReactTestRenderer.ReactTestRenderer;
      act(() => {
        tree = ReactTestRenderer.create(<EditRuleScreen />);
      });

      const root = tree.root;
      const saveBtn = root
        .findAllByType('TouchableOpacity' as any)
        .find((t: ReactTestInstance) => t.props.accessibilityLabel === 'Save rule changes');
      expect(saveBtn).toBeDefined();

      await act(async () => {
        await saveBtn?.props.onPress();
      });

      expect(mockUpdateRule).toHaveBeenCalledWith('test-rule-1', expect.any(Object));
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });
});
