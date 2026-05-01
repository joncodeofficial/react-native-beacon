// Types here are intentionally duplicated from types.ts.
// The React Native Codegen parser does not follow imports — it only reads
// declarations in this file. Keep both in sync; tsc enforces it in CI.
import { TurboModuleRegistry, type TurboModule } from 'react-native';

export interface Spec extends TurboModule {
  // Checks permissions without requesting them — the developer's responsibility
  checkPermissions(): Promise<boolean>;

  // Returns a snapshot of device state relevant to beacon scanning
  getEnvironmentState(): Promise<
    Readonly<{
      bluetoothEnabled: boolean;
      locationServicesEnabled: boolean;
      locationPermissionGranted: boolean;
      bluetoothPermissionGranted: boolean;
      backgroundPermissionGranted: boolean;
      permissionsGranted: boolean;
      canScanInForeground: boolean;
      canScanInBackground: boolean;
    }>
  >;

  // Sets scan intervals and optionally enables the foreground service
  configure(
    config: Readonly<{
      scanPeriod?: number;
      backgroundScanPeriod?: number;
      betweenScanPeriod?: number;
      foregroundService?: boolean;
      foregroundServiceNotification?: Readonly<{
        title?: string;
        text?: string;
      }>;
      kalmanFilter?: Readonly<{
        enabled: boolean;
        q?: number;
        r?: number;
      }>;
      filterTimeout?: number;
      aggressiveBackground?: boolean;
    }>
  ): void;

  // Ranging: detects nearby beacons with RSSI and distance (~every 1s)
  startRanging(
    region: Readonly<{
      identifier: string;
      uuid: string;
      major?: number;
      minor?: number;
    }>
  ): Promise<void>;
  stopRanging(
    region: Readonly<{
      identifier: string;
      uuid: string;
      major?: number;
      minor?: number;
    }>
  ): Promise<void>;

  // Monitoring: detects region entry/exit (battery efficient)
  startMonitoring(
    region: Readonly<{
      identifier: string;
      uuid: string;
      major?: number;
      minor?: number;
    }>
  ): Promise<void>;
  stopMonitoring(
    region: Readonly<{
      identifier: string;
      uuid: string;
      major?: number;
      minor?: number;
    }>
  ): Promise<void>;

  // Returns the currently active ranging / monitoring regions
  getRangedRegions(): Promise<
    ReadonlyArray<
      Readonly<{
        identifier: string;
        uuid: string;
        major?: number;
        minor?: number;
      }>
    >
  >;
  getMonitoredRegions(): Promise<
    ReadonlyArray<
      Readonly<{
        identifier: string;
        uuid: string;
        major?: number;
        minor?: number;
      }>
    >
  >;

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
