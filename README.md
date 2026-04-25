# react-native-beacon-kit

iBeacon and AltBeacon for React Native with a hooks-first API, New Architecture support, and real Android background scanning.

> **Platform support:** Android and iOS

## Why this library

- Hooks-first API for React apps
- Low-level API for custom orchestration
- Android background scanning with foreground service support
- iOS monitoring flow for region entry and exit
- iBeacon and AltBeacon support
- Optional Kalman filter for more stable distance readings
- Environment diagnostics for Bluetooth, location services, and permissions
- Expo plugin included

## When to use each API

| API                     | Use it when                                                        |
| ----------------------- | ------------------------------------------------------------------ |
| `useBeaconRanging()`    | You want nearby beacons, RSSI, and distance                        |
| `useBeaconMonitoring()` | You only need `inside` / `outside` region state                    |
| `useMonitorThenRange()` | You want monitoring to wake the flow, then range only while inside |
| `Beacon.*`              | You need custom orchestration or a non-React flow                  |

If you are building a screen in React, start with the hooks API.

## Installation

```sh
npm install react-native-beacon-kit
```

### Expo managed workflow

```json
{
  "expo": {
    "plugins": ["react-native-beacon-kit"]
  }
}
```

Optional iOS background location capability:

```json
{
  "expo": {
    "plugins": [
      [
        "react-native-beacon-kit",
        {
          "iosBackgroundLocation": true
        }
      ]
    ]
  }
}
```

The Expo plugin adds the required native permissions and default iOS location usage strings. It does not request runtime permissions for you.

## Quick start (High-level API)

This is the shortest useful flow for most apps:

1. Mount the hook
2. Request permissions
3. Call `Beacon.configure()`
4. Call `start()`

```ts
import { useCallback } from 'react';
import { Button, Text, View } from 'react-native';
import Beacon, { useBeaconRanging } from 'react-native-beacon-kit';

const region = {
  identifier: 'store',
  uuid: 'FDA50693-A4E2-4FB1-AFCF-C6EB07647825',
};

export const BeaconScreen = () => {
  const { beacons, error, isActive, start, stop } = useBeaconRanging({
    region,
  });

  const handleStart = useCallback(async () => {
    try {
      // Request runtime permissions first.
      await requestPermissions();

      // Configure the native scanner before starting it.
      Beacon.configure({
        scanPeriod: 1100,
        backgroundScanPeriod: 10000,
        betweenScanPeriod: 0,
      });

      await start();
    } catch (error) {
      console.warn('[beacon] start failed', error);
    }
  }, [start]);

  return (
    <View>
      <Text>Detected beacons: {beacons.length}</Text>
      {error ? <Text>{error.message}</Text> : null}
      <Button
        title={isActive ? 'Stop' : 'Start'}
        onPress={isActive ? stop : handleStart}
      />
    </View>
  );
};
```

This shows the smallest useful flow. In a real app, you will usually centralize
permissions and `Beacon.configure()` at the app level, then use hooks inside
screens.

### Important Android note

On Android SDK 34+, call `Beacon.configure({ foregroundService: true })` only after permissions are granted. Calling it too early can throw a `SecurityException` on a fresh install.

## Recommended app-level setup

For apps with multiple screens or shared beacon behavior, do permissions and
initial configuration once at the app level, then let screens use the hooks.

```ts
import { useEffect } from 'react';
import Beacon from 'react-native-beacon-kit';

export const App = () => {
  useEffect(() => {
    const setup = async () => {
      await requestPermissions();

      Beacon.configure({
        scanPeriod: 1100,
        backgroundScanPeriod: 10000,
        betweenScanPeriod: 0,
        foregroundService: true,
        foregroundServiceNotification: {
          title: 'My App',
          text: 'Scanning for beacons...',
        },
      });
    };

    setup().catch((error) => {
      console.warn('[beacon] app setup failed', error);
    });
  }, []);

  return <Screens />;
};
```

