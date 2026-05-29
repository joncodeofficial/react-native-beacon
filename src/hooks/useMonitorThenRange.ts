import { useContext, useEffect, useRef, useState } from 'react';
import { BeaconContext } from '../context/BeaconContext';
import type {
  Beacon as BeaconReading,
  BeaconHookRegionState,
  UseBeaconOptions,
  UseMonitorThenRangeResult,
} from '../types';
import { normalizeBeaconError, regionsMatch } from '../utils/beaconUtils';
import { useBeaconController } from './useBeaconController';

export const useMonitorThenRange = ({
  region,
  autoStart = false,
  stopOnUnmount = true,
}: UseBeaconOptions): UseMonitorThenRangeResult => {
  const [beacons, setBeacons] = useState<BeaconReading[]>([]);
  const [regionState, setRegionState] =
    useState<BeaconHookRegionState>('unknown');
  const [isRanging, setIsRanging] = useState(false);

  const beacon = useContext(BeaconContext);
  const rangeTransitionRef = useRef(false);

  const controller = useBeaconController({
    autoStart,
    stopOnUnmount,
    region,
    startOperation: () => beacon.startMonitoring(region),
    stopOperation: async () => {
      await beacon.stopMonitoring(region);
      await beacon.stopRanging(region);
      setBeacons([]);
      setRegionState('unknown');
      setIsRanging(false);
    },
    startErrorCode: 'MONITORING_ERROR',
    stopErrorCode: 'MONITORING_ERROR',
  });
  const { clearError, setError } = controller;

  const regionKey = `${region.identifier}:${region.uuid}:${region.major ?? ''}:${region.minor ?? ''}`;

  useEffect(() => {
    const rangingSubscription = beacon.onBeaconsRanged((event) => {
      if (!regionsMatch(event.region, region)) return;
      clearError();
      setBeacons(event.beacons);
    });

    const stateSubscription = beacon.onRegionStateChanged((event) => {
      if (!regionsMatch(event.region, region)) return;

      clearError();
      setRegionState(event.state);

      if (rangeTransitionRef.current) return;
      rangeTransitionRef.current = true;

      if (event.state === 'inside') {
        beacon
          .startRanging(region)
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

      beacon
        .stopRanging(region)
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

    const rangingFailedSubscription = beacon.onRangingFailed((event) => {
      if (event.region && !regionsMatch(event.region, region)) return;
      setError(event);
    });

    const monitoringFailedSubscription = beacon.onMonitoringFailed((event) => {
      if (event.region && !regionsMatch(event.region, region)) return;
      setError(event);
    });

    return () => {
      rangingSubscription.remove();
      stateSubscription.remove();
      rangingFailedSubscription.remove();
      monitoringFailedSubscription.remove();
    };
    // clearError and setError are stable refs; regionKey captures region by value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionKey]);

  return {
    ...controller,
    beacons,
    regionState,
    isRanging,
  };
};
