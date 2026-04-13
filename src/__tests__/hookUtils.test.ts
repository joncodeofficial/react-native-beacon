import { describe, expect, it } from '@jest/globals';
import type { BeaconRegion } from '../index';
import { normalizeBeaconError, regionsMatch } from '../hookUtils';

describe('hookUtils', () => {
  const region: BeaconRegion = {
    identifier: 'test-region',
    uuid: 'FDA50693-A4E2-4FB1-AFCF-C6EB07647825',
    major: 1,
    minor: 2,
  };

  it('matches regions using identifier, uuid, major, and minor', () => {
    expect(
      regionsMatch(region, {
        identifier: 'test-region',
        uuid: 'fda50693-a4e2-4fb1-afcf-c6eb07647825',
        major: 1,
        minor: 2,
      })
    ).toBe(true);

    expect(
      regionsMatch(region, {
        ...region,
        minor: 3,
      })
    ).toBe(false);
  });

  it('normalizes thrown Error instances into beacon failure events', () => {
    expect(
      normalizeBeaconError(new Error('Boom'), 'RANGING_ERROR', region)
    ).toEqual({
      region,
      code: 'RANGING_ERROR',
      message: 'Boom',
    });
  });

  it('preserves native beacon failure payloads when they already match the public shape', () => {
    expect(
      normalizeBeaconError(
        {
          code: 'MONITORING_ERROR',
          message: 'Permission revoked',
          nativeCode: 42,
        },
        'RANGING_ERROR',
        region
      )
    ).toEqual({
      region,
      code: 'MONITORING_ERROR',
      message: 'Permission revoked',
      nativeCode: 42,
      domain: undefined,
    });
  });
});