For a fuller working example, see the `example/` app in this repository:
[react-native-beacon-kit example](https://github.com/joncodeofficial/react-native-beacon-kit/tree/main/example)

### Low-level API equivalent

Use this style if you need manual orchestration outside the hooks.

```ts
import { useCallback, useEffect, useState } from 'react';
import { Button, Text, View } from 'react-native';
import Beacon from 'react-native-beacon-kit';

const region = {
  identifier: 'store',
  uuid: 'FDA50693-A4E2-4FB1-AFCF-C6EB07647825',
};

export const BeaconScreen = () => {
  const [beacons, setBeacons] = useState([]);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const rangingSub = Beacon.onBeaconsRanged((event) => {
      if (event.region.identifier !== region.identifier) return;
      setError(null);
      setBeacons(event.beacons);
    });

    const failureSub = Beacon.onRangingFailed((event) => {
      if (event.region?.identifier !== region.identifier) return;
      setError(event.message);
    });

    return () => {
      rangingSub.remove();
      failureSub.remove();
    };
  }, []);

  const handleStart = useCallback(async () => {
    try {
      await requestPermissions();
      Beacon.configure({
        scanPeriod: 1100,
        backgroundScanPeriod: 10000,
        betweenScanPeriod: 0,
      });
      await Beacon.startRanging(region);
      setIsActive(true);
    } catch (error) {
      console.warn('[beacon] start failed', error);
    }
  }, []);

  const handleStop = useCallback(async () => {
    await Beacon.stopRanging(region);
    setBeacons([]);
    setIsActive(false);
  }, []);

  return (
    <View>
      <Text>Detected beacons: {beacons.length}</Text>
      {error ? <Text>{error}</Text> : null}
      <Button
        title={isActive ? 'Stop' : 'Start'}
        onPress={isActive ? handleStop : handleStart}
      />
    </View>
  );
};
```

## Platform setup

The library declares native permissions, but runtime permission requests are your responsibility.

### Android

Use [react-native-permissions](https://github.com/zoontek/react-native-permissions) or your own runtime flow.

| Permission                    | When required                               |
| ----------------------------- | ------------------------------------------- |
| `ACCESS_FINE_LOCATION`        | Always                                      |
| `ACCESS_BACKGROUND_LOCATION`  | Android 10+ background scanning             |
| `BLUETOOTH_SCAN`              | Android 12+                                 |
| `BLUETOOTH_CONNECT`           | Android 12+                                 |
| `FOREGROUND_SERVICE`          | Android background scanning                 |
| `FOREGROUND_SERVICE_LOCATION` | Android 14+ location foreground service     |
| `POST_NOTIFICATIONS`          | Android 13+ foreground service notification |

Important notes:

- `ACCESS_BACKGROUND_LOCATION` must be requested separately at runtime
- on Android 13+, `POST_NOTIFICATIONS` should be requested at runtime too
- background scanning requires `foregroundService: true`

### iOS

If you are configuring iOS manually, add these keys to `Info.plist`:

```xml
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>This app uses your location to detect nearby beacons.</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>This app uses your location to detect nearby beacons.</string>
```

If you need background region monitoring, enable **Location updates** in your target's Background Modes capability, or set `iosBackgroundLocation: true` in the Expo plugin.

## Platform behavior and limits

### Android

- Real background scanning requires `foregroundService: true`
- OEM power management can still affect reliability with the screen off
- If you need the strongest background behavior on restrictive devices, see [Advanced Android](#advanced-android)

### iOS

- Continuous background ranging is not supported
- Use monitoring to wake the app, then start ranging during the available execution window
- Android-only options such as `foregroundService`, `aggressiveBackground`, `scanPeriod`, `backgroundScanPeriod`, and `betweenScanPeriod` are ignored on iOS

Typical iOS background pattern:

```ts
Beacon.startMonitoring({ identifier: 'my-region', uuid: '...' });

const sub = Beacon.onRegionStateChanged(({ state }) => {
  if (state === 'inside') {
    Beacon.startRanging({ identifier: 'my-region', uuid: '...' });
  }
});
```

## API summary

### Hooks

Use these hooks if you are building a React screen.

Shared options for the beacon workflow hooks:

- `region`: the beacon region to range or monitor
- `autoStart?`: start automatically when the hook mounts
- `stopOnUnmount?`: stop automatically when the component unmounts

Defaults:

- `autoStart = false`
- `stopOnUnmount = true`

#### `useBeaconRanging({ region, autoStart?, stopOnUnmount? })`

Best for foreground proximity UI when you want nearby beacon readings, RSSI,
and distance.

Returns beacon data plus workflow state:

- `beacons`
- `error`
- `isActive`, `isStarting`, `isStopping`
- `clearError()`
- `start()`, `stop()`

#### `useBeaconMonitoring({ region, autoStart?, stopOnUnmount? })`

Best when you only need region entry and exit state without continuous ranging.

Returns monitoring state plus workflow state:

- `regionState`
- `error`
- `isActive`, `isStarting`, `isStopping`
- `clearError()`
- `start()`, `stop()`

#### `useMonitorThenRange({ region, autoStart?, stopOnUnmount? })`

Best when you want a battery-friendlier workflow that monitors first and ranges
only while the device is inside the region.

Returns combined monitoring and ranging state:

- `beacons`
- `regionState`
- `isRanging`
- `error`
- `isActive`, `isStarting`, `isStopping`
- `clearError()`
- `start()`, `stop()`

## Environment diagnostics

Use `useBeaconEnvironment()` if you want a React-friendly view of scanner
readiness without manually wiring snapshot reads and event subscriptions.

Returns:

- `state`
- `isLoading`
- `error`
- `refresh()`

Example:

```ts
import { Text, View } from 'react-native';
import { useBeaconEnvironment } from 'react-native-beacon-kit';

export const BeaconDiagnostics = () => {
  const { state, isLoading, error, refresh } = useBeaconEnvironment();

  if (isLoading) return <Text>Loading diagnostics...</Text>;
  if (error) return <Text>{error.message}</Text>;
  if (!state) return <Text>Diagnostics unavailable</Text>;

  return (
    <View>
      <Text>Foreground ready: {state.canScanInForeground ? 'yes' : 'no'}</Text>
      <Text>Background ready: {state.canScanInBackground ? 'yes' : 'no'}</Text>
      <Text>Bluetooth: {state.bluetoothEnabled ? 'on' : 'off'}</Text>
      <Text>
        Location services: {state.locationServicesEnabled ? 'on' : 'off'}
      </Text>
      <Text onPress={() => void refresh()}>Refresh diagnostics</Text>
    </View>
  );
};
```

### Low-level API

Use `Beacon.*` if you need custom orchestration outside the hooks.

#### `Beacon.configure(config)`

Call this after permissions are granted and before starting a scan.

```ts
Beacon.configure({
  scanPeriod?: number,
  backgroundScanPeriod?: number,
  betweenScanPeriod?: number,
  foregroundService?: boolean,
  foregroundServiceNotification?: {
    title?: string,
    text?: string,
  },
  kalmanFilter?: {
    enabled: boolean,
    q?: number,
    r?: number,
  },
  aggressiveBackground?: boolean,
});
```

Recommended starting point:

```ts
Beacon.configure({
  scanPeriod: 1100,
  backgroundScanPeriod: 10000,
  betweenScanPeriod: 0,
});
```

Key fields:

- `foregroundService`: enables real Android background scanning
- `kalmanFilter`: smooths distance readings
- `aggressiveBackground`: Android-only fallback for restrictive OEM devices

#### `Beacon.checkPermissions(): Promise<boolean>`

Returns `true` if all required permissions are already granted. It does not request them.

#### `Beacon.getEnvironmentState()`

Returns a snapshot of the current scanning environment:

```ts
const state = await Beacon.getEnvironmentState();
// {
//   bluetoothEnabled,
//   locationServicesEnabled,
//   locationPermissionGranted,
//   bluetoothPermissionGranted,
//   backgroundPermissionGranted,
//   permissionsGranted,
//   canScanInForeground,
//   canScanInBackground,
// }
```

#### `Beacon.startRanging(region)` / `Beacon.stopRanging(region)`

Starts or stops nearby beacon ranging with RSSI and distance.

#### `Beacon.startMonitoring(region)` / `Beacon.stopMonitoring(region)`

Starts or stops region entry and exit monitoring.

#### Events

- `Beacon.onBeaconsRanged(callback)`
- `Beacon.onRegionStateChanged(callback)`
- `Beacon.onRangingFailed(callback)`
- `Beacon.onMonitoringFailed(callback)`
- `Beacon.onScannerStateChanged(callback)`

For hook users, runtime failures are already exposed through each hook's `error` field.

#### Beacon object

```ts
interface Beacon {
  uuid: string;
  major: number;
  minor: number;
  rssi: number;
  distance: number;
  rawDistance: number;
  txPower: number;
  macAddress: string;
  timestamp: number;
}
```

## Advanced Android

This section is only for apps that need strong screen-off reliability on Android.

### Foreground service

Android background scanning requires:

```ts
Beacon.configure({
  foregroundService: true,
});
```

Without a foreground service, Android can stop scanning after the app goes to the background.

### Battery optimization

Some devices are much more aggressive than stock Android. If testing shows background scanning is being throttled, you may need to ask the user to disable battery optimization:

```ts
const exempt = await Beacon.isIgnoringBatteryOptimizations();
if (!exempt) {
  Beacon.requestIgnoreBatteryOptimizations();
}
```

### `aggressiveBackground`

`aggressiveBackground` is off by default and is not needed for most apps.

Use it only if you have verified that screen-off scanning is still being suspended on the target hardware:

```ts
Beacon.configure({
  foregroundService: true,
  aggressiveBackground: true,
});
```

Tradeoff:

- improves survivability on some OEMs
- increases battery usage

### OEM settings

Some OEMs, especially Xiaomi / HyperOS, may require extra manual setup beyond normal Android permissions and foreground service behavior.

You can deep-link the user to the relevant settings page:

```ts
Beacon.openAutostartSettings();
```

Call `openAutostartSettings()` only from a user-initiated action, not during app startup.

## Troubleshooting

### `SecurityException` on fresh install (Android SDK 34+)

`configure({ foregroundService: true })` is being called before runtime permissions finish resolving. Await the permission flow first.

### Ranging returns 0 beacons

Check the basics first:

- the beacon is advertising in a supported format
- permissions were granted
- Bluetooth and location services are enabled on the device
- the region filter matches the beacon UUID, and optionally `major` / `minor`

### No foreground service notification on Android 13+

Add `POST_NOTIFICATIONS` to your runtime permission flow.

### Scanning stops after screen off on Xiaomi / HyperOS

Review [Advanced Android](#advanced-android). `foregroundService: true` may not be enough on some OEM devices.

## License

MIT
