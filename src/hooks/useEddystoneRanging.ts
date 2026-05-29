import { useContext, useEffect, useState } from 'react';
import { BeaconContext } from '../context/BeaconContext';
import type {
  EddystoneUidReading,
  UseEddystoneOptions,
  UseEddystoneRangingResult,
} from '../types';
import { useBeaconController } from './useBeaconController';

export const useEddystoneRanging = ({
  region,
  autoStart = false,
  stopOnUnmount = true,
}: UseEddystoneOptions): UseEddystoneRangingResult => {
  const beacon = useContext(BeaconContext);
  const [beacons, setBeacons] = useState<EddystoneUidReading[]>([]);

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

  const regionKey = `${region.identifier}:${region.namespace}:${region.instance ?? ''}`;

  useEffect(() => {
    const rangingSubscription = beacon.onEddystoneRanged((event) => {
      if (event.region.identifier !== region.identifier) return;
      clearError();
      setBeacons(event.beacons);
    });

    const failureSubscription = beacon.onRangingFailed((event) => {
      if (event.region && event.region.identifier !== region.identifier) return;
      setError(event);
    });

    return () => {
      rangingSubscription.remove();
      failureSubscription.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionKey]);

  return { ...controller, beacons };
};
