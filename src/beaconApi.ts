import { NativeEventEmitter } from 'react-native';
import NativeBeacon from './NativeBeacon';
import type {
  BeaconEnvironmentState,
  BeaconRegion,
  BeaconScanConfig,
  ForegroundServiceNotificationConfig,
  KalmanConfig,
} from './NativeBeacon';

export type {
  BeaconEnvironmentState,
  BeaconRegion,
  BeaconScanConfig,
  ForegroundServiceNotificationConfig,
  KalmanConfig,
};

export interface Beacon {
  uuid: string;
  major: number;
  minor: number;
  rssi: number;
  /** Kalman-filtered distance in meters (equals rawDistance when filter is disabled). */
  distance: number;
  /** Raw unfiltered distance from AltBeacon. Useful for calibration and debugging. */
  rawDistance: number;
  txPower: number;
  /** @warning May be randomized on Android 10+ — use uuid + major + minor as unique identifier instead. */
  macAddress: string;
  timestamp: number;
}

export interface BeaconsRangedEvent {
  region: BeaconRegion;
  beacons: Beacon[];
}

export interface RegionStateChangedEvent {
  region: BeaconRegion;
  state: 'inside' | 'outside';
}

export interface BeaconFailureEvent {
  region?: BeaconRegion;
  code: string;
  message: string;
  nativeCode?: number;
  domain?: string;
}

// Keep one payload shape for both snapshot reads and live updates so apps can
// render diagnostics UI without maintaining separate types.
export type ScannerStateChangedEvent = BeaconEnvironmentState;

const emitter = new NativeEventEmitter(NativeBeacon);
let hasConfigured = false;
let configuredState: BeaconScanConfig = {};

const mergeBeaconConfig = (
  current: BeaconScanConfig,
  next: BeaconScanConfig
): BeaconScanConfig => ({
  ...current,
  ...next,
  foregroundServiceNotification: next.foregroundServiceNotification
    ? {
        ...current.foregroundServiceNotification,
        ...next.foregroundServiceNotification,
      }
    : current.foregroundServiceNotification,
  kalmanFilter: next.kalmanFilter
    ? {
        ...current.kalmanFilter,
        ...next.kalmanFilter,
      }
    : current.kalmanFilter,
});

const beaconConfigEquals = (a: BeaconScanConfig, b: BeaconScanConfig) =>
  JSON.stringify(a) === JSON.stringify(b);

const Beacon = {
  checkPermissions(): Promise<boolean> {
    return NativeBeacon.checkPermissions();
  },

  getEnvironmentState(): Promise<BeaconEnvironmentState> {
    return NativeBeacon.getEnvironmentState();
  },

  configure(config: BeaconScanConfig): void {
    // Treat configure() as merged global state so repeated calls with the same
    // effective config are a no-op, while partial updates still work.
    const nextConfig = mergeBeaconConfig(configuredState, config);
    if (hasConfigured && beaconConfigEquals(configuredState, nextConfig)) {
      return;
    }

    NativeBeacon.configure(config);
    configuredState = nextConfig;
    hasConfigured = true;
  },

  startRanging(region: BeaconRegion): Promise<void> {
    return NativeBeacon.startRanging(region);
  },

  stopRanging(region: BeaconRegion): Promise<void> {
    return NativeBeacon.stopRanging(region);
  },

  startMonitoring(region: BeaconRegion): Promise<void> {
    return NativeBeacon.startMonitoring(region);
  },

  stopMonitoring(region: BeaconRegion): Promise<void> {
    return NativeBeacon.stopMonitoring(region);
  },

  getRangedRegions(): Promise<BeaconRegion[]> {
    return NativeBeacon.getRangedRegions();
  },

  getMonitoredRegions(): Promise<BeaconRegion[]> {
    return NativeBeacon.getMonitoredRegions();
  },

  isIgnoringBatteryOptimizations(): Promise<boolean> {
    return NativeBeacon.isIgnoringBatteryOptimizations();
  },

  requestIgnoreBatteryOptimizations(): void {
    NativeBeacon.requestIgnoreBatteryOptimizations();
  },

  openAutostartSettings(): void {
    NativeBeacon.openAutostartSettings();
  },

  onBeaconsRanged(callback: (event: BeaconsRangedEvent) => void) {
    return emitter.addListener(
      'onBeaconsRanged',
      callback as (...args: readonly unknown[]) => unknown
    );
  },

  onRegionStateChanged(callback: (event: RegionStateChangedEvent) => void) {
    return emitter.addListener(
      'onRegionStateChanged',
      callback as (...args: readonly unknown[]) => unknown
    );
  },

  onRangingFailed(callback: (event: BeaconFailureEvent) => void) {
    return emitter.addListener(
      'onRangingFailed',
      callback as (...args: readonly unknown[]) => unknown
    );
  },

  onMonitoringFailed(callback: (event: BeaconFailureEvent) => void) {
    return emitter.addListener(
      'onMonitoringFailed',
      callback as (...args: readonly unknown[]) => unknown
    );
  },

  onScannerStateChanged(callback: (event: ScannerStateChangedEvent) => void) {
    return emitter.addListener(
      'onScannerStateChanged',
      callback as (...args: readonly unknown[]) => unknown
    );
  },
};

export default Beacon;
