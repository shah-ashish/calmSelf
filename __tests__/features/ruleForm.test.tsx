import React from 'react';
import ReactTestRenderer, { act, ReactTestInstance } from 'react-test-renderer';
import { RuleForm } from '@/features/rules/components/RuleForm';
import type { Rule } from '@/domain/types';

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
    Platform: {
      OS: 'android',
      select: (obj: Record<string, unknown>) => obj.android ?? obj.default,
    },
    Alert: {
      alert: jest.fn(),
    },
    Image: (props: Record<string, unknown>) =>
      ReactActual.createElement('Image', props, null),
    ActivityIndicator: (props: Record<string, unknown>) =>
      ReactActual.createElement('ActivityIndicator', props, null),
    AppState: {
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    },
  };
});

describe('RuleForm Component', () => {
  const mockRule: Rule = {
    id: 'rule-test-1',
    messages: ['Custom pause message'],
    limitMinutes: 20,
    delaySeconds: 5,
    blockMinutes: 45,
    appIds: ['com.instagram.android'],
    enabled: true,
    schemaVersion: 1,
  };

  it('renders with default create mode state', () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <RuleForm onSave={jest.fn()} onCancel={jest.fn()} />
      );
    });

    const root = tree.root;
    // Header title for create mode
    const textNodes = root.findAllByType('Text' as any);
    const hasCreateTitle = textNodes.some((node: ReactTestInstance) =>
      node.props.children?.toString().includes('Create Protection Rule')
    );
    expect(hasCreateTitle).toBe(true);

    // Default limit should show 30
    const valueTexts = textNodes.map((n: ReactTestInstance) => n.props.children?.toString());
    expect(valueTexts).toContain('30');
  });

  it('renders with existing rule values in edit mode', () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <RuleForm
          initialRule={mockRule}
          onSave={jest.fn()}
          onCancel={jest.fn()}
        />
      );
    });

    const root = tree.root;
    const textNodes = root.findAllByType('Text' as any);
    const hasEditTitle = textNodes.some((node: ReactTestInstance) =>
      node.props.children?.toString().includes('Edit Protection Rule')
    );
    expect(hasEditTitle).toBe(true);

    const inputs = root.findAllByType('TextInput' as any);
    const messageInput = inputs.find((i: ReactTestInstance) => i.props.value === 'Custom pause message');
    expect(messageInput).toBeDefined();
  });

  it('allows adding and editing messages', () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <RuleForm onSave={jest.fn()} onCancel={jest.fn()} />
      );
    });

    const root = tree.root;
    // Find add message button
    const touchables = root.findAllByType('TouchableOpacity' as any);
    const addMsgBtn = touchables.find(
      (t: ReactTestInstance) => t.props.accessibilityLabel === 'Add another intervention message'
    );
    expect(addMsgBtn).toBeDefined();

    act(() => {
      addMsgBtn?.props.onPress();
    });

    const inputs = root.findAllByType('TextInput' as any);
    // Should now have 2 message inputs + 1 custom package input = 3 inputs
    expect(inputs.length).toBeGreaterThanOrEqual(3);

    // Edit message
    act(() => {
      inputs[0].props.onChangeText('Updated new mindful text');
    });

    expect(inputs[0].props.value).toBe('Updated new mindful text');
  });

  it('allows deleting a message when more than 1 message exists', () => {
    const multiMsgRule: Rule = {
      ...mockRule,
      messages: ['First msg', 'Second msg'],
    };

    let tree!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <RuleForm
          initialRule={multiMsgRule}
          onSave={jest.fn()}
          onCancel={jest.fn()}
        />
      );
    });

    const root = tree.root;
    const deleteBtn = root
      .findAllByType('TouchableOpacity' as any)
      .find((t: ReactTestInstance) => t.props.accessibilityLabel === 'Delete message 1');
    expect(deleteBtn).toBeDefined();

    act(() => {
      deleteBtn?.props.onPress();
    });

    const remainingInputs = root
      .findAllByType('TextInput' as any)
      .filter((i: ReactTestInstance) => i.props.accessibilityLabel?.includes('Message'));
    expect(remainingInputs).toHaveLength(1);
    expect(remainingInputs[0].props.value).toBe('Second msg');
  });

  it('adds inspiration prompt when tapped', () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <RuleForm onSave={jest.fn()} onCancel={jest.fn()} />
      );
    });

    const root = tree.root;
    const inspirationChip = root
      .findAllByType('TouchableOpacity' as any)
      .find((t: ReactTestInstance) =>
        t.props.accessibilityLabel?.includes('Add prompt: Why did you open this app?')
      );
    expect(inspirationChip).toBeDefined();

    act(() => {
      inspirationChip?.props.onPress();
    });

    const inputs = root.findAllByType('TextInput' as any);
    expect(inputs.some((i: ReactTestInstance) => i.props.value?.includes('Why did you open this app?'))).toBe(true);
  });

  it('prevents selecting an app assigned to another rule', () => {
    const assignedAppsMap = new Map<string, string>();
    assignedAppsMap.set('com.google.android.youtube', 'other-rule-id');

    let tree!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <RuleForm
          assignedAppsMap={assignedAppsMap}
          onSave={jest.fn()}
          onCancel={jest.fn()}
        />
      );
    });

    const root = tree.root;
    const youtubeChip = root
      .findAllByType('TouchableOpacity' as any)
      .find((t: ReactTestInstance) => t.props.accessibilityLabel?.includes('YouTube app, assigned to another rule'));

    expect(youtubeChip).toBeDefined();
    expect(youtubeChip?.props.disabled).toBe(true);
  });

  it('toggles selection for unassigned apps', () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <RuleForm onSave={jest.fn()} onCancel={jest.fn()} />
      );
    });

    const root = tree.root;
    const redditChip = root
      .findAllByType('TouchableOpacity' as any)
      .find((t: ReactTestInstance) => t.props.accessibilityLabel === 'Reddit app');

    expect(redditChip).toBeDefined();
    expect(redditChip?.props.accessibilityState.checked).toBe(false);

    act(() => {
      redditChip?.props.onPress();
    });

    expect(redditChip?.props.accessibilityState.checked).toBe(true);
  });

  it('adds custom package name when valid', () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <RuleForm onSave={jest.fn()} onCancel={jest.fn()} />
      );
    });

    const root = tree.root;
    const customInput = root
      .findAllByType('TextInput' as any)
      .find((i: ReactTestInstance) => i.props.accessibilityLabel === 'Custom Android package name');
    const addBtn = root
      .findAllByType('TouchableOpacity' as any)
      .find((t: ReactTestInstance) => t.props.accessibilityLabel === 'Add custom package');

    expect(customInput).toBeDefined();
    expect(addBtn).toBeDefined();

    act(() => {
      customInput?.props.onChangeText('com.custom.chess');
    });

    act(() => {
      addBtn?.props.onPress();
    });

    const textNodes = root.findAllByType('Text' as any);
    const hasCustomAppName = textNodes.some((n: ReactTestInstance) => n.props.children?.toString().includes('Chess'));
    expect(hasCustomAppName).toBe(true);
  });

  it('shows error when custom package is invalid or duplicate', () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <RuleForm onSave={jest.fn()} onCancel={jest.fn()} />
      );
    });

    const root = tree.root;
    const customInput = root
      .findAllByType('TextInput' as any)
      .find((i: ReactTestInstance) => i.props.accessibilityLabel === 'Custom Android package name');
    const addBtn = root
      .findAllByType('TouchableOpacity' as any)
      .find((t: ReactTestInstance) => t.props.accessibilityLabel === 'Add custom package');

    // Invalid format (no dot)
    act(() => {
      customInput?.props.onChangeText('invalid');
    });
    act(() => {
      addBtn?.props.onPress();
    });

    const textNodes = root.findAllByType('Text' as any);
    expect(
      textNodes.some((n: ReactTestInstance) => n.props.children?.toString().includes('Invalid package name format'))
    ).toBe(true);
  });

  it('adjusts values using preset chips and steppers', () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <RuleForm onSave={jest.fn()} onCancel={jest.fn()} />
      );
    });

    const root = tree.root;
    // Preset 45m limit
    const preset45 = root
      .findAllByType('TouchableOpacity' as any)
      .find((t: ReactTestInstance) => t.props.accessibilityLabel === '45 minutes daily limit');
    expect(preset45).toBeDefined();

    act(() => {
      preset45?.props.onPress();
    });

    let textNodes = root.findAllByType('Text' as any);
    expect(textNodes.map((n: ReactTestInstance) => n.props.children?.toString())).toContain('45');

    // Stepper +5m
    const incLimitBtn = root
      .findAllByType('TouchableOpacity' as any)
      .find((t: ReactTestInstance) => t.props.accessibilityLabel === 'Increase limit by 5 minutes');

    act(() => {
      incLimitBtn?.props.onPress();
    });

    textNodes = root.findAllByType('Text' as any);
    expect(textNodes.map((n: ReactTestInstance) => n.props.children?.toString())).toContain('50');
  });

  it('displays loosening warning banner when relaxing limits in edit mode', () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <RuleForm
          initialRule={mockRule}
          onSave={jest.fn()}
          onCancel={jest.fn()}
        />
      );
    });

    const root = tree.root;
    // Initial: limit 20m. Increase to 60m (loosening)
    const incLimitBtn = root
      .findAllByType('TouchableOpacity' as any)
      .find((t: ReactTestInstance) => t.props.accessibilityLabel === 'Increase limit by 5 minutes');

    act(() => {
      incLimitBtn?.props.onPress(); // 25
      incLimitBtn?.props.onPress(); // 30
    });

    const textNodes = root.findAllByType('Text' as any);
    const hasLooseningNotice = textNodes.some((n: ReactTestInstance) =>
      n.props.children?.toString().includes('Notice on Relaxing Boundaries')
    );
    expect(hasLooseningNotice).toBe(true);
  });

  it('submits valid form and triggers onSave callback', async () => {
    const handleSave = jest.fn().mockResolvedValue(true);
    let tree!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <RuleForm onSave={handleSave} onCancel={jest.fn()} />
      );
    });

    const root = tree.root;
    const saveBtn = root
      .findAllByType('TouchableOpacity' as any)
      .find((t: ReactTestInstance) => t.props.accessibilityLabel === 'Create protection rule');
    expect(saveBtn).toBeDefined();

    await act(async () => {
      await saveBtn?.props.onPress();
    });

    expect(handleSave).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.any(Array),
        limitMinutes: 30,
        delaySeconds: 10,
        blockMinutes: 60,
        appIds: ['com.instagram.android'],
        enabled: true,
      })
    );
  });

  it('triggers onCancel when Cancel button is tapped', () => {
    const handleCancel = jest.fn();
    let tree!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <RuleForm onSave={jest.fn()} onCancel={handleCancel} />
      );
    });

    const root = tree.root;
    const cancelBtn = root
      .findAllByType('TouchableOpacity' as any)
      .find((t: ReactTestInstance) => t.props.accessibilityLabel === 'Cancel and return to home');
    expect(cancelBtn).toBeDefined();

    act(() => {
      cancelBtn?.props.onPress();
    });

    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('adjusts delay and block duration using presets and steppers', () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <RuleForm onSave={jest.fn()} onCancel={jest.fn()} />
      );
    });

    const root = tree.root;

    // Delay presets
    const delayPreset15 = root
      .findAllByType('TouchableOpacity' as any)
      .find((t: ReactTestInstance) => t.props.accessibilityLabel === '15 seconds delay');
    expect(delayPreset15).toBeDefined();

    act(() => {
      delayPreset15?.props.onPress();
    });

    // Delay steppers
    const incDelayBtn = root
      .findAllByType('TouchableOpacity' as any)
      .find((t: ReactTestInstance) => t.props.accessibilityLabel === 'Increase delay by 1 second');
    const decDelayBtn = root
      .findAllByType('TouchableOpacity' as any)
      .find((t: ReactTestInstance) => t.props.accessibilityLabel === 'Decrease delay by 1 second');

    act(() => {
      incDelayBtn?.props.onPress();
      decDelayBtn?.props.onPress();
    });

    // Block presets
    const blockPreset120 = root
      .findAllByType('TouchableOpacity' as any)
      .find((t: ReactTestInstance) => t.props.accessibilityLabel === '120 minutes cooldown');
    expect(blockPreset120).toBeDefined();

    act(() => {
      blockPreset120?.props.onPress();
    });

    // Block steppers
    const incBlockBtn = root
      .findAllByType('TouchableOpacity' as any)
      .find((t: ReactTestInstance) => t.props.accessibilityLabel === 'Increase cooldown by 15 minutes');
    const decBlockBtn = root
      .findAllByType('TouchableOpacity' as any)
      .find((t: ReactTestInstance) => t.props.accessibilityLabel === 'Decrease cooldown by 15 minutes');

    act(() => {
      incBlockBtn?.props.onPress();
      decBlockBtn?.props.onPress();
    });

    const textNodes = root.findAllByType('Text' as any);
    expect(textNodes.map((n: ReactTestInstance) => n.props.children?.toString())).toContain('2h');
  });

  it('removes app via summary chip when multiple apps are selected', () => {
    const multiAppRule: Rule = {
      ...mockRule,
      appIds: ['com.instagram.android', 'com.reddit.frontpage'],
    };

    let tree!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <RuleForm
          initialRule={multiAppRule}
          onSave={jest.fn()}
          onCancel={jest.fn()}
        />
      );
    });

    const root = tree.root;
    const removeRedditBtn = root
      .findAllByType('TouchableOpacity' as any)
      .find((t: ReactTestInstance) => t.props.accessibilityLabel === 'Remove Reddit');
    expect(removeRedditBtn).toBeDefined();

    act(() => {
      removeRedditBtn?.props.onPress();
    });

    const textNodes = root.findAllByType('Text' as any);
    const hasSingleAppText = textNodes.some((n: ReactTestInstance) => {
      const text = Array.isArray(n.props.children)
        ? n.props.children.join('')
        : n.props.children?.toString() ?? '';
      return text.includes('1 app protected');
    });
    expect(hasSingleAppText).toBe(true);
  });

  it('displays multiple loosening changes in the notice banner', () => {
    const multiAppRule: Rule = {
      ...mockRule,
      limitMinutes: 20,
      delaySeconds: 15,
      blockMinutes: 60,
      appIds: ['com.instagram.android', 'com.reddit.frontpage'],
    };

    let tree!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <RuleForm
          initialRule={multiAppRule}
          onSave={jest.fn()}
          onCancel={jest.fn()}
        />
      );
    });

    const root = tree.root;

    // Loosen delay: set to 0s
    const delayPreset0 = root
      .findAllByType('TouchableOpacity' as any)
      .find((t: ReactTestInstance) => t.props.accessibilityLabel === 'No delay');
    act(() => {
      delayPreset0?.props.onPress();
    });

    // Loosen block: set to 15m
    const blockPreset15 = root
      .findAllByType('TouchableOpacity' as any)
      .find((t: ReactTestInstance) => t.props.accessibilityLabel === '15 minutes cooldown');
    act(() => {
      blockPreset15?.props.onPress();
    });

    // Loosen apps: remove reddit
    const removeRedditBtn = root
      .findAllByType('TouchableOpacity' as any)
      .find((t: ReactTestInstance) => t.props.accessibilityLabel === 'Remove Reddit');
    act(() => {
      removeRedditBtn?.props.onPress();
    });

    const textNodes = root.findAllByType('Text' as any);
    const textStrings = textNodes.map((n: ReactTestInstance) => n.props.children?.toString() ?? '');
    expect(textStrings.some((s) => s.includes('Pause delay reduced'))).toBe(true);
    expect(textStrings.some((s) => s.includes('Cooldown block reduced'))).toBe(true);
    expect(textStrings.some((s) => s.includes('Removed protected app'))).toBe(true);
  });

  it('shows validation errors when message is empty upon submit', async () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <RuleForm onSave={jest.fn()} onCancel={jest.fn()} />
      );
    });

    const root = tree.root;
    const messageInput = root
      .findAllByType('TextInput' as any)
      .find((i: ReactTestInstance) => i.props.accessibilityLabel === 'Message 1 text');
    expect(messageInput).toBeDefined();

    // Clear first message
    act(() => {
      messageInput?.props.onChangeText('');
    });

    const saveBtn = root
      .findAllByType('TouchableOpacity' as any)
      .find((t: ReactTestInstance) => t.props.accessibilityLabel === 'Create protection rule');

    await act(async () => {
      await saveBtn?.props.onPress();
    });

    const textNodes = root.findAllByType('Text' as any);
    const errorNode = textNodes.find(
      (n: ReactTestInstance) => n.props.children === 'Message cannot be empty.'
    );
    expect(errorNode).toBeDefined();
  });
});
