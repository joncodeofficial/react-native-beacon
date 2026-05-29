/**
 * These tests demonstrate MockBeaconProvider usage.
 *
 * Notice what's NOT here compared to useBeaconHooks.test.tsx:
 * - No NativeEventEmitter setup
 * - No TurboModuleRegistry wiring
 * - No mockListeners map
 * - No emitMockEvent helper
 *
 * Just: create controls, wrap with provider, simulate events.
 */

// Minimal stub — prevents the Beacon import chain from throwing in Jest.
// MockBeaconProvider overrides the context so none of these are ever called.
const { jest: mockJest } =
  require('@jest/globals') as typeof import('@jest/globals');
mockJest.mock('react-native', () => ({
  NativeEventEmitter: mockJest.fn(() => ({ addListener: mockJest.fn() })),
  TurboModuleRegistry: { getEnforcing: mockJest.fn(() => ({})) },
}));

import { Text, View } from 'react-native';
import { act, render, waitFor } from '@testing-library/react-native';

const { describe, it, expect, beforeEach } =
  require('@jest/globals') as typeof import('@jest/globals');

const {
  createMockBeaconControls,
  MockBeaconProvider,
  useBeaconRanging,
  useBeaconMonitoring,
  useBeaconEnvironment,
} = require('../index') as typeof import('../index');

import type {
  Beacon as BeaconReading,
  BeaconRegion,
  MockBeaconControls,
} from '../index';

const region: BeaconRegion = {
  identifier: 'store',
  uuid: 'FDA50693-A4E2-4FB1-AFCF-C6EB07647825',
};

const fakeBeacon: BeaconReading = {
  uuid: region.uuid,
  major: 1,
  minor: 2,
  rssi: -65,
  distance: 1.2,
  rawDistance: 1.5,
  txPower: -59,
  macAddress: 'AA:BB:CC:DD:EE:FF',
  timestamp: 1_713_000_000_000,
};

// ─── Test components ──────────────────────────────────────────────────────────

function RangingScreen() {
  const { beacons, isActive, start } = useBeaconRanging({ region });
  return (
    <View>
      <Text testID="count">{beacons.length}</Text>
      <Text testID="active">{isActive ? 'active' : 'inactive'}</Text>
      <Text testID="start" onPress={() => void start()}>
        Start
      </Text>
    </View>
  );
}

function MonitoringScreen() {
  const { regionState } = useBeaconMonitoring({ region });
  return <Text testID="state">{regionState}</Text>;
}

function EnvironmentScreen() {
  const { state } = useBeaconEnvironment();
  return (
    <Text testID="bluetooth">
      {state ? (state.bluetoothEnabled ? 'on' : 'off') : 'loading'}
    </Text>
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('MockBeaconProvider', () => {
  let controls: MockBeaconControls;

  beforeEach(() => {
    controls = createMockBeaconControls();
  });

  it('simulateRanging updates the beacons list in the hook', async () => {
    const { getByTestId } = render(
      <MockBeaconProvider controls={controls}>
        <RangingScreen />
      </MockBeaconProvider>
    );

    expect(getByTestId('count').props.children).toBe(0);

    act(() => {
      controls.simulateRanging(region, [fakeBeacon]);
    });

    expect(getByTestId('count').props.children).toBe(1);
  });

  it('simulateRegionEnter / Exit updates regionState', async () => {
    const { getByTestId } = render(
      <MockBeaconProvider controls={controls}>
        <MonitoringScreen />
      </MockBeaconProvider>
    );

    expect(getByTestId('state').props.children).toBe('unknown');

    act(() => {
      controls.simulateRegionEnter(region);
    });

    expect(getByTestId('state').props.children).toBe('inside');

    act(() => {
      controls.simulateRegionExit(region);
    });

    expect(getByTestId('state').props.children).toBe('outside');
  });

  it('simulateEnvironmentState updates useBeaconEnvironment', async () => {
    const { getByTestId } = render(
      <MockBeaconProvider controls={controls}>
        <EnvironmentScreen />
      </MockBeaconProvider>
    );

    // default environment has bluetoothEnabled: true
    await waitFor(() => {
      expect(getByTestId('bluetooth').props.children).toBe('on');
    });

    act(() => {
      controls.simulateEnvironmentState({
        bluetoothEnabled: false,
        locationServicesEnabled: true,
        locationPermissionGranted: true,
        bluetoothPermissionGranted: true,
        backgroundPermissionGranted: true,
        permissionsGranted: true,
        canScanInForeground: false,
        canScanInBackground: false,
      });
    });

    expect(getByTestId('bluetooth').props.children).toBe('off');
  });

  it('start() on the hook resolves without touching native code', async () => {
    const { getByTestId } = render(
      <MockBeaconProvider controls={controls}>
        <RangingScreen />
      </MockBeaconProvider>
    );

    await act(async () => {
      getByTestId('start').props.onPress();
    });

    await waitFor(() => {
      expect(getByTestId('active').props.children).toBe('active');
    });
  });
});
