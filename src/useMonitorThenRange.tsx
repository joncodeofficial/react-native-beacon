import { useEffect, useRef, useState } from 'react';
import Beacon, { type Beacon as BeaconReading } from './beaconApi';
import {
  normalizeBeaconError,
  regionsMatch,
  type BeaconHookRegionState,
} from './hookUtils';
import {
  useBeaconController,
  type UseBeaconBaseResult,
  type UseBeaconOptions,
} from './useBeaconController';

export interface UseMonitorThenRangeResult extends UseBeaconBaseResult {
  beacons: BeaconReading[];
  regionState: BeaconHookRegionState;
  isRanging: boolean;
}

export const useMonitorThenRange = ({
  region,
  autoStart = false,
  stopOnUnmount = true,
}: UseBeaconOptions): UseMonitorThenRangeResult => {
  const [beacons, setBeacons] = useState<BeaconReading[]>([]);
  const [regionState, setRegionState] =
    useState<BeaconHookRegionState>('unknown');
  const [isRanging, setIsRanging] = useState(false);

  const rangeTransitionRef = useRef(false);

  const controller = useBeaconController({
    autoStart,
    stopOnUnmount,
    region,
    startOperation: () => Beacon.startMonitoring(region),
    stopOperation: async () => {
      await Beacon.stopMonitoring(region);
      await Beacon.stopRanging(region);
      setBeacons([]);
      setRegionState('unknown');
      setIsRanging(false);
    },
    startErrorCode: 'MONITORING_ERROR',
    stopErrorCode: 'MONITORING_ERROR',
  });
  const { clearError, setError } = controller;

  useEffect(() => {
    const rangingSubscription = Beacon.onBeaconsRanged((event) => {
      if (!regionsMatch(event.region, region)) return;
      clearError();
      setBeacons(event.beacons);
    });

    const stateSubscription = Beacon.onRegionStateChanged((event) => {
      if (!regionsMatch(event.region, region)) return;

      clearError();
      setRegionState(event.state);

      if (rangeTransitionRef.current) return;
      rangeTransitionRef.current = true;

      if (event.state === 'inside') {
        Beacon.startRanging(region)
          .then(() => {
            setIsRanging(true);
          })
          .catch((operationError) => {
            setError(
              normalizeBeaconError(operationError, 'RANGING_ERROR', region)
            );
          })
          .finally(() => {
            rangeTransitionRef.current = false;
          });
        return;
      }

      Beacon.stopRanging(region)
        .then(() => {
          setBeacons([]);
          setIsRanging(false);
        })
        .catch((operationError) => {
          setError(
            normalizeBeaconError(operationError, 'RANGING_ERROR', region)
          );
        })
        .finally(() => {
          rangeTransitionRef.current = false;
        });
    });

    const rangingFailedSubscription = Beacon.onRangingFailed((event) => {
      if (event.region && !regionsMatch(event.region, region)) return;
      setError(event);
    });

    const monitoringFailedSubscription = Beacon.onMonitoringFailed((event) => {
      if (event.region && !regionsMatch(event.region, region)) return;
      setError(event);
    });

    return () => {
      rangingSubscription.remove();
      stateSubscription.remove();
      rangingFailedSubscription.remove();
      monitoringFailedSubscription.remove();
    };
  }, [clearError, region, setError]);

  return {
    ...controller,
    beacons,
    regionState,
    isRanging,
  };
};
