import { useContext, useEffect, useState } from 'react';
import { BeaconContext } from '../context/BeaconContext';
import type {
  BeaconHookRegionState,
  UseBeaconMonitoringResult,
  UseBeaconOptions,
} from '../types';
import { regionsMatch } from '../utils/beaconUtils';
import { useBeaconController } from './useBeaconController';

export const useBeaconMonitoring = ({
  region,
  autoStart = false,
  stopOnUnmount = true,
}: UseBeaconOptions): UseBeaconMonitoringResult => {
  const beacon = useContext(BeaconContext);
  const [regionState, setRegionState] =
    useState<BeaconHookRegionState>('unknown');

  const controller = useBeaconController({
    autoStart,
    stopOnUnmount,
    region,
    startOperation: () => beacon.startMonitoring(region),
    stopOperation: async () => {
      await beacon.stopMonitoring(region);
      setRegionState('unknown');
    },
    startErrorCode: 'MONITORING_ERROR',
    stopErrorCode: 'MONITORING_ERROR',
  });
  const { clearError, setError } = controller;

  const regionKey = `${region.identifier}:${region.uuid}:${region.major ?? ''}:${region.minor ?? ''}`;

  useEffect(() => {
    const stateSubscription = beacon.onRegionStateChanged((event) => {
      if (!regionsMatch(event.region, region)) return;
      clearError();
      setRegionState(event.state);
    });

    const failureSubscription = beacon.onMonitoringFailed((event) => {
      if (event.region && !regionsMatch(event.region, region)) return;
      setError(event);
    });

    return () => {
      stateSubscription.remove();
      failureSubscription.remove();
    };
    // clearError and setError are stable refs; regionKey captures region by value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionKey]);

  return {
    ...controller,
    regionState,
  };
};
