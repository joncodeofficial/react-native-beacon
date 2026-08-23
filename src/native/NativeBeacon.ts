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
        color?: string;
        showStopAction?: boolean;
        stopActionText?: string;
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

  // Ranging: detects nearby beacons with RSSI and distance (~every 1s).
  // Accepts both iBeacon regions (uuid) and Eddystone-UID regions (eddystoneNamespace).
  // NOTE: the field is `eddystoneNamespace`, not `namespace` — `namespace` is a reserved
  // word in Objective-C++ and codegen emits an accessor method named after the field,
  // which fails to compile. The public API still exposes it as `namespace`; the
  // translation happens in src/api/Beacon.ts.
  startRanging(
    region: Readonly<{
      identifier: string;
      uuid?: string;
      major?: number;
      minor?: number;
      eddystoneNamespace?: string;
      instance?: string;
    }>
  ): Promise<void>;
  stopRanging(
    region: Readonly<{
      identifier: string;
      uuid?: string;
      major?: number;
      minor?: number;
      eddystoneNamespace?: string;
      instance?: string;
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
        uuid?: string;
        major?: number;
        minor?: number;
        eddystoneNamespace?: string;
        instance?: string;
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

  // Live update of the foreground service notification's title/text (e.g. a
  // beacon count instead of a static string). No-op if the foreground
  // service isn't currently enabled. Android only — no-op on iOS.
  updateNotification(
    config: Readonly<{
      title?: string;
      text?: string;
    }>
  ): void;

  // Battery optimization — required for reliable scanning with screen off
  isIgnoringBatteryOptimizations(): Promise<boolean>;
  requestIgnoreBatteryOptimizations(): void;

  // Opens an OEM-specific autostart/background-permission settings screen when
  // packageName/className resolve to a real, launchable Activity; otherwise
  // falls back to the app's generic system settings screen. This library
  // doesn't maintain a manufacturer → screen lookup table (those screens are
  // proprietary and drift across ROM versions) — the caller supplies the pair
  // it needs. See the README's "OEM settings" section for known pairs.
  openAutostartSettings(packageName?: string, className?: string): void;

  // Required by NativeEventEmitter
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('Beacon');
