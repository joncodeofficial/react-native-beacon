import { NativeEventEmitter } from 'react-native';
import NativeBeacon from '../native/NativeBeacon';
import type {
  BeaconEnvironmentState,
  BeaconFailureEvent,
  BeaconsRangedEvent,
  BeaconRegion,
  BeaconScanConfig,
  EddystoneRangedEvent,
  EddystoneRegion,
  RegionStateChangedEvent,
  ScannerStateChangedEvent,
} from '../types';

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

// `namespace` is a reserved word in Objective-C++ and breaks codegen if used
// as a TurboModule spec field name (see src/native/NativeBeacon.ts), so the
// wire format uses `eddystoneNamespace`. These helpers keep the public API
// on `namespace` as documented.
type WireRegion = Readonly<{
  identifier: string;
  uuid?: string;
  major?: number;
  minor?: number;
  eddystoneNamespace?: string;
  instance?: string;
}>;

const toWireRegion = (region: BeaconRegion | EddystoneRegion): WireRegion => {
  if (!('namespace' in region)) {
    return region;
  }
  const { namespace, ...rest } = region;
  return { ...rest, eddystoneNamespace: namespace };
};

const fromWireEddystoneRegion = (region: WireRegion): EddystoneRegion => ({
  identifier: region.identifier,
  namespace: region.eddystoneNamespace ?? '',
  instance: region.instance,
});

const Beacon = {
  checkPermissions(): Promise<boolean> {
    return NativeBeacon.checkPermissions();
  },

  getEnvironmentState(): Promise<BeaconEnvironmentState> {
    return NativeBeacon.getEnvironmentState();
  },

  configure(config: BeaconScanConfig): void {
    if (__DEV__) {
      if (config.scanPeriod !== undefined && config.scanPeriod < 1100) {
        console.warn(
          `[BeaconKit] scanPeriod ${config.scanPeriod}ms is below the 1100ms minimum — AltBeacon will clamp it.`
        );
      }
      if (
        config.backgroundScanPeriod !== undefined &&
        config.backgroundScanPeriod < 10000
      ) {
        console.warn(
          `[BeaconKit] backgroundScanPeriod ${config.backgroundScanPeriod}ms is below 10000ms — risks Android BLE scan throttle.`
        );
      }
    }

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

  startRanging(region: BeaconRegion | EddystoneRegion): Promise<void> {
    return NativeBeacon.startRanging(toWireRegion(region));
  },

  stopRanging(region: BeaconRegion | EddystoneRegion): Promise<void> {
    return NativeBeacon.stopRanging(toWireRegion(region));
  },

  startMonitoring(region: BeaconRegion): Promise<void> {
    return NativeBeacon.startMonitoring(region);
  },

  stopMonitoring(region: BeaconRegion): Promise<void> {
    return NativeBeacon.stopMonitoring(region);
  },

  async getRangedRegions(): Promise<BeaconRegion[]> {
    const regions =
      (await NativeBeacon.getRangedRegions()) as unknown as WireRegion[];
    return regions.map((region) =>
      'eddystoneNamespace' in region ? fromWireEddystoneRegion(region) : region
    ) as BeaconRegion[];
  },

  getMonitoredRegions(): Promise<BeaconRegion[]> {
    return NativeBeacon.getMonitoredRegions() as Promise<BeaconRegion[]>;
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

  onEddystoneRanged(callback: (event: EddystoneRangedEvent) => void) {
    const wireCallback = (
      event: Omit<EddystoneRangedEvent, 'region'> & { region: WireRegion }
    ) => callback({ ...event, region: fromWireEddystoneRegion(event.region) });
    return emitter.addListener(
      'onEddystoneRanged',
      wireCallback as (...args: readonly unknown[]) => unknown
    );
  },
};

export default Beacon;
