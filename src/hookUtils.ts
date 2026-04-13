import type { BeaconFailureEvent, BeaconRegion } from './index';

export type BeaconHookRegionState = 'unknown' | 'inside' | 'outside';

const normalizeUuid = (value: string | undefined) => value?.toLowerCase();

const isBeaconFailureEvent = (
  error: unknown
): error is Pick<BeaconFailureEvent, 'code' | 'message'> &
  Partial<BeaconFailureEvent> => {
  const failure = error as Partial<BeaconFailureEvent> | null;

  return (
    failure !== null &&
    typeof failure === 'object' &&
    typeof failure.code === 'string' &&
    typeof failure.message === 'string'
  );
};

export const regionsMatch = (
  left: BeaconRegion | undefined,
  right: BeaconRegion | undefined
) => {
  if (!left || !right) return false;

  return (
    left.identifier === right.identifier &&
    normalizeUuid(left.uuid) === normalizeUuid(right.uuid) &&
    left.major === right.major &&
    left.minor === right.minor
  );
};

export const normalizeBeaconError = (
  error: unknown,
  code: string,
  region?: BeaconRegion
): BeaconFailureEvent => {
  if (isBeaconFailureEvent(error)) {
    return {
      region: error.region ?? region,
      code: error.code,
      message: error.message,
      nativeCode: error.nativeCode,
      domain: error.domain,
    };
  }

  if (error instanceof Error) {
    return {
      region,
      code,
      message: error.message,
    };
  }

  return {
    region,
    code,
    message: 'Unknown error',
  };
};
