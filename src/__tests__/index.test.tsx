import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type {
  BeaconEnvironmentState,
  BeaconRegion,
  BeaconScanConfig,
  BeaconFailureEvent,
  BeaconsRangedEvent,
  EddystoneRangedEvent,
  EddystoneRegion,
  RegionStateChangedEvent,
  ScannerStateChangedEvent,
} from '../index';

type MockNativeModule = {
  checkPermissions: jest.Mock<() => Promise<boolean>>;
  getEnvironmentState: jest.Mock<() => Promise<BeaconEnvironmentState>>;
  configure: jest.Mock<(config: BeaconScanConfig) => void>;
  updateNotification: jest.Mock<
    (config: { title?: string; text?: string }) => void
  >;
  startRanging: jest.Mock<(region: BeaconRegion) => Promise<void>>;
  stopRanging: jest.Mock<(region: BeaconRegion) => Promise<void>>;
  startMonitoring: jest.Mock<(region: BeaconRegion) => Promise<void>>;
  stopMonitoring: jest.Mock<(region: BeaconRegion) => Promise<void>>;
  getRangedRegions: jest.Mock<() => Promise<BeaconRegion[]>>;
  getMonitoredRegions: jest.Mock<() => Promise<BeaconRegion[]>>;
  isIgnoringBatteryOptimizations: jest.Mock<() => Promise<boolean>>;
  requestIgnoreBatteryOptimizations: jest.Mock<() => void>;
  openAutostartSettings: jest.Mock<
    (packageName?: string, className?: string) => void
  >;
  addListener: jest.Mock<(eventName: string) => void>;
  removeListeners: jest.Mock<(count: number) => void>;
};

declare global {
  var __beaconIndexNativeModuleMock: MockNativeModule | undefined;
}

// NativeEventEmitter is mocked at the public API layer so these tests verify
// the contract that app code actually consumes rather than implementation detail.
const mockListeners = new Map<
  string,
  Set<(...args: readonly unknown[]) => unknown>
>();

const createMockNativeModule = (): MockNativeModule => ({
  checkPermissions: jest.fn<() => Promise<boolean>>(),
  getEnvironmentState: jest.fn<() => Promise<BeaconEnvironmentState>>(),
  configure: jest.fn<(config: BeaconScanConfig) => void>(),
  updateNotification:
    jest.fn<(config: { title?: string; text?: string }) => void>(),
  startRanging: jest.fn<(region: BeaconRegion) => Promise<void>>(),
  stopRanging: jest.fn<(region: BeaconRegion) => Promise<void>>(),
  startMonitoring: jest.fn<(region: BeaconRegion) => Promise<void>>(),
  stopMonitoring: jest.fn<(region: BeaconRegion) => Promise<void>>(),
  getRangedRegions: jest.fn<() => Promise<BeaconRegion[]>>(),
  getMonitoredRegions: jest.fn<() => Promise<BeaconRegion[]>>(),
  isIgnoringBatteryOptimizations: jest.fn<() => Promise<boolean>>(),
  requestIgnoreBatteryOptimizations: jest.fn<() => void>(),
  openAutostartSettings:
    jest.fn<(packageName?: string, className?: string) => void>(),
  addListener: jest.fn<(eventName: string) => void>(),
  removeListeners: jest.fn<(count: number) => void>(),
});

jest.mock('react-native', () => {
  const nativeModule =
    globalThis.__beaconIndexNativeModuleMock ?? createMockNativeModule();
  globalThis.__beaconIndexNativeModuleMock = nativeModule;

  return {
    NativeEventEmitter: jest.fn((module: MockNativeModule) => ({
      addListener: (
        eventName: string,
        callback: (...args: readonly unknown[]) => unknown
      ) => {
        module.addListener(eventName);

        let callbacks = mockListeners.get(eventName);
        if (!callbacks) {
          callbacks = new Set();
          mockListeners.set(eventName, callbacks);
        }
        callbacks.add(callback);

        return {
          remove: () => {
            callbacks!.delete(callback);
            module.removeListeners(1);
          },
        };
      },
    })),
    TurboModuleRegistry: {
      getEnforcing: jest.fn(() => nativeModule),
    },
  };
});

