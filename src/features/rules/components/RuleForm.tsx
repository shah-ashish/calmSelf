import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import type { Rule } from '@/domain/types';
import type { RuleInput } from '@/domain/validation';
import { LIMITS } from '@/config/constants';
import { colors, radii, shadows, spacing, typography } from '@/ui/theme';
import { POPULAR_APPS, resolveAppMetadata } from '../utils/appName';
import {
  classifyLimitChange,
  classifyDelayChange,
  classifyBlockDurationChange,
  classifyAppListChanges,
} from '@/domain/changePolicy';
import { getDefaultBlockerAdapter } from '@/features/permissions/defaultAdapter';
import { usePermissions } from '@/features/permissions';
import type { InstalledAppInfo } from '@/platform/blocker/interface';

export interface RuleFormProps {
  readonly initialRule?: Rule;
  readonly assignedAppsMap?: Map<string, string>;
  readonly onSave: (input: RuleInput) => Promise<boolean>;
  readonly onCancel: () => void;
  readonly onOpenPermissions?: () => void;
  readonly isSubmitting?: boolean;
}

const INSPIRATION_MESSAGES = [
  'Why did you open this app? Take three deep breaths first.',
  'Is this what you really want to do right now, or just a reflex?',
  'Future you will thank you for closing this and focusing.',
  'You have a life to live outside this screen. Be present.',
  'Just checking in: Are you avoiding something important right now?',
];

const LIMIT_PRESETS = [15, 30, 45, 60, 90, 120];
const DELAY_PRESETS = [0, 5, 10, 15, 30];
const BLOCK_PRESETS = [15, 30, 60, 120, 240];

