import { useCallback, useContext, useEffect, useState } from 'react';
import { BeaconContext } from '../context/BeaconContext';
import type {
  BeaconEnvironmentState,
  UseBeaconEnvironmentResult,
} from '../types';

export const useBeaconEnvironment = (): UseBeaconEnvironmentResult => {
  const beacon = useContext(BeaconContext);
  const [state, setState] = useState<BeaconEnvironmentState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Refresh is exposed so apps can force a new snapshot after their own
  // permission flows or settings deep-links complete.
  const refresh = useCallback(async () => {
    setError(null);

    try {
      const nextState = await beacon.getEnvironmentState();
      setState(nextState);
    } catch (refreshError) {
      const nextError =
        refreshError instanceof Error
          ? refreshError
          : new Error(String(refreshError));
      setError(nextError);
      throw refreshError;
    } finally {
      setIsLoading(false);
    }
  }, [beacon]);

  useEffect(() => {
    refresh().catch(() => {});

    const subscription = beacon.onScannerStateChanged((nextState) => {
      setError(null);
      setState(nextState);
      setIsLoading(false);
    });

    return () => {
      subscription.remove();
    };
  }, [beacon, refresh]);

  return {
    state,
    isLoading,
    error,
    refresh,
  };
};
