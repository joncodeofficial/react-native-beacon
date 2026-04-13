import { useCallback, useEffect, useRef, useState } from 'react';
import type { BeaconFailureEvent, BeaconRegion } from './beaconApi';
import { normalizeBeaconError } from './hookUtils';

export interface UseBeaconOptions {
  region: BeaconRegion;
  autoStart?: boolean;
  stopOnUnmount?: boolean;
}

export interface UseBeaconBaseResult {
  error: BeaconFailureEvent | null;
  isActive: boolean;
  isStarting: boolean;
  isStopping: boolean;
  clearError: () => void;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

interface UseBeaconControllerOptions {
  autoStart: boolean;
  stopOnUnmount: boolean;
  region: BeaconRegion;
  startOperation: () => Promise<void>;
  stopOperation: () => Promise<void>;
  startErrorCode: string;
  stopErrorCode: string;
}

export const useBeaconController = ({
  autoStart,
  stopOnUnmount,
  region,
  startOperation,
  stopOperation,
  startErrorCode,
  stopErrorCode,
}: UseBeaconControllerOptions) => {
  const [error, setError] = useState<BeaconFailureEvent | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  const startingRef = useRef(false);
  const stoppingRef = useRef(false);
  const activeRef = useRef(false);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const start = useCallback(async () => {
    if (startingRef.current || activeRef.current) return;

    startingRef.current = true;
    setIsStarting(true);
    setError(null);

    try {
      await startOperation();
      activeRef.current = true;
      setIsActive(true);
    } catch (operationError) {
      setError(normalizeBeaconError(operationError, startErrorCode, region));
      throw operationError;
    } finally {
      startingRef.current = false;
      setIsStarting(false);
    }
  }, [region, startErrorCode, startOperation]);

  const stop = useCallback(async () => {
    if (stoppingRef.current) return;

    stoppingRef.current = true;
    setIsStopping(true);

    try {
      await stopOperation();
      activeRef.current = false;
      setIsActive(false);
    } catch (operationError) {
      setError(normalizeBeaconError(operationError, stopErrorCode, region));
      throw operationError;
    } finally {
      stoppingRef.current = false;
      setIsStopping(false);
    }
  }, [region, stopErrorCode, stopOperation]);

  useEffect(() => {
    if (!autoStart) return;
    start().catch(() => {
      // Error state is already captured above.
    });
  }, [autoStart, start]);

  useEffect(() => {
    if (!stopOnUnmount) return;

    return () => {
      if (!activeRef.current && !startingRef.current) return;

      stopOperation().catch(() => {
        // The component is unmounting; there is no useful UI surface left to update.
      });
    };
  }, [stopOnUnmount, stopOperation]);

  return {
    error,
    isActive,
    isStarting,
    isStopping,
    clearError,
    setError,
    start,
    stop,
  };
};
