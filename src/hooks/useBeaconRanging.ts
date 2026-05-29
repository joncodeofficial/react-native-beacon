import { useContext, useEffect, useState } from 'react';
import { BeaconContext } from '../context/BeaconContext';
import type {
  Beacon as BeaconReading,
  UseBeaconOptions,
  UseBeaconRangingResult,
} from '../types';
import { regionsMatch } from '../utils/beaconUtils';
import { useBeaconController } from './useBeaconController';

export const useBeaconRanging = ({
  region,
  autoStart = false,
  stopOnUnmount = true,
}: UseBeaconOptions): UseBeaconRangingResult => {
  const beacon = useContext(BeaconContext);
  const [beacons, setBeacons] = useState<BeaconReading[]>([]);

  const controller = useBeaconController({
    autoStart,
    stopOnUnmount,
    region,
    startOperation: () => beacon.startRanging(region),
    stopOperation: async () => {
      await beacon.stopRanging(region);
      setBeacons([]);
    },
    startErrorCode: 'RANGING_ERROR',
    stopErrorCode: 'RANGING_ERROR',
  });
  const { clearError, setError } = controller;

  const regionKey = `${region.identifier}:${region.uuid}:${region.major ?? ''}:${region.minor ?? ''}`;

  useEffect(() => {
    const rangingSubscription = beacon.onBeaconsRanged((event) => {
      if (!regionsMatch(event.region, region)) return;
      clearError();
      setBeacons(event.beacons);
    });

    const failureSubscription = beacon.onRangingFailed((event) => {
      if (event.region && !regionsMatch(event.region, region)) return;
      setError(event);
    });

    return () => {
      rangingSubscription.remove();
      failureSubscription.remove();
    };
    // clearError and setError are stable refs; regionKey captures region by value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionKey]);

  return {
    ...controller,
    beacons,
  };
};