import Beacon from '../index';

const getMockNativeModule = (): MockNativeModule => {
  if (!globalThis.__beaconIndexNativeModuleMock) {
    globalThis.__beaconIndexNativeModuleMock = createMockNativeModule();
  }
  return globalThis.__beaconIndexNativeModuleMock;
};

const emitMockEvent = (eventName: string, payload: unknown) => {
  const callbacks = mockListeners.get(eventName);
  callbacks?.forEach((callback) => callback(payload));
};

describe('Beacon', () => {
  const region: BeaconRegion = {
    identifier: 'test-region',
    uuid: 'a1b23c45-d67e-9fab-de12-0034567890ab',
    major: 1,
    minor: 2,
  };

  beforeEach(() => {
    const mockNativeModule = getMockNativeModule();

    jest.clearAllMocks();
    mockListeners.clear();

    mockNativeModule.checkPermissions.mockResolvedValue(true);
    mockNativeModule.getEnvironmentState.mockResolvedValue({
      bluetoothEnabled: true,
      locationServicesEnabled: true,
      locationPermissionGranted: true,
      bluetoothPermissionGranted: true,
      backgroundPermissionGranted: true,
      permissionsGranted: true,
      canScanInForeground: true,
      canScanInBackground: true,
    });
    mockNativeModule.startRanging.mockResolvedValue();
    mockNativeModule.stopRanging.mockResolvedValue();
    mockNativeModule.startMonitoring.mockResolvedValue();
    mockNativeModule.stopMonitoring.mockResolvedValue();
    mockNativeModule.getRangedRegions.mockResolvedValue([]);
    mockNativeModule.getMonitoredRegions.mockResolvedValue([]);
    mockNativeModule.isIgnoringBatteryOptimizations.mockResolvedValue(true);
  });

  describe('unit', () => {
    it('delegates the scanning lifecycle methods to the native module', async () => {
      const mockNativeModule = getMockNativeModule();
      const config: BeaconScanConfig = {
        scanPeriod: 1100,
        backgroundScanPeriod: 10_000,
        betweenScanPeriod: 0,
        foregroundService: true,
      };

      await expect(Beacon.checkPermissions()).resolves.toBe(true);
      await expect(Beacon.getEnvironmentState()).resolves.toEqual({
        bluetoothEnabled: true,
        locationServicesEnabled: true,
        locationPermissionGranted: true,
        bluetoothPermissionGranted: true,
        backgroundPermissionGranted: true,
        permissionsGranted: true,
        canScanInForeground: true,
        canScanInBackground: true,
      });
      Beacon.configure(config);
      await expect(Beacon.startRanging(region)).resolves.toBeUndefined();
      await expect(Beacon.stopRanging(region)).resolves.toBeUndefined();
      await expect(Beacon.startMonitoring(region)).resolves.toBeUndefined();
      await expect(Beacon.stopMonitoring(region)).resolves.toBeUndefined();

      expect(mockNativeModule.checkPermissions).toHaveBeenCalledTimes(1);
      expect(mockNativeModule.getEnvironmentState).toHaveBeenCalledTimes(1);
      expect(mockNativeModule.configure).toHaveBeenCalledWith(config);
      expect(mockNativeModule.startRanging).toHaveBeenCalledWith(region);
      expect(mockNativeModule.stopRanging).toHaveBeenCalledWith(region);
      expect(mockNativeModule.startMonitoring).toHaveBeenCalledWith(region);
      expect(mockNativeModule.stopMonitoring).toHaveBeenCalledWith(region);
    });

    it('treats repeated identical configure calls as a no-op but still allows partial reconfiguration', () => {
      const mockNativeModule = getMockNativeModule();
      const firstConfig: BeaconScanConfig = {
        scanPeriod: 1100,
        backgroundScanPeriod: 10_000,
        betweenScanPeriod: 0,
        foregroundService: true,
        foregroundServiceNotification: {
          title: 'Beacon Example',
        },
      };
      const partialUpdate: BeaconScanConfig = {
        backgroundScanPeriod: 15_000,
      };

      Beacon.configure(firstConfig);
      Beacon.configure(firstConfig);
      Beacon.configure(partialUpdate);
      Beacon.configure(partialUpdate);

      expect(mockNativeModule.configure).toHaveBeenCalledTimes(2);
      expect(mockNativeModule.configure).toHaveBeenNthCalledWith(
        1,
        firstConfig
      );
      expect(mockNativeModule.configure).toHaveBeenNthCalledWith(
        2,
        partialUpdate
      );
    });

    it('delegates region queries and battery helpers to the native module', async () => {
      const mockNativeModule = getMockNativeModule();
      mockNativeModule.getRangedRegions.mockResolvedValue([region]);
      mockNativeModule.getMonitoredRegions.mockResolvedValue([region]);
      mockNativeModule.isIgnoringBatteryOptimizations.mockResolvedValue(false);

      await expect(Beacon.getRangedRegions()).resolves.toEqual([region]);
      await expect(Beacon.getMonitoredRegions()).resolves.toEqual([region]);
      await expect(Beacon.isIgnoringBatteryOptimizations()).resolves.toBe(
        false
      );

      Beacon.requestIgnoreBatteryOptimizations();
      Beacon.openAutostartSettings();

      expect(mockNativeModule.getRangedRegions).toHaveBeenCalledTimes(1);
      expect(mockNativeModule.getMonitoredRegions).toHaveBeenCalledTimes(1);
      expect(
        mockNativeModule.isIgnoringBatteryOptimizations
      ).toHaveBeenCalledTimes(1);
      expect(
        mockNativeModule.requestIgnoreBatteryOptimizations
      ).toHaveBeenCalledTimes(1);
      expect(mockNativeModule.openAutostartSettings).toHaveBeenCalledTimes(1);
    });

    it('propagates native ranging failures without swallowing the error', async () => {
      const mockNativeModule = getMockNativeModule();
      const nativeError = new Error('Bluetooth is off');

      mockNativeModule.startRanging.mockRejectedValue(nativeError);

      await expect(Beacon.startRanging(region)).rejects.toBe(nativeError);
      expect(mockNativeModule.startRanging).toHaveBeenCalledWith(region);
    });

    it('propagates monitoring conflicts from the native layer as-is', async () => {
      const mockNativeModule = getMockNativeModule();
      const conflictError = {
        code: 'RANGING_MONITORING_CONFLICT',
        message:
          "Cannot call startMonitoring on region 'test-region' while ranging is active.",
      };

      mockNativeModule.startMonitoring.mockRejectedValue(conflictError);

      await expect(Beacon.startMonitoring(region)).rejects.toMatchObject({
        code: 'RANGING_MONITORING_CONFLICT',
        message:
          "Cannot call startMonitoring on region 'test-region' while ranging is active.",
      });
      expect(mockNativeModule.startMonitoring).toHaveBeenCalledWith(region);
    });

    it('propagates region query failures to callers', async () => {
      const mockNativeModule = getMockNativeModule();
      const nativeError = new Error('Native module unavailable');

      mockNativeModule.getMonitoredRegions.mockRejectedValue(nativeError);

      await expect(Beacon.getMonitoredRegions()).rejects.toBe(nativeError);
      expect(mockNativeModule.getMonitoredRegions).toHaveBeenCalledTimes(1);
    });
  });

  describe('openAutostartSettings', () => {
    it('passes no target through when the caller gives none', () => {
      const mockNativeModule = getMockNativeModule();

      Beacon.openAutostartSettings();

      expect(mockNativeModule.openAutostartSettings).toHaveBeenCalledWith(
        undefined,
        undefined
      );
    });

    it('passes the caller-supplied target through unchanged', () => {
      const mockNativeModule = getMockNativeModule();

      Beacon.openAutostartSettings({
        packageName: 'com.miui.securitycenter',
        className: 'com.miui.permcenter.autostart.AutoStartManagementActivity',
      });

      expect(mockNativeModule.openAutostartSettings).toHaveBeenCalledWith(
        'com.miui.securitycenter',
        'com.miui.permcenter.autostart.AutoStartManagementActivity'
      );
    });
  });

  describe('updateNotification', () => {
    it('delegates to the native module unchanged', () => {
      const mockNativeModule = getMockNativeModule();

      Beacon.updateNotification({ text: '3 beacons nearby' });

      expect(mockNativeModule.updateNotification).toHaveBeenCalledWith({
        text: '3 beacons nearby',
      });
    });
  });

  // `namespace` is reserved in Objective-C++, so the wire format between JS and
  // native uses `eddystoneNamespace` while the public API keeps `namespace`
  // (see src/api/Beacon.ts). These tests guard that translation.
  describe('eddystone namespace wire translation', () => {
    const eddystoneRegion: EddystoneRegion = {
      identifier: 'eddystone-region',
      namespace: 'edd1ebeac04e5efa1bd6',
      instance: '111111111111',
    };

    it('translates `namespace` to `eddystoneNamespace` when calling startRanging/stopRanging', async () => {
      const mockNativeModule = getMockNativeModule();

      await expect(
        Beacon.startRanging(eddystoneRegion)
      ).resolves.toBeUndefined();
      await expect(
        Beacon.stopRanging(eddystoneRegion)
      ).resolves.toBeUndefined();

      const expectedWireRegion = {
        identifier: eddystoneRegion.identifier,
        instance: eddystoneRegion.instance,
        eddystoneNamespace: eddystoneRegion.namespace,
      } as unknown as BeaconRegion;
      expect(mockNativeModule.startRanging).toHaveBeenCalledWith(
        expectedWireRegion
      );
      expect(mockNativeModule.stopRanging).toHaveBeenCalledWith(
        expectedWireRegion
      );
    });

    it('translates `eddystoneNamespace` back to `namespace` in getRangedRegions results', async () => {
      const mockNativeModule = getMockNativeModule();
      mockNativeModule.getRangedRegions.mockResolvedValue([
        {
          identifier: eddystoneRegion.identifier,
          instance: eddystoneRegion.instance,
          eddystoneNamespace: eddystoneRegion.namespace,
        } as unknown as BeaconRegion,
      ]);

      await expect(Beacon.getRangedRegions()).resolves.toEqual([
        eddystoneRegion,
      ]);
    });

    it('translates the region in onEddystoneRanged events back to `namespace`', () => {
      const callback = jest.fn<(event: EddystoneRangedEvent) => void>();
      const wireEvent = {
        region: {
          identifier: eddystoneRegion.identifier,
          instance: eddystoneRegion.instance,
          eddystoneNamespace: eddystoneRegion.namespace,
        },
        beacons: [
          {
            namespace: eddystoneRegion.namespace,
            instance: eddystoneRegion.instance!,
            rssi: -61,
            distance: 0.8,
            rawDistance: 0.9,
            txPower: -59,
            macAddress: 'AA:BB:CC:DD:EE:FF',
            timestamp: 1_713_000_000_000,
          },
        ],
      };

      Beacon.onEddystoneRanged(callback);
      emitMockEvent('onEddystoneRanged', wireEvent);

      expect(callback).toHaveBeenCalledWith({
        region: eddystoneRegion,
        beacons: wireEvent.beacons,
      });
    });
  });

  describe('integration', () => {
    it('delivers ranging events through the public subscription API and removes listeners cleanly', () => {
      const mockNativeModule = getMockNativeModule();
      const callback = jest.fn<(event: BeaconsRangedEvent) => void>();
      const event: BeaconsRangedEvent = {
        region,
        beacons: [
          {
            uuid: region.uuid,
            major: 1,
            minor: 2,
            rssi: -64,
            distance: 1.42,
            rawDistance: 1.7,
            txPower: -59,
            macAddress: 'AA:BB:CC:DD:EE:FF',
            timestamp: 1_713_000_000_000,
          },
        ],
      };

      const subscription = Beacon.onBeaconsRanged(callback);

      emitMockEvent('onBeaconsRanged', event);
      expect(callback).toHaveBeenCalledWith(event);
      expect(mockNativeModule.addListener).toHaveBeenCalledWith(
        'onBeaconsRanged'
      );

      subscription.remove();
      emitMockEvent('onBeaconsRanged', event);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(mockNativeModule.removeListeners).toHaveBeenCalledWith(1);
    });

    it('delivers monitoring state changes to each active subscriber independently', () => {
      const mockNativeModule = getMockNativeModule();
      const firstCallback = jest.fn<(event: RegionStateChangedEvent) => void>();
      const secondCallback =
        jest.fn<(event: RegionStateChangedEvent) => void>();
      const event: RegionStateChangedEvent = {
        region,
        state: 'inside',
      };

      const firstSubscription = Beacon.onRegionStateChanged(firstCallback);
      Beacon.onRegionStateChanged(secondCallback);

      emitMockEvent('onRegionStateChanged', event);

      expect(firstCallback).toHaveBeenCalledWith(event);
      expect(secondCallback).toHaveBeenCalledWith(event);
      expect(mockNativeModule.addListener).toHaveBeenCalledWith(
        'onRegionStateChanged'
      );

      firstSubscription.remove();
      emitMockEvent('onRegionStateChanged', {
        ...event,
        state: 'outside',
      });

      expect(firstCallback).toHaveBeenCalledTimes(1);
      expect(secondCallback).toHaveBeenCalledTimes(2);
    });

    it('delivers ranging failure events through the public subscription API', () => {
      const mockNativeModule = getMockNativeModule();
      const callback = jest.fn<(event: BeaconFailureEvent) => void>();
      const event: BeaconFailureEvent = {
        region,
        code: 'RANGING_ERROR',
        message: 'Bluetooth is off',
        nativeCode: 42,
        domain: 'CoreLocation',
      };

      const subscription = Beacon.onRangingFailed(callback);

      emitMockEvent('onRangingFailed', event);

      expect(callback).toHaveBeenCalledWith(event);
      expect(mockNativeModule.addListener).toHaveBeenCalledWith(
        'onRangingFailed'
      );

      subscription.remove();
      emitMockEvent('onRangingFailed', event);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(mockNativeModule.removeListeners).toHaveBeenCalledWith(1);
    });

    it('delivers monitoring failure events through the public subscription API', () => {
      const mockNativeModule = getMockNativeModule();
      const callback = jest.fn<(event: BeaconFailureEvent) => void>();
      const event: BeaconFailureEvent = {
        region,
        code: 'MONITORING_ERROR',
        message: 'Location permission was revoked',
      };

      Beacon.onMonitoringFailed(callback);
      emitMockEvent('onMonitoringFailed', event);

      expect(callback).toHaveBeenCalledWith(event);
      expect(mockNativeModule.addListener).toHaveBeenCalledWith(
        'onMonitoringFailed'
      );
    });

    it('delivers scanner state changes through the public subscription API', () => {
      const mockNativeModule = getMockNativeModule();
      const callback = jest.fn<(event: ScannerStateChangedEvent) => void>();
      const event: ScannerStateChangedEvent = {
        bluetoothEnabled: false,
        locationServicesEnabled: true,
        locationPermissionGranted: true,
        bluetoothPermissionGranted: true,
        backgroundPermissionGranted: false,
        permissionsGranted: true,
        canScanInForeground: false,
        canScanInBackground: false,
      };

      const subscription = Beacon.onScannerStateChanged(callback);
      emitMockEvent('onScannerStateChanged', event);

      expect(callback).toHaveBeenCalledWith(event);
      expect(mockNativeModule.addListener).toHaveBeenCalledWith(
        'onScannerStateChanged'
      );

      subscription.remove();
      emitMockEvent('onScannerStateChanged', {
        ...event,
        bluetoothEnabled: true,
      });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(mockNativeModule.removeListeners).toHaveBeenCalledWith(1);
    });

    it('delivers foreground service stop-pressed events through the public subscription API', () => {
      const mockNativeModule = getMockNativeModule();
      const callback = jest.fn<(event: Readonly<{}>) => void>();

      const subscription = Beacon.onForegroundServiceStopPressed(callback);
      emitMockEvent('onForegroundServiceStopPressed', {});

      expect(callback).toHaveBeenCalledWith({});
      expect(mockNativeModule.addListener).toHaveBeenCalledWith(
        'onForegroundServiceStopPressed'
      );

      subscription.remove();
      emitMockEvent('onForegroundServiceStopPressed', {});

      expect(callback).toHaveBeenCalledTimes(1);
      expect(mockNativeModule.removeListeners).toHaveBeenCalledWith(1);
    });
  });
});
