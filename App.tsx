import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import {
  getPermissionStatus,
  openOverlaySettings,
  openUsageStatsSettings,
  getInstalledApps,
  setBlockedApps,
  getBlockedApps,
  configureAndroid,
  drainPendingIntercepts,
  startMonitoring,
  stopMonitoring,
  type AndroidBlockableApp,
  type PendingIntercept,
} from 'expo-app-blocker';

export default function App() {
  const [permissions, setPermissions] = useState<{
    overlay: boolean;
    usageStats: boolean;
    notifications: boolean;
  }>({ overlay: false, usageStats: false, notifications: false });

  const [apps, setApps] = useState<AndroidBlockableApp[]>([]);
  const [blockedPackages, setBlockedState] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingApps, setLoadingApps] = useState(false);
  const [interceptEvents, setInterceptEvents] = useState<PendingIntercept[]>([]);
  const [customTitle, setCustomTitle] = useState('Take a mindful pause');
  const [customText, setCustomText] = useState('Are you sure you want to open this right now?');

  const checkPermissions = useCallback(async () => {
    try {
      const status = await getPermissionStatus();
      if (status.details.platform === 'android') {
        setPermissions({
          overlay: status.details.overlay,
          usageStats: status.details.usageStats,
          notifications: status.details.notifications,
        });
      }
    } catch (e) {
      console.warn('Error checking permissions:', e);
    }
  }, []);

  const loadApps = useCallback(async () => {
    setLoadingApps(true);
    try {
      const installed = await getInstalledApps();
      setApps(installed);
      const currentlyBlocked = getBlockedApps();
      setBlockedState(currentlyBlocked);
    } catch (e) {
      console.warn('Error loading installed apps:', e);
    } finally {
      setLoadingApps(false);
    }
  }, []);

  useEffect(() => {
    checkPermissions();
    loadApps();

    // Poll for intercepts every 2 seconds
    const interval = setInterval(() => {
      try {
        const events = drainPendingIntercepts();
        if (events && events.length > 0) {
          setInterceptEvents((prev) => [...events, ...prev].slice(0, 50));
        }
      } catch (err) {
        // Ignore in development
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [checkPermissions, loadApps]);

  const toggleBlockApp = (packageName: string) => {
    const isBlocked = blockedPackages.includes(packageName);
    const updated = isBlocked
      ? blockedPackages.filter((p) => p !== packageName)
      : [...blockedPackages, packageName];

    setBlockedApps(updated);
    setBlockedState(updated);
  };

  const applyCustomOverlayConfig = () => {
    try {
      configureAndroid({
        overlayTitle: customTitle,
        overlayText: customText,
        overlayBackgroundColor: '#1A1D24',
        overlayTitleColor: '#F5F5F7',
        overlayTextColor: '#9E9EA7',
        overlayTitleFontSize: 24,
        overlayTextFontSize: 16,
        overlayTitleBold: true,
        overlayPadding: 32,
      });
      Alert.alert('Overlay Updated', 'Custom overlay text and styles applied to native prefs.');
    } catch (e) {
      Alert.alert('Error', String(e));
    }
  };

  const filteredApps = apps.filter(
    (app) =>
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.packageName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0E1116" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.headerTitle}>Calm Self: M0 Spike</Text>
        <Text style={styles.headerSubtitle}>
          Feasibility spike for Android foreground detection & overlay
        </Text>

        {/* 1. Permissions Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>1. Required Permissions</Text>
          <View style={styles.permRow}>
            <Text style={styles.permLabel}>Overlay Permission (SYSTEM_ALERT_WINDOW):</Text>
            <Text style={[styles.permStatus, permissions.overlay ? styles.granted : styles.denied]}>
              {permissions.overlay ? 'GRANTED' : 'MISSING'}
            </Text>
          </View>
          {!permissions.overlay && (
            <TouchableOpacity style={styles.actionBtn} onPress={openOverlaySettings}>
              <Text style={styles.btnText}>Open Overlay Settings</Text>
            </TouchableOpacity>
          )}

          <View style={styles.permRow}>
            <Text style={styles.permLabel}>Usage Access (PACKAGE_USAGE_STATS):</Text>
            <Text
              style={[styles.permStatus, permissions.usageStats ? styles.granted : styles.denied]}
            >
              {permissions.usageStats ? 'GRANTED' : 'MISSING'}
            </Text>
          </View>
          {!permissions.usageStats && (
            <TouchableOpacity style={styles.actionBtn} onPress={openUsageStatsSettings}>
              <Text style={styles.btnText}>Open Usage Access Settings</Text>
            </TouchableOpacity>
          )}

          <View style={styles.permRow}>
            <Text style={styles.permLabel}>Notifications:</Text>
            <Text
              style={[
                styles.permStatus,
                permissions.notifications ? styles.granted : styles.denied,
              ]}
            >
              {permissions.notifications ? 'GRANTED' : 'DISABLED'}
            </Text>
          </View>

          <TouchableOpacity style={styles.secondaryBtn} onPress={checkPermissions}>
            <Text style={styles.secondaryBtnText}>Re-check Permissions</Text>
          </TouchableOpacity>
        </View>

        {/* 2. Overlay Customization Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>2. Overlay Message Configuration</Text>
          <Text style={styles.helperText}>
            Configures the native SharedPreferences used directly by the background service.
          </Text>
          <Text style={styles.inputLabel}>Overlay Title:</Text>
          <TextInput
            style={styles.input}
            value={customTitle}
            onChangeText={setCustomTitle}
            placeholder="Overlay Title"
            placeholderTextColor="#666"
          />

          <Text style={styles.inputLabel}>Overlay Message / Subtitle:</Text>
          <TextInput
            style={styles.input}
            value={customText}
            onChangeText={setCustomText}
            placeholder="Overlay Message"
            placeholderTextColor="#666"
          />

          <TouchableOpacity style={styles.primaryBtn} onPress={applyCustomOverlayConfig}>
            <Text style={styles.primaryBtnText}>Apply Overlay Message to Native Prefs</Text>
          </TouchableOpacity>
        </View>

        {/* 3. Service Control */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>3. Background Monitoring Service</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.smallBtn, { backgroundColor: '#2E7D32' }]}
              onPress={() => startMonitoring()}
            >
              <Text style={styles.btnText}>Start Service</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.smallBtn, { backgroundColor: '#C62828' }]}
              onPress={() => stopMonitoring()}
            >
              <Text style={styles.btnText}>Stop Service</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 4. App Picker & Blocked Apps */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            4. Select Apps to Block ({blockedPackages.length} selected)
          </Text>
          <TextInput
            style={styles.input}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search installed apps..."
            placeholderTextColor="#666"
          />
          {loadingApps ? (
            <ActivityIndicator size="small" color="#4A90E2" style={{ marginVertical: 10 }} />
          ) : (
            <View style={styles.appsList}>
              {filteredApps.slice(0, 15).map((app) => {
                const isBlocked = blockedPackages.includes(app.packageName);
                return (
                  <TouchableOpacity
                    key={app.packageName}
                    style={[styles.appItem, isBlocked && styles.appItemBlocked]}
                    onPress={() => toggleBlockApp(app.packageName)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.appName}>{app.name}</Text>
                      <Text style={styles.appPackage}>{app.packageName}</Text>
                    </View>
                    <Text style={[styles.badge, isBlocked ? styles.badgeBlocked : styles.badgeAllow]}>
                      {isBlocked ? 'BLOCKED' : 'ALLOW'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* 5. Intercept Log */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>5. Intercept Detection Log</Text>
          <Text style={styles.helperText}>
            Events captured when a blocked app is brought to foreground:
          </Text>
          {interceptEvents.length === 0 ? (
            <Text style={styles.emptyLogText}>No intercepts recorded yet. Open a blocked app to test!</Text>
          ) : (
            interceptEvents.map((evt, idx) => (
              <View key={idx} style={styles.logItem}>
                <Text style={styles.logApp}>{evt.appName || 'Unknown App'}</Text>
                <Text style={styles.logTime}>
                  {new Date(evt.interceptedAt).toLocaleTimeString()}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0E1116',
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F5F5F7',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8B949E',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#161B22',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#58A6FF',
    marginBottom: 12,
  },
  permRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  permLabel: {
    color: '#C9D1D9',
    fontSize: 13,
    flex: 1,
  },
  permStatus: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  granted: {
    color: '#3FB950',
    backgroundColor: '#13231B',
  },
  denied: {
    color: '#F85149',
    backgroundColor: '#2D1B1B',
  },
  actionBtn: {
    backgroundColor: '#238636',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryBtn: {
    backgroundColor: '#1F6FEB',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  secondaryBtn: {
    backgroundColor: '#21262D',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  secondaryBtnText: {
    color: '#C9D1D9',
    fontSize: 13,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  smallBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  helperText: {
    fontSize: 12,
    color: '#8B949E',
    marginBottom: 10,
  },
  inputLabel: {
    color: '#C9D1D9',
    fontSize: 13,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#0D1117',
    borderWidth: 1,
    borderColor: '#30363D',
    color: '#F0F6FC',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    marginBottom: 10,
  },
  appsList: {
    marginTop: 4,
  },
  appItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#21262D',
  },
  appItemBlocked: {
    backgroundColor: '#211E2B',
  },
  appName: {
    color: '#F0F6FC',
    fontSize: 14,
    fontWeight: '600',
  },
  appPackage: {
    color: '#8B949E',
    fontSize: 11,
  },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeBlocked: {
    backgroundColor: '#DA3633',
    color: '#FFFFFF',
  },
  badgeAllow: {
    backgroundColor: '#21262D',
    color: '#8B949E',
  },
  emptyLogText: {
    color: '#8B949E',
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 8,
  },
  logItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#21262D',
  },
  logApp: {
    color: '#F0F6FC',
    fontSize: 13,
    fontWeight: '500',
  },
  logTime: {
    color: '#8B949E',
    fontSize: 12,
  },
});
