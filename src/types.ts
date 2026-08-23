// ─── Native / config types ───────────────────────────────────────────────────

export interface BeaconRegion {
  identifier: string;
  uuid: string;
  major?: number;
  minor?: number;
}

export interface EddystoneRegion {
  identifier: string;
  namespace: string;
  instance?: string;
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
  /** Notification accent color, e.g. `"#4F46E5"`. Android only. */
  color?: string;
  /**
   * Adds a "Stop" action button to the notification. Tapping it stops all
   * active ranging/monitoring regions and the foreground service, then fires
   * `onForegroundServiceStopPressed`. Default: false. Android only.
   */
  showStopAction?: boolean;
  /** Label for the stop action button. Default: "Stop". */
  stopActionText?: string;
}

/**
 * Live update for the foreground service notification's title/text, e.g. to
 * show a beacon count instead of a static "Scanning for beacons..." string.
 * No-op if the foreground service isn't currently enabled. Android only.
 */
export type UpdateNotificationConfig = Pick<
  ForegroundServiceNotificationConfig,
  'title' | 'text'
>;

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

// Identifies a specific Activity to deep-link to, e.g. an OEM's autostart /
// protected-apps settings screen. There's no standard Android API for these —
// each manufacturer ships its own, and they're not this library's concern to
// track. See the "OEM settings" section of the README for known pairs.
export interface AutostartTarget {
  packageName: string;
  className: string;
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
  /**
   * BLE MAC address of the advertiser. Stable for hardware beacons (fixed at
   * manufacture); randomized if the advertiser is an Android 10+ phone; always
   * empty on iOS. Treat as secondary metadata — use `uuid:major:minor` as the
   * primary identifier.
   */
  macAddress: string;
  timestamp: number;
}

export interface EddystoneUidReading {
  namespace: string;
  instance: string;
  rssi: number;
  distance: number;
  rawDistance: number;
  txPower: number;
  /**
   * BLE MAC address of the advertiser. Stable for hardware beacons (fixed at
   * manufacture); randomized if the advertiser is an Android 10+ phone; always
   * empty on iOS. Treat as secondary metadata — use `namespace:instance` as the
   * primary identifier.
   */
  macAddress: string;
  timestamp: number;
}

export interface BeaconsRangedEvent {
  region: BeaconRegion;
  beacons: Beacon[];
}

export interface EddystoneRangedEvent {
  region: EddystoneRegion;
  beacons: EddystoneUidReading[];
}

export interface RegionStateChangedEvent {
  region: BeaconRegion;
  state: 'inside' | 'outside';
}

export interface BeaconFailureEvent {
  region?: BeaconRegion | EddystoneRegion;
  code: string;
  message: string;
  nativeCode?: number;
  domain?: string;
}

// Keep one payload shape for both snapshot reads and live updates so apps can
// render diagnostics UI without maintaining separate types.
export type ScannerStateChangedEvent = BeaconEnvironmentState;

/**
 * Fired after the user taps the "Stop" action on the foreground service
 * notification (`foregroundServiceNotification.showStopAction: true`) and
 * the native side has already stopped all active ranging/monitoring regions
 * and the foreground service itself. Android only.
 */
export type ForegroundServiceStopPressedEvent = Readonly<{}>;

// ─── Hook types ──────────────────────────────────────────────────────────────

export type BeaconHookRegionState = 'unknown' | 'inside' | 'outside';

export interface UseBeaconOptions {
  region: BeaconRegion;
  autoStart?: boolean;
  stopOnUnmount?: boolean;
}

export interface UseEddystoneOptions {
  region: EddystoneRegion;
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

export interface UseEddystoneRangingResult extends UseBeaconBaseResult {
  beacons: EddystoneUidReading[];
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
