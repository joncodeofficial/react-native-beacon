import { NativeEventEmitter } from 'react-native';
import NativeBeacon from './NativeBeacon';
import type {
  BeaconRegion,
  BeaconScanConfig,
  KalmanConfig,
} from './NativeBeacon';

export type { BeaconRegion, BeaconScanConfig, KalmanConfig };

export interface Beacon {
  uuid: string;
  major: number;
  minor: number;
  rssi: number;
  distance: number;
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

const emitter = new NativeEventEmitter(NativeBeacon);

const Beacon = {
  checkPermissions(): Promise<boolean> {
    return NativeBeacon.checkPermissions();
  },

  configure(config: BeaconScanConfig): void {
    NativeBeacon.configure(config);
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
};

export default Beacon;
