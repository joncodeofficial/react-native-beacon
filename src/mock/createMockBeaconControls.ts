import type { BeaconAdapter } from '../context/BeaconContext';
import type {
  Beacon as BeaconReading,
  BeaconEnvironmentState,
  BeaconFailureEvent,
  BeaconsRangedEvent,
  BeaconRegion,
  EddystoneRangedEvent,
  EddystoneRegion,
  EddystoneUidReading,
  RegionStateChangedEvent,
  ScannerStateChangedEvent,
} from '../types';

export interface MockBeaconControls {
  readonly adapter: BeaconAdapter;
  simulateRanging(region: BeaconRegion, beacons: BeaconReading[]): void;
  simulateEddystoneRanging(
    region: EddystoneRegion,
    beacons: EddystoneUidReading[]
  ): void;
  simulateRegionEnter(region: BeaconRegion): void;
  simulateRegionExit(region: BeaconRegion): void;
  simulateRangingFailure(event: BeaconFailureEvent): void;
  simulateMonitoringFailure(event: BeaconFailureEvent): void;
  simulateEnvironmentState(state: BeaconEnvironmentState): void;
}

const defaultEnvironmentState: BeaconEnvironmentState = {
  bluetoothEnabled: true,
  locationServicesEnabled: true,
  locationPermissionGranted: true,
  bluetoothPermissionGranted: true,
  backgroundPermissionGranted: true,
  permissionsGranted: true,
  canScanInForeground: true,
  canScanInBackground: true,
};

export function createMockBeaconControls(): MockBeaconControls {
  const beaconsRanged = new Set<(e: BeaconsRangedEvent) => void>();
  const eddystoneRanged = new Set<(e: EddystoneRangedEvent) => void>();
  const rangingFailed = new Set<(e: BeaconFailureEvent) => void>();
  const regionStateChanged = new Set<(e: RegionStateChangedEvent) => void>();
  const monitoringFailed = new Set<(e: BeaconFailureEvent) => void>();
  const scannerStateChanged = new Set<(e: ScannerStateChangedEvent) => void>();

  const adapter: BeaconAdapter = {
    startRanging: () => Promise.resolve(),
    stopRanging: () => Promise.resolve(),
    startMonitoring: () => Promise.resolve(),
    stopMonitoring: () => Promise.resolve(),
    getEnvironmentState: () => Promise.resolve(defaultEnvironmentState),

    onBeaconsRanged(cb) {
      beaconsRanged.add(cb);
      return {
        remove: () => {
          beaconsRanged.delete(cb);
        },
      };
    },
    onEddystoneRanged(cb) {
      eddystoneRanged.add(cb);
      return {
        remove: () => {
          eddystoneRanged.delete(cb);
        },
      };
    },
    onRangingFailed(cb) {
      rangingFailed.add(cb);
      return {
        remove: () => {
          rangingFailed.delete(cb);
        },
      };
    },
    onRegionStateChanged(cb) {
      regionStateChanged.add(cb);
      return {
        remove: () => {
          regionStateChanged.delete(cb);
        },
      };
    },
    onMonitoringFailed(cb) {
      monitoringFailed.add(cb);
      return {
        remove: () => {
          monitoringFailed.delete(cb);
        },
      };
    },
    onScannerStateChanged(cb) {
      scannerStateChanged.add(cb);
      return {
        remove: () => {
          scannerStateChanged.delete(cb);
        },
      };
    },
  };

  return {
    adapter,
    simulateRanging(region, beacons) {
      beaconsRanged.forEach((cb) => cb({ region, beacons }));
    },
    simulateEddystoneRanging(region, beacons) {
      eddystoneRanged.forEach((cb) => cb({ region, beacons }));
    },
    simulateRegionEnter(region) {
      regionStateChanged.forEach((cb) => cb({ region, state: 'inside' }));
    },
    simulateRegionExit(region) {
      regionStateChanged.forEach((cb) => cb({ region, state: 'outside' }));
    },
    simulateRangingFailure(event) {
      rangingFailed.forEach((cb) => cb(event));
    },
    simulateMonitoringFailure(event) {
      monitoringFailed.forEach((cb) => cb(event));
    },
    simulateEnvironmentState(state) {
      scannerStateChanged.forEach((cb) => cb(state));
    },
  };
}
