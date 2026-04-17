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

  // Always-current refs so useCallback/useEffect deps stay stable across renders.
  const startOperationRef = useRef(startOperation);
  startOperationRef.current = startOperation;

  const stopOperationRef = useRef(stopOperation);
  stopOperationRef.current = stopOperation;

  const regionRef = useRef(region);
  regionRef.current = region;

  const startErrorCodeRef = useRef(startErrorCode);
  startErrorCodeRef.current = startErrorCode;

  const stopErrorCodeRef = useRef(stopErrorCode);
  stopErrorCodeRef.current = stopErrorCode;

  const clearError = useCallback(() => setError(null), []);

  const start = useCallback(async () => {
    if (startingRef.current || activeRef.current) return;

    startingRef.current = true;
    setIsStarting(true);
    setError(null);

    try {
      await startOperationRef.current();
      activeRef.current = true;
      setIsActive(true);
    } catch (operationError) {
      setError(
        normalizeBeaconError(
          operationError,
          startErrorCodeRef.current,
          regionRef.current
        )
      );
      throw operationError;
    } finally {
      startingRef.current = false;
      setIsStarting(false);
    }
  }, []); // stable — reads latest values from refs

  const stop = useCallback(async () => {
    if (stoppingRef.current) return;

    stoppingRef.current = true;
    setIsStopping(true);

    try {
      await stopOperationRef.current();
      activeRef.current = false;
      setIsActive(false);
    } catch (operationError) {
      setError(
        normalizeBeaconError(
          operationError,
          stopErrorCodeRef.current,
          regionRef.current
        )
      );
      throw operationError;
    } finally {
      stoppingRef.current = false;
      setIsStopping(false);
    }
  }, []); // stable — reads latest values from refs

  useEffect(() => {
    if (!autoStart) return;
    start().catch(() => {});
  }, [autoStart, start]); // start is stable, so this only fires on mount

  // Cleanup runs only on true unmount — stopOperationRef is read at call time.
  useEffect(() => {
    if (!stopOnUnmount) return;
    return () => {
      if (!activeRef.current && !startingRef.current) return;
      stopOperationRef.current().catch(() => {});
    };
  }, [stopOnUnmount]); // no callback dep — avoids running cleanup on every render

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
