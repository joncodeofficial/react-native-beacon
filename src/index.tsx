export {
  default,
  type Beacon,
  type BeaconEnvironmentState,
  type BeaconFailureEvent,
  type BeaconsRangedEvent,
  type RegionStateChangedEvent,
  type ScannerStateChangedEvent,
} from './beaconApi';

export type {
  BeaconRegion,
  BeaconScanConfig,
  ForegroundServiceNotificationConfig,
  KalmanConfig,
} from './NativeBeacon';

export {
  type UseBeaconBaseResult,
  type UseBeaconOptions,
} from './useBeaconController';

export {
  useBeaconRanging,
  type UseBeaconRangingResult,
} from './useBeaconRanging';

export {
  useBeaconMonitoring,
  type UseBeaconMonitoringResult,
} from './useBeaconMonitoring';

export {
  useMonitorThenRange,
  type UseMonitorThenRangeResult,
} from './useMonitorThenRange';

export {
  useBeaconEnvironment,
  type UseBeaconEnvironmentResult,
} from './useBeaconEnvironment';

export type { BeaconHookRegionState } from './hookUtils';
