// ─── Native / config types ───────────────────────────────────────────────────

export interface BeaconRegion {
  identifier: string;
  uuid: string;
  major?: number;
  minor?: number;
}

// Snapshot of everything an app typically needs to explain why scanning is or
// is not ready right now, without forcing callers to infer it themselves.
export interface BeaconEnvironmentState {
  bluetoothEnabled: boolean;
  locationServicesEnabled: boolean;
  locationPermissionGranted: boolean;
  bluetoothPermissionGranted: boolean;
  backgroundPermissionGranted: boolean;
  permissionsGranted: boolean;
  canScanInForeground: boolean;
  canScanInBackground: boolean;
}

export interface KalmanConfig {
  enabled: boolean;
  q?: number; // process noise — how much you trust movement (default 0.008)
  r?: number; // measurement noise — how much you trust RSSI (default 0.1)
}

export interface ForegroundServiceNotificationConfig {
  title?: string;
  text?: string;
}

export interface BeaconScanConfig {
  /** Scan period while the screen is on, in ms. Minimum: 1100ms. Default: 10000ms. */
  scanPeriod?: number;
  /**
   * Scan period while the screen is off, in ms. Minimum: 10000ms (enforced by the
   * Android BLE throttle — more than 5 startScan() calls in 30s degrades to
   * opportunistic scanning). Default: 10000ms.
   */
  backgroundScanPeriod?: number;
  betweenScanPeriod?: number;
  foregroundService?: boolean;
  foregroundServiceNotification?: ForegroundServiceNotificationConfig;
  kalmanFilter?: KalmanConfig;
  /**
   * Enables aggressive background scanning mode for OEM devices with restrictive
   * power managers (Xiaomi/HyperOS, some Samsung and Huawei models).
   *
   * When true, adds:
   * - BLE scan watchdog: restarts ranging every 20s to beat MIUI's ~20s scan-suspend timer
   * - PARTIAL_WAKE_LOCK: keeps CPU awake so BLE callbacks fire with the screen off
   * - Forced LOW_LATENCY scan mode: prevents MIUI from downgrading to LOW_POWER on screen-off
   *
   * Default: false. Only enable if you've confirmed background scanning stops on
   * the target device without it — these measures increase battery consumption.
   */
  aggressiveBackground?: boolean;
}

// ─── Runtime / event types ───────────────────────────────────────────────────

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

// ─── Hook types ──────────────────────────────────────────────────────────────

export type BeaconHookRegionState = 'unknown' | 'inside' | 'outside';

export interface UseBeaconOptions {
  region: BeaconRegion;
  autoStart?: boolean;
  stopOnUnmount?: boolean;
}

export interface UseBeaconBaseResult {
  error: BeaconFailureEvent | null;
  isActive: boolean;
  isStarting: boolean;
  isStopping: boolean;
  clearError: () => void;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

export interface UseBeaconRangingResult extends UseBeaconBaseResult {
  beacons: Beacon[];
}

export interface UseBeaconMonitoringResult extends UseBeaconBaseResult {
  regionState: BeaconHookRegionState;
}

export interface UseMonitorThenRangeResult extends UseBeaconBaseResult {
  beacons: Beacon[];
  regionState: BeaconHookRegionState;
  isRanging: boolean;
}

export interface UseBeaconEnvironmentResult {
  state: BeaconEnvironmentState | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}
