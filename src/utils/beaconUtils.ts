import type {
  BeaconFailureEvent,
  BeaconRegion,
  EddystoneRegion,
} from '../types';

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
  left: BeaconRegion | EddystoneRegion | undefined,
  right: BeaconRegion | EddystoneRegion | undefined
) => {
  if (!left || !right) return false;
  if (left.identifier !== right.identifier) return false;

  if ('uuid' in left && 'uuid' in right) {
    return (
      normalizeUuid(left.uuid) === normalizeUuid(right.uuid) &&
      left.major === right.major &&
      left.minor === right.minor
    );
  }

  if ('namespace' in left && 'namespace' in right) {
    return (
      left.namespace === right.namespace && left.instance === right.instance
    );
  }

  return false;
};

export const normalizeBeaconError = (
  error: unknown,
  code: string,
  region?: BeaconRegion | EddystoneRegion
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
