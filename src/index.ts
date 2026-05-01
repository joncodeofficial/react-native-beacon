export { default } from './api/Beacon';

export type {
  Beacon,
  BeaconEnvironmentState,
  BeaconFailureEvent,
  BeaconsRangedEvent,
  BeaconHookRegionState,
  BeaconRegion,
  BeaconScanConfig,
  ForegroundServiceNotificationConfig,
  KalmanConfig,
  RegionStateChangedEvent,
  ScannerStateChangedEvent,
  UseBeaconBaseResult,
  UseBeaconEnvironmentResult,
  UseBeaconMonitoringResult,
  UseBeaconOptions,
  UseBeaconRangingResult,
  UseMonitorThenRangeResult,
} from './types';

export { useBeaconEnvironment } from './hooks/useBeaconEnvironment';
export { useBeaconMonitoring } from './hooks/useBeaconMonitoring';
export { useBeaconRanging } from './hooks/useBeaconRanging';
export { useMonitorThenRange } from './hooks/useMonitorThenRange';
