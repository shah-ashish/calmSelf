import React from 'react';
import ReactTestRenderer, { act, ReactTestInstance } from 'react-test-renderer';
import { EmptyRulesView } from '@/features/rules/components/EmptyRulesView';
import { AppUsageBadge } from '@/features/rules/components/AppUsageBadge';
import { RuleCard } from '@/features/rules/components/RuleCard';
import type { Rule, AppState } from '@/domain/types';

jest.mock('react-native', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactActual = require('react');
  return {
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
    },
    Text: (props: Record<string, unknown>) => ReactActual.createElement('Text', props, props.children),
    View: (props: Record<string, unknown>) => ReactActual.createElement('View', props, props.children),
    TouchableOpacity: (props: Record<string, unknown>) =>
      ReactActual.createElement('TouchableOpacity', props, props.children),
    Switch: (props: Record<string, unknown>) => ReactActual.createElement('Switch', props, null),
    ScrollView: (props: Record<string, unknown>) =>
      ReactActual.createElement('ScrollView', props, props.children),
    Alert: {
      alert: jest.fn(),
    },
    RefreshControl: (props: Record<string, unknown>) =>
      ReactActual.createElement('RefreshControl', props, null),
  };
});

describe('Rules UI Components', () => {
  describe('EmptyRulesView', () => {
    it('renders mindful empty state and handles create rule CTA', () => {
      const onCreateRule = jest.fn();
      let tree: ReactTestRenderer.ReactTestRenderer;

      act(() => {
        tree = ReactTestRenderer.create(<EmptyRulesView onCreateRule={onCreateRule} />);
      });

      const root = tree!.root;
      // Check title exists
      const texts = root.findAllByType('Text' as any).map((t: ReactTestInstance) => t.props.children);
      expect(texts).toContain('Cultivate Mindful Habits');

      // Find and press CTA button
      const touchables = root.findAllByType('TouchableOpacity' as any);
      expect(touchables.length).toBeGreaterThan(0);
      act(() => {
        touchables[0].props.onPress();
      });

      expect(onCreateRule).toHaveBeenCalledTimes(1);
    });
  });

  describe('AppUsageBadge', () => {
    it('renders friendly app metadata and usage progress for unlocked app', () => {
      const appState: AppState = {
        appId: 'com.instagram.android',
        ruleId: 'r1',
        usedTodaySeconds: 720, // 12 minutes
        usageDate: '2026-10-03',
      };

      let tree: ReactTestRenderer.ReactTestRenderer;
      act(() => {
        tree = ReactTestRenderer.create(
          <AppUsageBadge appId="com.instagram.android" limitMinutes={30} appState={appState} now={1000} />
        );
      });

      const root = tree!.root;
      const texts = root.findAllByType('Text' as any).map((t: ReactTestInstance) => t.props.children);
      expect(texts).toContain('Instagram');
      expect(texts).toContain('📸');
      expect(texts).toContain(12);
    });

    it('renders locked indicator when app is actively locked', () => {
      const futureLock = 2000000000000;
      const appState: AppState = {
        appId: 'com.google.android.youtube',
        ruleId: 'r1',
        usedTodaySeconds: 1800,
        usageDate: '2026-10-03',
        lockedUntil: futureLock,
      };

      let tree: ReactTestRenderer.ReactTestRenderer;
      act(() => {
        tree = ReactTestRenderer.create(
          <AppUsageBadge
            appId="com.google.android.youtube"
            limitMinutes={30}
            appState={appState}
            now={1000}
          />
        );
      });

      const root = tree!.root;
      const texts = root.findAllByType('Text' as any).map((t: ReactTestInstance) => t.props.children);
      expect(texts).toContain('YouTube');
      // Should show locked indicator in text
      const allText = texts.flat(2).join(' ');
      expect(allText).toContain('Locked');
    });
  });

  describe('RuleCard', () => {
    const baseRule: Rule = {
      id: 'rule-test-1',
      messages: ['Be present today', 'Remember your goals'],
      limitMinutes: 45,
      delaySeconds: 15,
      blockMinutes: 90,
      appIds: ['com.instagram.android', 'com.reddit.frontpage'],
      enabled: true,
      schemaVersion: 1,
    };

    const appStates: Record<string, AppState> = {
      'com.instagram.android': {
        appId: 'com.instagram.android',
        ruleId: 'rule-test-1',
        usedTodaySeconds: 900, // 15 min
        usageDate: '2026-10-03',
      },
    };

    it('renders message preview, +N badge, and summary line', () => {
      let tree: ReactTestRenderer.ReactTestRenderer;
      act(() => {
        tree = ReactTestRenderer.create(
          <RuleCard
            rule={baseRule}
            appStates={appStates}
            onToggle={jest.fn()}
            onUndoPending={jest.fn()}
            onEdit={jest.fn()}
            onDelete={jest.fn()}
          />
        );
      });

      const root = tree!.root;
      const texts = root.findAllByType('Text' as any).map((t: ReactTestInstance) => t.props.children);
      const allText = texts.flat(2).join(' ');

      expect(allText).toContain('Be present today');
      expect(allText).toContain('more');
      expect(allText).toContain('limit');
      expect(allText).toContain('delay');
      expect(allText).toContain('lock');
    });

    it('triggers onToggle, onEdit, and onDelete actions', () => {
      const onToggle = jest.fn();
      const onEdit = jest.fn();
      const onDelete = jest.fn();

      let tree: ReactTestRenderer.ReactTestRenderer;
      act(() => {
        tree = ReactTestRenderer.create(
          <RuleCard
            rule={baseRule}
            appStates={appStates}
            onToggle={onToggle}
            onUndoPending={jest.fn()}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        );
      });

      const root = tree!.root;

      // Switch toggle
      const switches = root.findAllByType('Switch' as any);
      expect(switches.length).toBe(1);
      act(() => {
        switches[0].props.onValueChange();
      });
      expect(onToggle).toHaveBeenCalledWith(baseRule);

      // Buttons
      const touchables = root.findAllByType('TouchableOpacity' as any);
      // Find edit button
      const editButton = touchables.find(
        (t: ReactTestInstance) => t.props.accessibilityLabel === 'Edit rule settings'
      );
      expect(editButton).toBeDefined();
      act(() => {
        editButton!.props.onPress();
      });
      expect(onEdit).toHaveBeenCalledWith(baseRule);

      // Find delete button
      const deleteButton = touchables.find(
        (t: ReactTestInstance) => t.props.accessibilityLabel === 'Delete rule'
      );
      expect(deleteButton).toBeDefined();
      act(() => {
        deleteButton!.props.onPress();
      });
      expect(onDelete).toHaveBeenCalledWith(baseRule);
    });

    it('renders pending change banner with Undo action when rule has pendingChange', () => {
      const onUndoPending = jest.fn();
      const ruleWithPending: Rule = {
        ...baseRule,
        pendingChange: {
          patch: { enabled: false },
          effectiveAt: 2000000000000,
        },
      };

      let tree: ReactTestRenderer.ReactTestRenderer;
      act(() => {
        tree = ReactTestRenderer.create(
          <RuleCard
            rule={ruleWithPending}
            appStates={appStates}
            onToggle={jest.fn()}
            onUndoPending={onUndoPending}
            onEdit={jest.fn()}
            onDelete={jest.fn()}
          />
        );
      });

      const root = tree!.root;
      const texts = root.findAllByType('Text' as any).map((t: ReactTestInstance) => t.props.children);
      const allText = texts.flat(2).join(' ');

      expect(allText).toContain('Turning off tomorrow at midnight');
      expect(allText).toContain('Undo');

      const undoButton = root
        .findAllByType('TouchableOpacity' as any)
        .find((t: ReactTestInstance) => t.props.accessibilityLabel === 'Undo pending change');
      expect(undoButton).toBeDefined();

      act(() => {
        undoButton!.props.onPress();
      });
      expect(onUndoPending).toHaveBeenCalledWith(ruleWithPending);
    });

    it('renders various pending change descriptions correctly', () => {
      const testCases = [
        {
          patch: { limitMinutes: 60 },
          expected: 'Limit changing to 60m tomorrow',
        },
        {
          patch: { delaySeconds: 5 },
          expected: 'Pause delay changing to 5s tomorrow',
        },
        {
          patch: { blockMinutes: 30 },
          expected: 'Lock duration changing to 30m tomorrow',
        },
        {
          patch: { appIds: ['com.instagram.android'] },
          expected: 'Apps list updating tomorrow',
        },
        {
          patch: {},
          expected: 'Changes taking effect tomorrow',
        },
      ];

      for (const tc of testCases) {
        const ruleWithPending: Rule = {
          ...baseRule,
          pendingChange: {
            patch: tc.patch,
            effectiveAt: 2000000000000,
          },
        };

        let tree: ReactTestRenderer.ReactTestRenderer;
        act(() => {
          tree = ReactTestRenderer.create(
            <RuleCard
              rule={ruleWithPending}
              appStates={appStates}
              onToggle={jest.fn()}
              onUndoPending={jest.fn()}
              onEdit={jest.fn()}
              onDelete={jest.fn()}
            />
          );
        });

        const root = tree!.root;
        const texts = root.findAllByType('Text' as any).map((t: ReactTestInstance) => t.props.children);
        const allText = texts.flat(2).join(' ');
        expect(allText).toContain(tc.expected);
      }
    });

    it('renders disabled state and empty app list message', () => {
      const disabledRule: Rule = {
        ...baseRule,
        enabled: false,
        appIds: [],
        messages: [],
      };

      let tree: ReactTestRenderer.ReactTestRenderer;
      act(() => {
        tree = ReactTestRenderer.create(
          <RuleCard
            rule={disabledRule}
            appStates={{}}
            onToggle={jest.fn()}
            onUndoPending={jest.fn()}
            onEdit={jest.fn()}
            onDelete={jest.fn()}
          />
        );
      });

      const root = tree!.root;
      const texts = root.findAllByType('Text' as any).map((t: ReactTestInstance) => t.props.children);
      const allText = texts.flat(2).join(' ');
      expect(allText).toContain('PAUSED');
      expect(allText).toContain('No apps connected yet.');
    });
  });

  describe('AppUsageBadge Progress & Ratio States', () => {
    it('handles ratio above 0.8 and ratio between 0.5 and 0.8', () => {
      // 85% ratio
      let tree: ReactTestRenderer.ReactTestRenderer;
      act(() => {
        tree = ReactTestRenderer.create(
          <AppUsageBadge
            appId="com.instagram.android"
            limitMinutes={10}
            appState={{
              appId: 'com.instagram.android',
              ruleId: 'r1',
              usedTodaySeconds: 510, // 8.5 min -> 85%
              usageDate: '2026-10-03',
            }}
            now={1000}
          />
        );
      });
      expect(tree!.root).toBeDefined();

      // 60% ratio
      act(() => {
        tree = ReactTestRenderer.create(
          <AppUsageBadge
            appId="com.instagram.android"
            limitMinutes={10}
            appState={{
              appId: 'com.instagram.android',
              ruleId: 'r1',
              usedTodaySeconds: 360, // 6 min -> 60%
              usageDate: '2026-10-03',
            }}
            now={1000}
          />
        );
      });
      expect(tree!.root).toBeDefined();
    });
  });
});
