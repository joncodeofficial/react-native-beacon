import { TurboModuleRegistry, type TurboModule } from 'react-native';
import type {
  BeaconEnvironmentState,
  BeaconRegion,
  BeaconScanConfig,
} from '../types';

export interface Spec extends TurboModule {
  // Checks permissions without requesting them — the developer's responsibility
  checkPermissions(): Promise<boolean>;

  // Returns a snapshot of device state relevant to beacon scanning
  getEnvironmentState(): Promise<BeaconEnvironmentState>;

  // Sets scan intervals and optionally enables the foreground service
  configure(config: BeaconScanConfig): void;

  // Ranging: detects nearby beacons with RSSI and distance (~every 1s)
  startRanging(region: BeaconRegion): Promise<void>;
  stopRanging(region: BeaconRegion): Promise<void>;

  // Monitoring: detects region entry/exit (battery efficient)
  startMonitoring(region: BeaconRegion): Promise<void>;
  stopMonitoring(region: BeaconRegion): Promise<void>;

  // Returns the currently active ranging / monitoring regions
  getRangedRegions(): Promise<BeaconRegion[]>;
  getMonitoredRegions(): Promise<BeaconRegion[]>;

  // Battery optimization — required for reliable scanning with screen off
  isIgnoringBatteryOptimizations(): Promise<boolean>;
  requestIgnoreBatteryOptimizations(): void;

  // Opens OEM-specific autostart/background permission settings.
  // On Xiaomi opens Autostart management directly; falls back to App Info on other devices.
  openAutostartSettings(): void;

  // Required by NativeEventEmitter
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('Beacon');