export function RuleForm({
  initialRule,
  assignedAppsMap = new Map(),
  onSave,
  onCancel,
  onOpenPermissions,
  isSubmitting = false,
}: RuleFormProps) {
  const isEditing = Boolean(initialRule);
  const { allGranted } = usePermissions();

  // Form State
  const [messages, setMessages] = useState<string[]>(
    initialRule?.messages.length ? [...initialRule.messages] : [INSPIRATION_MESSAGES[0]]
  );
  const [selectedApps, setSelectedApps] = useState<string[]>(
    initialRule?.appIds.length ? [...initialRule.appIds] : ['com.instagram.android']
  );
  const [limitMinutes, setLimitMinutes] = useState<number>(
    initialRule?.limitMinutes ?? LIMITS.DEFAULT_TIME_LIMIT_MINUTES
  );
  const [delaySeconds, setDelaySeconds] = useState<number>(
    initialRule?.delaySeconds ?? LIMITS.DEFAULT_CONTINUE_DELAY_SECONDS
  );
  const [blockMinutes, setBlockMinutes] = useState<number>(
    initialRule?.blockMinutes ?? LIMITS.DEFAULT_BLOCK_DURATION_MINUTES
  );

  // Dynamic installed apps state
  const [installedApps, setInstalledApps] = useState<readonly InstalledAppInfo[]>([]);
  const [loadingApps, setLoadingApps] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAllApps, setShowAllApps] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchApps() {
      try {
        const adapter = getDefaultBlockerAdapter();
        const apps = await adapter.getInstalledApps();
        if (isMounted && apps.length > 0) {
          setInstalledApps(apps);
        }
      } catch {
        // Fallback gracefully to default popular apps
      } finally {
        if (isMounted) {
          setLoadingApps(false);
        }
      }
    }
    void fetchApps();
    return () => {
      isMounted = false;
    };
  }, []);

  const installedAppsMap = useMemo(() => {
    const map = new Map<string, InstalledAppInfo>();
    for (const app of installedApps) {
      map.set(app.packageName, app);
    }
    return map;
  }, [installedApps]);

  const availableApps = useMemo(() => {
    if (installedApps.length > 0) {
      return installedApps.map((app) => ({
        packageId: app.packageName,
        name: app.name,
        iconBase64: app.iconBase64 ?? null,
        icon: resolveAppMetadata(app.packageName).icon,
      }));
    }
    return POPULAR_APPS.map((app) => ({
      packageId: app.packageId,
      name: app.name,
      icon: app.icon,
      iconBase64: null,
    }));
  }, [installedApps]);

  const filteredApps = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return availableApps;
    }
    return availableApps.filter(
      (app) =>
        app.name.toLowerCase().includes(q) ||
        app.packageId.toLowerCase().includes(q)
    );
  }, [availableApps, searchQuery]);

  const displayedApps = useMemo(() => {
    if (searchQuery.trim().length > 0 || showAllApps || filteredApps.length <= 12) {
      return filteredApps;
    }
    return filteredApps.slice(0, 12);
  }, [filteredApps, searchQuery, showAllApps]);

  // Custom app package input
  const [customPackage, setCustomPackage] = useState<string>('');
  const [customPackageError, setCustomPackageError] = useState<string | null>(null);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Detect whether current edits contain loosening changes (Business Rule 3)
  const looseningInfo = useMemo(() => {
    if (!initialRule) return null;

    const changes: string[] = [];

    if (classifyLimitChange(initialRule.limitMinutes, limitMinutes) === 'loosening') {
      changes.push(`Daily limit increased from ${initialRule.limitMinutes}m to ${limitMinutes}m`);
    }
    if (classifyDelayChange(initialRule.delaySeconds, delaySeconds) === 'loosening') {
      changes.push(`Pause delay reduced from ${initialRule.delaySeconds}s to ${delaySeconds}s`);
    }
    if (classifyBlockDurationChange(initialRule.blockMinutes, blockMinutes) === 'loosening') {
      changes.push(`Cooldown block reduced from ${initialRule.blockMinutes}m to ${blockMinutes}m`);
    }

    const { removed } = classifyAppListChanges(initialRule.appIds, selectedApps);
    if (removed.length > 0) {
      const removedNames = removed
        .map((id) => installedAppsMap.get(id)?.name ?? resolveAppMetadata(id).name)
        .join(', ');
      changes.push(`Removed protected app(s): ${removedNames}`);
    }

    return changes.length > 0 ? changes : null;
  }, [initialRule, limitMinutes, delaySeconds, blockMinutes, selectedApps, installedAppsMap]);

  // Messages handling
  const handleUpdateMessage = useCallback((text: string, index: number) => {
    setMessages((prev) => {
      const updated = [...prev];
      updated[index] = text;
      return updated;
    });
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`message_${index}`];
      return next;
    });
  }, []);

  const handleAddMessage = useCallback(() => {
    if (messages.length >= LIMITS.MAX_RULE_MESSAGES) {
      Alert.alert(
        'Message Limit',
        `A rule can have at most ${LIMITS.MAX_RULE_MESSAGES} intervention messages.`
      );
      return;
    }
    // Pick an unused inspiration message or a default
    const unused = INSPIRATION_MESSAGES.find((m) => !messages.includes(m));
    setMessages((prev) => [...prev, unused ?? 'Take a moment to reflect before continuing.']);
  }, [messages]);

  const handleRemoveMessage = useCallback((index: number) => {
    setMessages((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleApplyInspiration = useCallback((text: string) => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].trim() === '') {
        return [text];
      }
      if (prev.includes(text)) {
        return prev;
      }
      if (prev.length < LIMITS.MAX_RULE_MESSAGES) {
        return [...prev, text];
      }
      return prev;
    });
  }, []);

  // App Selection handling
  const toggleAppSelection = useCallback(
    (packageId: string) => {
      if (assignedAppsMap.has(packageId)) {
        Alert.alert(
          'App Already Protected',
          `This app is already assigned to another rule. Each app can only belong to one rule.`
        );
        return;
      }

      setSelectedApps((prev) => {
        if (prev.includes(packageId)) {
          if (prev.length === 1) {
            Alert.alert('App Required', 'A rule must protect at least one app.');
            return prev;
          }
          return prev.filter((id) => id !== packageId);
        } else {
          return [...prev, packageId];
        }
      });

      setErrors((prev) => {
        const next = { ...prev };
        delete next.apps;
        return next;
      });
    },
    [assignedAppsMap]
  );

  const handleAddCustomPackage = useCallback(() => {
    const trimmed = customPackage.trim().toLowerCase();
    if (!trimmed) {
      setCustomPackageError('Please enter an Android package name (e.g., com.example.app)');
      return;
    }
    if (!trimmed.includes('.') || trimmed.length < 3) {
      setCustomPackageError('Invalid package name format. Must contain at least one dot.');
      return;
    }
    if (assignedAppsMap.has(trimmed)) {
      setCustomPackageError('This app is already protected by another rule.');
      return;
    }
    if (selectedApps.includes(trimmed)) {
      setCustomPackageError('This app is already selected.');
      return;
    }

    setSelectedApps((prev) => [...prev, trimmed]);
    setCustomPackage('');
    setCustomPackageError(null);
  }, [customPackage, assignedAppsMap, selectedApps]);

  // Submit validation and execution
  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {};

    // Validate messages
    const trimmedMessages = messages.map((m) => m.trim());
    if (trimmedMessages.length === 0) {
      newErrors.messages = 'At least one intervention message is required.';
    } else {
      trimmedMessages.forEach((m, idx) => {
        if (!m || m.length < LIMITS.MIN_MESSAGE_LENGTH) {
          newErrors[`message_${idx}`] = 'Message cannot be empty.';
        } else if (m.length > LIMITS.MAX_MESSAGE_LENGTH) {
          newErrors[`message_${idx}`] = `Cannot exceed ${LIMITS.MAX_MESSAGE_LENGTH} characters.`;
        }
      });
    }

    // Validate apps
    if (selectedApps.length === 0) {
      newErrors.apps = 'At least one target app must be selected.';
    }

    // Validate limits
    if (
      limitMinutes < LIMITS.MIN_TIME_LIMIT_MINUTES ||
      limitMinutes > LIMITS.MAX_TIME_LIMIT_MINUTES
    ) {
      newErrors.limit = `Daily limit must be between ${LIMITS.MIN_TIME_LIMIT_MINUTES} and ${LIMITS.MAX_TIME_LIMIT_MINUTES} minutes.`;
    }

    if (
      delaySeconds < LIMITS.MIN_CONTINUE_DELAY_SECONDS ||
      delaySeconds > LIMITS.MAX_CONTINUE_DELAY_SECONDS
    ) {
      newErrors.delay = `Delay must be between ${LIMITS.MIN_CONTINUE_DELAY_SECONDS} and ${LIMITS.MAX_CONTINUE_DELAY_SECONDS} seconds.`;
    }

    if (
      blockMinutes < LIMITS.MIN_BLOCK_DURATION_MINUTES ||
      blockMinutes > LIMITS.MAX_BLOCK_DURATION_MINUTES
    ) {
      newErrors.block = `Block duration must be between ${LIMITS.MIN_BLOCK_DURATION_MINUTES} and ${LIMITS.MAX_BLOCK_DURATION_MINUTES} minutes.`;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload: RuleInput = {
      messages: trimmedMessages,
      limitMinutes,
      delaySeconds,
      blockMinutes,
      appIds: selectedApps,
      enabled: initialRule?.enabled ?? true,
    };

    await onSave(payload);
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header Introduction */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {isEditing ? 'Edit Protection Rule' : 'Create Protection Rule'}
          </Text>
          <Text style={styles.subtitle}>
            Set mindful pauses and daily boundaries to help your future self stay focused.
          </Text>
        </View>

        {/* Permission Warning Banner */}
        {!allGranted && (
          <TouchableOpacity
            style={styles.permissionWarningBanner}
            onPress={onOpenPermissions}
            activeOpacity={0.85}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Permissions required for app interception. Tap to enable."
          >
            <Text style={styles.permissionWarningIcon}>⚠️</Text>
            <View style={styles.permissionWarningTextCol}>
              <Text style={styles.permissionWarningTitle}>Permissions Required to Intercept</Text>
              <Text style={styles.permissionWarningSubtitle}>
                Calm Self needs &quot;Display Over Apps&quot; and &quot;Usage Access&quot; to monitor apps and show pauses. Tap to enable.
              </Text>
            </View>
            <Text style={styles.permissionWarningArrow}>→</Text>
          </TouchableOpacity>
        )}

        {/* Asymmetric Change Policy Banner (if loosening) */}
        {looseningInfo && (
          <View style={styles.looseningBanner} accessible accessibilityRole="alert">
            <View style={styles.looseningBannerHeader}>
              <Text style={styles.looseningBannerIcon}>⏳</Text>
              <Text style={styles.looseningBannerTitle}>Notice on Relaxing Boundaries</Text>
            </View>
            <Text style={styles.looseningBannerBody}>
              To protect your commitments, loosening changes will take effect tomorrow at
              midnight. Tightened limits apply immediately.
            </Text>
            <View style={styles.looseningChangesList}>
              {looseningInfo.map((change, idx) => (
                <Text key={idx} style={styles.looseningChangeItem}>
                  • {change}
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* Section 1: Connected Apps */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>📱</Text>
            <View style={styles.sectionTitleCol}>
              <Text style={styles.sectionTitle}>Protected Apps</Text>
              <Text style={styles.sectionSubtitle}>
                Select the apps you want Calm Self to protect.
              </Text>
            </View>
          </View>

          {errors.apps && <Text style={styles.errorText}>{errors.apps}</Text>}

          {/* Search Installed Apps Bar */}
          <View style={styles.appSearchContainer}>
            <TextInput
              style={styles.appSearchInput}
              placeholder="🔍 Search installed apps..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              accessible
              accessibilityLabel="Search installed apps"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearSearchBtn}
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <Text style={styles.clearSearchText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Loading Indicator */}
          {loadingApps && (
            <View style={styles.loadingAppsRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingAppsText}>Scanning installed apps on device...</Text>
            </View>
          )}

          {/* Installed Apps Grid */}
          <View style={styles.appsGrid}>
            {displayedApps.map((app) => {
              const isSelected = selectedApps.includes(app.packageId);
              const isAssignedElsewhere = assignedAppsMap.has(app.packageId);

              return (
                <TouchableOpacity
                  key={app.packageId}
                  style={[
                    styles.appChip,
                    isSelected && styles.appChipSelected,
                    isAssignedElsewhere && styles.appChipDisabled,
                  ]}
                  onPress={() => toggleAppSelection(app.packageId)}
                  disabled={isAssignedElsewhere}
                  accessible
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected, disabled: isAssignedElsewhere }}
                  accessibilityLabel={`${app.name} app${isAssignedElsewhere ? ', assigned to another rule' : ''}`}
                >
                  {app.iconBase64 ? (
                    <Image
                      source={{ uri: `data:image/png;base64,${app.iconBase64}` }}
                      style={styles.appChipImage}
                    />
                  ) : (
                    <Text style={styles.appChipIcon}>{app.icon ?? '📱'}</Text>
                  )}
                  <Text
                    style={[
                      styles.appChipName,
                      isSelected && styles.appChipNameSelected,
                      isAssignedElsewhere && styles.appChipNameDisabled,
                    ]}
                    numberOfLines={1}
                  >
                    {app.name}
                  </Text>
                  {isAssignedElsewhere ? (
                    <Text style={styles.appChipBadgeLock}>🔒 In other rule</Text>
                  ) : isSelected ? (
                    <Text style={styles.appChipCheck}>✓</Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* No results message */}
          {filteredApps.length === 0 && !loadingApps && (
            <Text style={styles.emptySearchText}>
              No apps found matching &quot;{searchQuery}&quot;
            </Text>
          )}

          {/* Show more/fewer apps toggle */}
          {filteredApps.length > 12 && !searchQuery.trim() && (
            <TouchableOpacity
              style={styles.toggleMoreAppsBtn}
              onPress={() => setShowAllApps((prev) => !prev)}
              accessible
              accessibilityRole="button"
              accessibilityLabel={showAllApps ? 'Show fewer apps' : 'Show all installed apps'}
            >
              <Text style={styles.toggleMoreAppsText}>
                {showAllApps
                  ? 'Show fewer apps ▲'
                  : `Show all ${filteredApps.length} apps on device ▼`}
              </Text>
            </TouchableOpacity>
          )}

          {/* Custom Package Input */}
          <View style={styles.customAppContainer}>
            <Text style={styles.customAppLabel}>Add Custom App Package</Text>
            <View style={styles.customAppRow}>
              <TextInput
                style={styles.customAppInput}
                placeholder="e.g., com.android.chrome"
                placeholderTextColor={colors.textMuted}
                value={customPackage}
                onChangeText={(text) => {
                  setCustomPackage(text);
                  if (customPackageError) setCustomPackageError(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                accessible
                accessibilityLabel="Custom Android package name"
              />
              <TouchableOpacity
                style={styles.customAppButton}
                onPress={handleAddCustomPackage}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Add custom package"
              >
                <Text style={styles.customAppButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
            {customPackageError && <Text style={styles.errorText}>{customPackageError}</Text>}
          </View>

          {/* Selected Apps Summary Chips */}
          <View style={styles.selectedSummaryRow}>
            <Text style={styles.selectedCountText}>
              {selectedApps.length} {selectedApps.length === 1 ? 'app' : 'apps'} protected
            </Text>
            <View style={styles.selectedChipsWrap}>
              {selectedApps.map((pkg) => {
                const installed = installedAppsMap.get(pkg);
                const meta = resolveAppMetadata(pkg);
                const name = installed?.name ?? meta.name;
                const iconBase64 = installed?.iconBase64;

                return (
                  <View key={pkg} style={styles.selectedSummaryChip}>
                    {iconBase64 ? (
                      <Image
                        source={{ uri: `data:image/png;base64,${iconBase64}` }}
                        style={styles.summaryChipImage}
                      />
                    ) : (
                      <Text style={styles.summaryChipIcon}>{meta.icon}</Text>
                    )}
                    <Text style={styles.summaryChipText}>{name}</Text>
                    {selectedApps.length > 1 && (
                      <TouchableOpacity
                        onPress={() => toggleAppSelection(pkg)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessible
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${name}`}
                      >
                        <Text style={styles.summaryChipRemove}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Section 2: Future Self Messages */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>💬</Text>
            <View style={styles.sectionTitleCol}>
              <Text style={styles.sectionTitle}>Mindful Intervention Messages</Text>
              <Text style={styles.sectionSubtitle}>
                Shown at random when you open a protected app to disrupt mindless scrolling.
              </Text>
            </View>
          </View>

          {errors.messages && <Text style={styles.errorText}>{errors.messages}</Text>}

          {/* Messages list */}
          {messages.map((msg, index) => {
            const hasError = Boolean(errors[`message_${index}`]);
            return (
              <View key={index} style={styles.messageItemContainer}>
                <View style={styles.messageItemHeader}>
                  <Text style={styles.messageNumberBadge}>Message #{index + 1}</Text>
                  {messages.length > 1 && (
                    <TouchableOpacity
                      onPress={() => handleRemoveMessage(index)}
                      accessible
                      accessibilityRole="button"
                      accessibilityLabel={`Delete message ${index + 1}`}
                    >
                      <Text style={styles.deleteMessageText}>✕ Delete</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <TextInput
                  style={[styles.messageInput, hasError && styles.inputError]}
                  multiline
                  numberOfLines={3}
                  value={msg}
                  maxLength={LIMITS.MAX_MESSAGE_LENGTH}
                  onChangeText={(text) => handleUpdateMessage(text, index)}
                  placeholder="Write a message to your future self..."
                  placeholderTextColor={colors.textMuted}
                  accessible
                  accessibilityLabel={`Message ${index + 1} text`}
                />

                <View style={styles.messageMetaRow}>
                  {hasError ? (
                    <Text style={styles.errorTextSmall}>{errors[`message_${index}`]}</Text>
                  ) : (
                    <View />
                  )}
                  <Text style={styles.charCountText}>
                    {msg.length} / {LIMITS.MAX_MESSAGE_LENGTH}
                  </Text>
                </View>
              </View>
            );
          })}

          {/* Add Message Button */}
          {messages.length < LIMITS.MAX_RULE_MESSAGES && (
            <TouchableOpacity
              style={styles.addMessageButton}
              onPress={handleAddMessage}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Add another intervention message"
            >
              <Text style={styles.addMessageButtonText}>+ Add Another Message</Text>
            </TouchableOpacity>
          )}

          {/* Mindful Inspiration Chips */}
          <View style={styles.inspirationContainer}>
            <Text style={styles.inspirationLabel}>✨ Mindful Prompts (tap to add)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.inspirationScroll}>
              {INSPIRATION_MESSAGES.map((text, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.inspirationChip}
                  onPress={() => handleApplyInspiration(text)}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={`Add prompt: ${text}`}
                >
                  <Text style={styles.inspirationChipText} numberOfLines={2}>
                    &quot;{text}&quot;
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* Section 3: Daily Time Limit */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>⏱️</Text>
            <View style={styles.sectionTitleCol}>
              <Text style={styles.sectionTitle}>Daily Time Limit</Text>
              <Text style={styles.sectionSubtitle}>
                Total usage allowed per app per day before it locks.
              </Text>
            </View>
          </View>

          {errors.limit && <Text style={styles.errorText}>{errors.limit}</Text>}

          {/* Limit Preset Chips */}
          <View style={styles.presetChipsRow}>
            {LIMIT_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset}
                style={[
                  styles.presetChip,
                  limitMinutes === preset && styles.presetChipActive,
                ]}
                onPress={() => setLimitMinutes(preset)}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`${preset} minutes daily limit`}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    limitMinutes === preset && styles.presetChipTextActive,
                  ]}
                >
                  {preset}m
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Limit Stepper / Adjuster */}
          <View style={styles.stepperContainer}>
            <TouchableOpacity
              style={styles.stepperButton}
              onPress={() =>
                setLimitMinutes((prev) =>
                  Math.max(LIMITS.MIN_TIME_LIMIT_MINUTES, prev - 5)
                )
              }
              accessible
              accessibilityRole="button"
              accessibilityLabel="Decrease limit by 5 minutes"
            >
              <Text style={styles.stepperButtonText}>- 5m</Text>
            </TouchableOpacity>

            <View style={styles.stepperValueBox}>
              <Text style={styles.stepperValueText}>{limitMinutes}</Text>
              <Text style={styles.stepperUnitText}>minutes / day</Text>
            </View>

            <TouchableOpacity
              style={styles.stepperButton}
              onPress={() =>
                setLimitMinutes((prev) =>
                  Math.min(LIMITS.MAX_TIME_LIMIT_MINUTES, prev + 5)
                )
              }
              accessible
              accessibilityRole="button"
              accessibilityLabel="Increase limit by 5 minutes"
            >
              <Text style={styles.stepperButtonText}>+ 5m</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 4: Continue Pause Delay */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>⏳</Text>
            <View style={styles.sectionTitleCol}>
              <Text style={styles.sectionTitle}>Pause Delay</Text>
              <Text style={styles.sectionSubtitle}>
                Seconds to pause and read your message before Continue activates.
              </Text>
            </View>
          </View>

          {errors.delay && <Text style={styles.errorText}>{errors.delay}</Text>}

          {/* Delay Preset Chips */}
          <View style={styles.presetChipsRow}>
            {DELAY_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset}
                style={[
                  styles.presetChip,
                  delaySeconds === preset && styles.presetChipActive,
                ]}
                onPress={() => setDelaySeconds(preset)}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`${preset === 0 ? 'No delay' : `${preset} seconds delay`}`}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    delaySeconds === preset && styles.presetChipTextActive,
                  ]}
                >
                  {preset === 0 ? 'Instant' : `${preset}s`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Delay Stepper */}
          <View style={styles.stepperContainer}>
            <TouchableOpacity
              style={styles.stepperButton}
              onPress={() =>
                setDelaySeconds((prev) =>
                  Math.max(LIMITS.MIN_CONTINUE_DELAY_SECONDS, prev - 1)
                )
              }
              accessible
              accessibilityRole="button"
              accessibilityLabel="Decrease delay by 1 second"
            >
              <Text style={styles.stepperButtonText}>- 1s</Text>
            </TouchableOpacity>

            <View style={styles.stepperValueBox}>
              <Text style={styles.stepperValueText}>{delaySeconds}</Text>
              <Text style={styles.stepperUnitText}>seconds pause</Text>
            </View>

            <TouchableOpacity
              style={styles.stepperButton}
              onPress={() =>
                setDelaySeconds((prev) =>
                  Math.min(LIMITS.MAX_CONTINUE_DELAY_SECONDS, prev + 1)
                )
              }
              accessible
              accessibilityRole="button"
              accessibilityLabel="Increase delay by 1 second"
            >
              <Text style={styles.stepperButtonText}>+ 1s</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 5: Cooldown Block Duration */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>🔒</Text>
            <View style={styles.sectionTitleCol}>
              <Text style={styles.sectionTitle}>Cooldown Lock Duration</Text>
              <Text style={styles.sectionSubtitle}>
                How long the app remains completely locked after hitting daily limit.
              </Text>
            </View>
          </View>

          {errors.block && <Text style={styles.errorText}>{errors.block}</Text>}

          {/* Block Preset Chips */}
          <View style={styles.presetChipsRow}>
            {BLOCK_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset}
                style={[
                  styles.presetChip,
                  blockMinutes === preset && styles.presetChipActive,
                ]}
                onPress={() => setBlockMinutes(preset)}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`${preset} minutes cooldown`}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    blockMinutes === preset && styles.presetChipTextActive,
                  ]}
                >
                  {preset >= 60 ? `${preset / 60}h` : `${preset}m`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Block Stepper */}
          <View style={styles.stepperContainer}>
            <TouchableOpacity
              style={styles.stepperButton}
              onPress={() =>
                setBlockMinutes((prev) =>
                  Math.max(LIMITS.MIN_BLOCK_DURATION_MINUTES, prev - 15)
                )
              }
              accessible
              accessibilityRole="button"
              accessibilityLabel="Decrease cooldown by 15 minutes"
            >
              <Text style={styles.stepperButtonText}>- 15m</Text>
            </TouchableOpacity>

            <View style={styles.stepperValueBox}>
              <Text style={styles.stepperValueText}>
                {blockMinutes >= 60
                  ? `${Math.floor(blockMinutes / 60)}h ${blockMinutes % 60 ? `${blockMinutes % 60}m` : ''}`.trim()
                  : `${blockMinutes}m`}
              </Text>
              <Text style={styles.stepperUnitText}>locked cooldown</Text>
            </View>

            <TouchableOpacity
              style={styles.stepperButton}
              onPress={() =>
                setBlockMinutes((prev) =>
                  Math.min(LIMITS.MAX_BLOCK_DURATION_MINUTES, prev + 15)
                )
              }
              accessible
              accessibilityRole="button"
              accessibilityLabel="Increase cooldown by 15 minutes"
            >
              <Text style={styles.stepperButtonText}>+ 15m</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            accessible
            accessibilityRole="button"
            accessibilityLabel={isEditing ? 'Save rule changes' : 'Create protection rule'}
          >
            <Text style={styles.saveButtonText}>
              {isSubmitting
                ? 'Saving...'
                : isEditing
                  ? '💾 Save Protection Rule'
                  : '✨ Create Protection Rule'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
            disabled={isSubmitting}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Cancel and return to home"
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodyMuted,
    lineHeight: 20,
  },
  permissionWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  permissionWarningIcon: {
    fontSize: 22,
    marginRight: spacing.sm,
  },
  permissionWarningTextCol: {
    flex: 1,
  },
  permissionWarningTitle: {
    ...typography.h3,
    fontSize: 14,
    color: '#92400E',
    fontWeight: '700',
  },
  permissionWarningSubtitle: {
    ...typography.caption,
    fontSize: 12,
    color: '#78350F',
    marginTop: 2,
    lineHeight: 16,
  },
  permissionWarningArrow: {
    fontSize: 18,
    color: '#92400E',
    fontWeight: '700',
    marginLeft: spacing.xs,
  },
  looseningBanner: {
    backgroundColor: colors.accentAmberLight,
    borderColor: colors.accentAmber,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  looseningBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  looseningBannerIcon: {
    fontSize: 18,
    marginRight: spacing.xs,
  },
  looseningBannerTitle: {
    ...typography.h3,
    fontSize: 15,
    color: '#92400E',
  },
  looseningBannerBody: {
    ...typography.caption,
    color: '#78350F',
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  looseningChangesList: {
    marginTop: spacing.xs,
  },
  looseningChangeItem: {
    ...typography.caption,
    color: '#B45309',
    fontWeight: '600',
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  sectionTitleCol: {
    flex: 1,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  errorTextSmall: {
    ...typography.caption,
    color: colors.danger,
    fontSize: 11,
  },
  // App Selection
  appSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSubtle,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  appSearchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: spacing.sm,
  },
  clearSearchBtn: {
    padding: spacing.xs,
  },
  clearSearchText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '600',
  },
  loadingAppsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  loadingAppsText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  appsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  appChipImage: {
    width: 18,
    height: 18,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  emptySearchText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.sm,
    fontStyle: 'italic',
  },
  toggleMoreAppsBtn: {
    alignSelf: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  toggleMoreAppsText: {
    ...typography.caption,
    color: colors.primaryDark,
    fontWeight: '600',
  },
  appChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSubtle,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  appChipSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  appChipDisabled: {
    backgroundColor: colors.backgroundSubtle,
    borderColor: colors.borderSubtle,
    opacity: 0.55,
  },
  appChipIcon: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  appChipName: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  appChipNameSelected: {
    color: colors.primaryDark,
  },
  appChipNameDisabled: {
    color: colors.textMuted,
  },
  appChipCheck: {
    marginLeft: spacing.xs,
    color: colors.primaryDark,
    fontWeight: '800',
    fontSize: 13,
  },
  appChipBadgeLock: {
    marginLeft: spacing.xs,
    fontSize: 10,
    color: colors.textMuted,
  },
  customAppContainer: {
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  customAppLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  customAppRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  customAppInput: {
    flex: 1,
    backgroundColor: colors.backgroundSubtle,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  customAppButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    ...shadows.sm,
  },
  customAppButtonText: {
    ...typography.button,
    color: colors.textInverted,
    fontSize: 13,
  },
  selectedSummaryRow: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  selectedCountText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.primaryDark,
    marginBottom: spacing.xs,
  },
  selectedChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  selectedSummaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
  },
  summaryChipIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  summaryChipImage: {
    width: 14,
    height: 14,
    borderRadius: 3,
    marginRight: 4,
  },
  summaryChipText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.primaryText,
    fontWeight: '600',
  },
  summaryChipRemove: {
    marginLeft: 6,
    fontSize: 11,
    color: colors.primaryDark,
    fontWeight: '700',
  },
  // Messages
  messageItemContainer: {
    backgroundColor: colors.backgroundSubtle,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  messageNumberBadge: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  deleteMessageText: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: '600',
  },
  messageInput: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 70,
    textAlignVertical: 'top',
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  inputError: {
    borderColor: colors.danger,
  },
  messageMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  charCountText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  addMessageButton: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.primaryLight + '40',
    marginBottom: spacing.md,
  },
  addMessageButtonText: {
    ...typography.button,
    color: colors.primaryDark,
    fontSize: 14,
  },
  inspirationContainer: {
    marginTop: spacing.xs,
  },
  inspirationLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  inspirationScroll: {
    flexDirection: 'row',
  },
  inspirationChip: {
    backgroundColor: colors.secondaryLight,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    maxWidth: 240,
    justifyContent: 'center',
  },
  inspirationChipText: {
    ...typography.caption,
    color: colors.secondaryDark,
    fontStyle: 'italic',
  },
  // Presets & Steppers
  presetChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  presetChip: {
    backgroundColor: colors.backgroundSubtle,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  presetChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  presetChipText: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  presetChipTextActive: {
    color: colors.textInverted,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundSubtle,
    borderRadius: radii.lg,
    padding: spacing.xs,
  },
  stepperButton: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  stepperButtonText: {
    ...typography.button,
    fontSize: 13,
    color: colors.textPrimary,
  },
  stepperValueBox: {
    alignItems: 'center',
  },
  stepperValueText: {
    ...typography.h2,
    color: colors.primaryDark,
  },
  stepperUnitText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  // Actions
  actionsContainer: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    ...shadows.md,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...typography.button,
    color: colors.textInverted,
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  cancelButtonText: {
    ...typography.button,
    color: colors.textSecondary,
  },
});
