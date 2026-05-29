import { createContext } from 'react';
import Beacon from '../api/Beacon';
import type {
  BeaconEnvironmentState,
  BeaconFailureEvent,
  BeaconsRangedEvent,
  BeaconRegion,
  RegionStateChangedEvent,
  ScannerStateChangedEvent,
} from '../types';

export interface BeaconAdapter {
  startRanging(region: BeaconRegion): Promise<void>;
  stopRanging(region: BeaconRegion): Promise<void>;
  startMonitoring(region: BeaconRegion): Promise<void>;
  stopMonitoring(region: BeaconRegion): Promise<void>;
  getEnvironmentState(): Promise<BeaconEnvironmentState>;
  onBeaconsRanged(cb: (event: BeaconsRangedEvent) => void): { remove(): void };
  onRangingFailed(cb: (event: BeaconFailureEvent) => void): { remove(): void };
  onRegionStateChanged(cb: (event: RegionStateChangedEvent) => void): {
    remove(): void;
  };
  onMonitoringFailed(cb: (event: BeaconFailureEvent) => void): {
    remove(): void;
  };
  onScannerStateChanged(cb: (event: ScannerStateChangedEvent) => void): {
    remove(): void;
  };
}

// Default value is the real Beacon so apps without a provider work unchanged.
export const BeaconContext = createContext<BeaconAdapter>(Beacon);
