export { default } from './api/Beacon';

export type {
  Beacon,
  BeaconEnvironmentState,
  BeaconFailureEvent,
  BeaconsRangedEvent,
  BeaconHookRegionState,
  BeaconRegion,
  BeaconScanConfig,
  EddystoneRangedEvent,
  EddystoneRegion,
  EddystoneUidReading,
  ForegroundServiceNotificationConfig,
  KalmanConfig,
  RegionStateChangedEvent,
  ScannerStateChangedEvent,
  UseBeaconBaseResult,
  UseBeaconEnvironmentResult,
  UseBeaconMonitoringResult,
  UseBeaconOptions,
  UseBeaconRangingResult,
  UseEddystoneOptions,
  UseEddystoneRangingResult,
  UseMonitorThenRangeResult,
} from './types';

export { useBeaconEnvironment } from './hooks/useBeaconEnvironment';
export { useBeaconMonitoring } from './hooks/useBeaconMonitoring';
export { useBeaconRanging } from './hooks/useBeaconRanging';
export { useEddystoneRanging } from './hooks/useEddystoneRanging';
export { useMonitorThenRange } from './hooks/useMonitorThenRange';

export { MockBeaconProvider } from './mock/MockBeaconProvider';
export { createMockBeaconControls } from './mock/createMockBeaconControls';
export type { MockBeaconControls } from './mock/createMockBeaconControls';
export type { BeaconAdapter } from './context/BeaconContext';
