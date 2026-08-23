import { PermissionsAndroid, Platform } from 'react-native';
import Beacon, {
  type AutostartTarget,
  type BeaconScanConfig,
} from 'react-native-beacon-kit';
import { formatNotificationText } from './beaconNotificationText';

const DEFAULT_BEACON_CONFIG: BeaconScanConfig = {
  scanPeriod: 1100,
  backgroundScanPeriod: 10000,
  betweenScanPeriod: 0,
  foregroundService: true,
  foregroundServiceNotification: {
    title: 'Beacon Example',
    text: formatNotificationText(0),
    color: '#4F46E5',
    showStopAction: true,
    stopActionText: 'Stop Scanning',
  },
  kalmanFilter: { enabled: true },
  // On by default in this example so background reliability on restrictive
  // OEMs (Xiaomi/HyperOS, some Samsung/Huawei) can be exercised out of the
  // box — most consuming apps should leave this off unless they've verified
  // it's needed. See the README's "aggressiveBackground" section.
  aggressiveBackground: true,
};

// Example app setup lives in one place so every screen can assume Beacon is
// already configured and focus on demonstrating the hooks.
export const requestBeaconPermissions = async () => {
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
};

// configure() is global library state, not component state. Run it once at the
// app level so switching demo screens does not reconfigure the native scanner.
export const updateBeaconExampleConfig = (config: BeaconScanConfig = {}) => {
  Beacon.configure({
    ...DEFAULT_BEACON_CONFIG,
    ...config,
    foregroundServiceNotification: {
      ...DEFAULT_BEACON_CONFIG.foregroundServiceNotification,
      ...config.foregroundServiceNotification,
    },
    kalmanFilter: config.kalmanFilter
      ? {
          ...DEFAULT_BEACON_CONFIG.kalmanFilter,
          ...config.kalmanFilter,
        }
      : DEFAULT_BEACON_CONFIG.kalmanFilter,
  });
};

// react-native-beacon-kit doesn't ship an OEM manufacturer → autostart-screen
// table (those screens are proprietary and drift across ROM versions — see
// the README's "OEM settings" section for more known pairs). This is a
// two-manufacturer example of resolving one from Platform.constants
// .Manufacturer; extend or replace it with whatever your app needs.
const OEM_AUTOSTART_TARGETS: Record<string, AutostartTarget> = {
  xiaomi: {
    packageName: 'com.miui.securitycenter',
    className: 'com.miui.permcenter.autostart.AutoStartManagementActivity',
  },
  samsung: {
    packageName: 'com.samsung.android.lool',
    className: 'com.samsung.android.sm.battery.ui.BatteryActivity',
  },
};

export const resolveOemAutostartTarget = (): AutostartTarget | undefined => {
  if (Platform.OS !== 'android') return undefined;

  const manufacturer = Platform.constants.Manufacturer?.toLowerCase() ?? '';
  const match = Object.keys(OEM_AUTOSTART_TARGETS).find((brand) =>
    manufacturer.includes(brand)
  );
  return match ? OEM_AUTOSTART_TARGETS[match] : undefined;
};

export const initializeBeaconExample = async () => {
  // Step 1: permissions first — configure() must come after on SDK 34+
  await requestBeaconPermissions();

  // Step 2: apply the shared baseline config once during app startup.
  updateBeaconExampleConfig();

  // Step 3: battery optimization check
  const exempt = await Beacon.isIgnoringBatteryOptimizations();
  console.log(`[beacon] battery optimization exempt: ${exempt}`);
  if (!exempt) {
    Beacon.requestIgnoreBatteryOptimizations();
  }
};
