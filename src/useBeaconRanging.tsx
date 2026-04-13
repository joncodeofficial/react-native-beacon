import { useEffect, useState } from 'react';
import Beacon, { type Beacon as BeaconReading } from './beaconApi';
import { regionsMatch } from './hookUtils';
import {
  useBeaconController,
  type UseBeaconBaseResult,
  type UseBeaconOptions,
} from './useBeaconController';

export interface UseBeaconRangingResult extends UseBeaconBaseResult {
  beacons: BeaconReading[];
}

export const useBeaconRanging = ({
  region,
  autoStart = false,
  stopOnUnmount = true,
}: UseBeaconOptions): UseBeaconRangingResult => {
  const [beacons, setBeacons] = useState<BeaconReading[]>([]);

  const controller = useBeaconController({
    autoStart,
    stopOnUnmount,
    region,
    startOperation: () => Beacon.startRanging(region),
    stopOperation: async () => {
      await Beacon.stopRanging(region);
      setBeacons([]);
    },
    startErrorCode: 'RANGING_ERROR',
    stopErrorCode: 'RANGING_ERROR',
  });
  const { clearError, setError } = controller;

  useEffect(() => {
    const rangingSubscription = Beacon.onBeaconsRanged((event) => {
      if (!regionsMatch(event.region, region)) return;
      clearError();
      setBeacons(event.beacons);
    });

    const failureSubscription = Beacon.onRangingFailed((event) => {
      if (event.region && !regionsMatch(event.region, region)) return;
      setError(event);
    });

    return () => {
      rangingSubscription.remove();
      failureSubscription.remove();
    };
  }, [clearError, region, setError]);

  return {
    ...controller,
    beacons,
  };
};
