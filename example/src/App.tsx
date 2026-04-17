import { useEffect, useRef, useState } from 'react';
import {
  Button,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import Beacon from 'react-native-beacon-kit';
import MonitorThenRangeExample from './MonitorThenRangeExample';
import StabilityScreen from './StabilityScreen';
import TestScreen from './TestScreen';

// Permissions + configure live here — once, at the app level.
// configure() is global library state, not component state. Moving it here
// prevents a second configure() call every time the user switches tabs.
async function requestPermissions() {
  if (Platform.OS !== 'android') return;

  const permissions: (typeof PermissionsAndroid.PERMISSIONS)[keyof typeof PermissionsAndroid.PERMISSIONS][] =
    [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];

  if (Platform.Version >= 31) {
    permissions.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN);
    permissions.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
  }
  if (Platform.Version >= 33) {
    permissions.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  }

  const results = await PermissionsAndroid.requestMultiple(permissions);

  if (
    Platform.Version >= 29 &&
    results[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === 'granted'
  ) {
    await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION
    );
  }
}

export default function App() {
  const initRef = useRef(false);
  const [screen, setScreen] = useState<'test' | 'monitor' | 'stability'>(
    'test'
  );

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    (async () => {
      // Step 1: permissions first — configure() must come after on SDK 34+
      await requestPermissions();

      // Step 2: configure once — all screens share this config
      Beacon.configure({
        scanPeriod: 1100,
        backgroundScanPeriod: 10000,
        betweenScanPeriod: 0,
        foregroundService: true,
        foregroundServiceNotification: {
          title: 'Beacon Example',
          text: 'Scanning for beacons...',
        },
        kalmanFilter: { enabled: true },
        aggressiveBackground: false,
      });

      // Step 3: battery optimization check
      const exempt = await Beacon.isIgnoringBatteryOptimizations();
      console.log(`[beacon] battery optimization exempt: ${exempt}`);
      if (!exempt) {
        Beacon.requestIgnoreBatteryOptimizations();
      }
    })();
  }, []);

  return (
    <View style={styles.root}>
      <View style={styles.tabs}>
        <Button
          title="Test"
          onPress={() => setScreen('test')}
          color={screen === 'test' ? '#007aff' : '#aaa'}
        />
        <Button
          title="Monitor → Range"
          onPress={() => setScreen('monitor')}
          color={screen === 'monitor' ? '#007aff' : '#aaa'}
        />
        <Button
          title="Stability"
          onPress={() => setScreen('stability')}
          color={screen === 'stability' ? '#007aff' : '#aaa'}
        />
      </View>
      {screen === 'test' ? (
        <TestScreen />
      ) : screen === 'monitor' ? (
        <MonitorThenRangeExample />
      ) : (
        <StabilityScreen />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 52,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
});
