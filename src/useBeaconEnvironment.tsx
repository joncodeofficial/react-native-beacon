import { useCallback, useEffect, useState } from 'react';
import Beacon, { type BeaconEnvironmentState } from './beaconApi';

export interface UseBeaconEnvironmentResult {
  state: BeaconEnvironmentState | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export const useBeaconEnvironment = (): UseBeaconEnvironmentResult => {
  const [state, setState] = useState<BeaconEnvironmentState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Refresh is exposed so apps can force a new snapshot after their own
  // permission flows or settings deep-links complete.
  const refresh = useCallback(async () => {
    setError(null);

    try {
      const nextState = await Beacon.getEnvironmentState();
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
  }, []);

  useEffect(() => {
    refresh().catch(() => {});

    const subscription = Beacon.onScannerStateChanged((nextState) => {
      setError(null);
      setState(nextState);
      setIsLoading(false);
    });

    return () => {
      subscription.remove();
    };
  }, [refresh]);

  return {
    state,
    isLoading,
    error,
    refresh,
  };
};
