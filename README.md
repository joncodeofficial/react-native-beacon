# react-native-beacon-kit

iBeacon, AltBeacon, and Eddystone-UID for React Native with a hooks-first API, New Architecture support, and real Android background scanning.

> **Platform support:** Android and iOS

[![npm](https://img.shields.io/npm/v/react-native-beacon-kit)](https://www.npmjs.com/package/react-native-beacon-kit)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS-lightgrey)
![New Architecture](https://img.shields.io/badge/New%20Architecture-supported-brightgreen)

- ✅ Hooks-first API (`useBeaconRanging`, `useBeaconMonitoring`, `useMonitorThenRange`)
- ✅ New Architecture (Fabric) ready
- ✅ Expo plugin included
- ✅ Real Android background scanning via foreground service
- ✅ Android 14+ and 16 KB page size (Android 15+) support
- ✅ iBeacon, AltBeacon, and Eddystone-UID
- ✅ Kalman filter for stable distance readings
- ✅ Environment diagnostics built in

## Why this library

Most beacon libraries for React Native are unmaintained or broken on modern Android and iOS. This library was built to fill that gap.

| Feature | react-native-beacon-kit | react-native-beacons-manager |
| ------- | ----------------------- | ---------------------------- |
| Actively maintained | ✅ | ❌ Last updated 3+ years ago |
| New Architecture (Fabric) | ✅ | ❌ |
| Expo plugin | ✅ | ❌ |
| Hooks-first API | ✅ | ❌ Event listeners only |
| Android 14+ support | ✅ | ❌ |
| Android 16 KB page size (Android 15+) | ✅ | ❌ |
| Real Android background scanning | ✅ Foreground service | ⚠️ Unreliable |
| Eddystone-UID | ✅ Android | ❌ |
| Environment diagnostics | ✅ | ❌ |
| Kalman filter for distance | ✅ | ❌ |

## When to use each API

| API                       | Use it when                                                        |
| ------------------------- | ------------------------------------------------------------------ |
| `useBeaconRanging()`      | You want nearby iBeacon/AltBeacon readings, RSSI, and distance     |
| `useBeaconMonitoring()`   | You only need `inside` / `outside` region state                    |
| `useMonitorThenRange()`   | You want monitoring to wake the flow, then range only while inside |
| `useEddystoneRanging()`   | You want nearby Eddystone-UID readings on Android                  |
| `Beacon.*`                | You need custom orchestration or a non-React flow                  |

If you are building a screen in React, start with the hooks API.

## Installation

### React Native (bare)

```sh
npm install react-native-beacon-kit
```

Then for iOS:

```sh
cd ios && pod install
```

### Expo bare workflow

```sh
npx expo install react-native-beacon-kit
```

Add the plugin to your `app.json` or `app.config.js`:

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

Then run prebuild to apply the native changes and install iOS pods:

```sh
npx expo prebuild
```

The plugin automatically adds the required Android permissions, iOS `Info.plist` usage strings, and — if `iosBackgroundLocation` is enabled — the background location mode. It does not request runtime permissions for you.

## Quick start (High-level API)

### Requesting permissions

Call this before starting the scanner. Uses [react-native-permissions](https://github.com/zoontek/react-native-permissions):

```sh
npm install react-native-permissions
```

```ts
import { Platform } from 'react-native';
import { request, PERMISSIONS } from 'react-native-permissions';

async function requestPermissions() {
  if (Platform.OS === 'android') {
    await request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
    if (Platform.Version >= 31) {
      await request(PERMISSIONS.ANDROID.BLUETOOTH_SCAN);
      await request(PERMISSIONS.ANDROID.BLUETOOTH_CONNECT);
    }
  } else {
    await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
  }
}
```

For background scanning or notification permissions, see [Platform setup](#platform-setup).

> [!NOTE]
> This helper doesn't check the result of `request()` — it resolves the same way whether the user grants or denies. Before calling `Beacon.configure()` / `start()` in production, check `Beacon.checkPermissions()` (or the result of `request()`) and handle the denied case explicitly.

### Minimal ranging example

This is the shortest useful flow for most apps:

1. Mount the hook
2. Request permissions
3. Call `Beacon.configure()`
4. Call `start()`

```ts
import { Platform } from 'react-native';
import { request, PERMISSIONS } from 'react-native-permissions';
import { useCallback } from 'react';
import { Button, Text, View } from 'react-native';
import Beacon, { useBeaconRanging } from 'react-native-beacon-kit';

async function requestPermissions() {
  if (Platform.OS === 'android') {
    await request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
    if (Platform.Version >= 31) {
      await request(PERMISSIONS.ANDROID.BLUETOOTH_SCAN);
      await request(PERMISSIONS.ANDROID.BLUETOOTH_CONNECT);
    }
  } else {
    await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
  }
}

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

> [!IMPORTANT]
> On Android SDK 34+, call `Beacon.configure({ foregroundService: true })` only after permissions are granted. Calling it too early can throw a `SecurityException` on a fresh install.

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

For fuller working examples, see the apps in this repository:

- [React Native CLI example](https://github.com/joncodeofficial/react-native-beacon-kit/tree/main/examples/cli)
- [Expo example](https://github.com/joncodeofficial/react-native-beacon-kit/tree/main/examples/expo)

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

If you are using the Expo plugin, these keys are added automatically by `npx expo prebuild`. No manual changes to `Info.plist` are needed.

If you are configuring iOS manually, add these keys to `Info.plist`:

```xml
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>This app uses your location to detect nearby beacons.</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>This app uses your location to detect nearby beacons.</string>
```

For background region monitoring, enable **Location updates** in your target's Background Modes capability. If you are using the Expo plugin, set `iosBackgroundLocation: true` instead and let prebuild handle it.

## Platform behavior and limits

### Android

- Real background scanning requires `foregroundService: true`
- OEM power management can still affect reliability with the screen off
- If you need the strongest background behavior on restrictive devices, see [Advanced Android](#advanced-android)

**Behavior by API level:**

| API level | What changes |
| --------- | ------------ |
| Android 10 (API 29) | `ACCESS_BACKGROUND_LOCATION` must be requested separately at runtime |
| Android 12 (API 31) | `BLUETOOTH_SCAN` and `BLUETOOTH_CONNECT` are required in addition to location |
| Android 13 (API 33) | `POST_NOTIFICATIONS` required to show the foreground service notification |
| Android 14 (API 34) | `FOREGROUND_SERVICE_LOCATION` required for location-type foreground services; calling `configure({ foregroundService: true })` before permissions are granted throws a `SecurityException` |

### iOS

- Continuous background ranging is not supported
- Use monitoring to wake the app, then start ranging during the available execution window
- Android-only options such as `foregroundService`, `aggressiveBackground`, `scanPeriod`, `backgroundScanPeriod`, and `betweenScanPeriod` are ignored on iOS
- **Region limit:** CoreLocation allows a maximum of 20 simultaneously monitored regions per app. If you register more than 20, iOS silently drops the extras. Prefer fewer, broader regions where possible.
- **Simulator:** the iOS Simulator does not have Bluetooth hardware. You need a physical device to scan for beacons.

Typical iOS background pattern:

```ts
Beacon.startMonitoring({ identifier: 'my-region', uuid: '...' });

const sub = Beacon.onRegionStateChanged(({ state }) => {
  if (state === 'inside') {
    Beacon.startRanging({ identifier: 'my-region', uuid: '...' });
  }
});
```

### Beacon identification: UUID vs MAC address

Always use the iBeacon/AltBeacon triplet (`uuid:major:minor`, or
`namespace:instance` for Eddystone) as your primary identifier — it works
across both platforms and beacon types.

`macAddress` reliability depends on what's advertising:

| Source                                  | MAC address                            |
| ---------------------------------------- | --------------------------------------- |
| Hardware beacons (dedicated BLE devices) | ✅ Stable — fixed at manufacture         |
| Android 10+ phone acting as a beacon    | ⚠️ Randomized — rotates periodically     |
| iOS (any source)                        | ❌ Unavailable — OS privacy restriction  |

MAC randomization is a property of the *advertiser*, not the scanner — your
phone just reports whatever MAC the beacon is broadcasting. Dedicated beacon
hardware almost never rotates its MAC, since the whole point of a beacon is
to be reliably identifiable. Use `macAddress` only as secondary metadata
(debugging, RTLS) when you control the hardware.

## API summary

### Hooks

Use these hooks if you are building a React screen.

See them used in a working app:

- [React Native CLI example](https://github.com/joncodeofficial/react-native-beacon-kit/tree/main/examples/cli)
- [Expo example](https://github.com/joncodeofficial/react-native-beacon-kit/tree/main/examples/expo)

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

#### `useEddystoneRanging({ region, autoStart?, stopOnUnmount? })`

Android only. Ranges Eddystone-UID beacons by namespace and optional instance.
The region uses `namespace` and `instance` instead of `uuid`, `major`, and `minor`.

```ts
import { useEddystoneRanging } from 'react-native-beacon-kit';

const region = {
  identifier: 'my-namespace',
  namespace: 'a1b23c45d67e9fab0034',
  instance: '0034567890ab', // optional — omit to match any instance
};

const { beacons, isActive, start, stop } = useEddystoneRanging({ region });
```

Each beacon in the `beacons` array:

```ts
interface EddystoneUidReading {
  namespace: string;  // 10-byte hex string
  instance: string;   // 6-byte hex string
  rssi: number;
  distance: number;
  rawDistance: number;
  txPower: number;
  macAddress: string;
  timestamp: number;
}
```

**Platform note:** iOS does not support Eddystone natively. `useEddystoneRanging` works on Android only. On iOS the hook mounts without error but `beacons` will always be empty.

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
    color?: string,         // e.g. "#4F46E5"
    showStopAction?: boolean, // adds a "Stop" button to the notification
    stopActionText?: string,  // default: "Stop"
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

#### `Beacon.updateNotification({ title?, text? })`

Live-updates the foreground service notification's title/text — e.g. swap the
static `"Scanning for beacons..."` string for a live count. No-op if the
foreground service isn't currently enabled. Android only.

```ts
Beacon.updateNotification({ text: `${beacons.length} beacons nearby` });
```

#### `Beacon.startRanging(region)` / `Beacon.stopRanging(region)`

Starts or stops nearby beacon ranging with RSSI and distance.

#### `Beacon.startMonitoring(region)` / `Beacon.stopMonitoring(region)`

Starts or stops region entry and exit monitoring.

#### Events

- `Beacon.onBeaconsRanged(callback)` — iBeacon / AltBeacon ranging results
- `Beacon.onEddystoneRanged(callback)` — Eddystone-UID ranging results (Android only)
- `Beacon.onRegionStateChanged(callback)`
- `Beacon.onRangingFailed(callback)`
- `Beacon.onMonitoringFailed(callback)`
- `Beacon.onScannerStateChanged(callback)`
- `Beacon.onForegroundServiceStopPressed(callback)` — fired after the user taps "Stop" on the foreground service notification (`showStopAction: true`); all active ranging/monitoring regions and the foreground service are already stopped by the time this fires (Android only)

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

> [!NOTE]
> On Xiaomi/HyperOS devices, this exemption alone is often not enough — pair it with [`openAutostartSettings()`](#oem-settings) to also clear the OEM's autostart restriction.

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

Some Android manufacturers (Xiaomi, Oppo, Vivo, Huawei, Samsung, and others) ship their own battery/app manager on top of stock Android and kill background BLE scanning more aggressively than the standard "ignore battery optimizations" permission can prevent. The only way around it is sending the user to that manufacturer's own "autostart" / "protected apps" screen — there's no standard Android API for this, only proprietary ones per OEM. See https://dontkillmyapp.com for which manufacturers do this and how bad each one is.

`Beacon.openAutostartSettings(target?)` deep-links to a specific screen when you give it the target `Activity`, and falls back to the app's generic system settings screen if you don't (or if the target can't be opened):

```ts
Beacon.openAutostartSettings();

// or, targeting a specific OEM screen:
Beacon.openAutostartSettings({
  packageName: 'com.miui.securitycenter',
  className: 'com.miui.permcenter.autostart.AutoStartManagementActivity',
});
```

Passing `undefined` (or nothing) is a safe fallback — it opens generic system settings on every device. To target the right screen automatically, resolve it from the device manufacturer first:

```ts
import { Platform } from 'react-native';
import Beacon, { type AutostartTarget } from 'react-native-beacon-kit';

const OEM_AUTOSTART_TARGETS: Record<string, AutostartTarget> = {
  xiaomi: {
    packageName: 'com.miui.securitycenter',
    className: 'com.miui.permcenter.autostart.AutoStartManagementActivity',
  },
  samsung: {
    packageName: 'com.samsung.android.lool',
    className: 'com.samsung.android.sm.battery.ui.BatteryActivity',
  },
  // add more as you verify them on real devices
};

function resolveOemAutostartTarget(): AutostartTarget | undefined {
  if (Platform.OS !== 'android') return undefined;
  const manufacturer = Platform.constants.Manufacturer?.toLowerCase() ?? '';
  const match = Object.keys(OEM_AUTOSTART_TARGETS).find((brand) =>
    manufacturer.includes(brand)
  );
  return match ? OEM_AUTOSTART_TARGETS[match] : undefined;
}

Beacon.openAutostartSettings(resolveOemAutostartTarget());
```

> [!WARNING]
> These `packageName`/`className` pairs are proprietary and drift across ROM versions with no notice. This library does not ship or maintain a manufacturer lookup table for that reason — verify any pair on your actual target devices before shipping. See [`examples/cli/src/beaconSetup.ts`](./examples/cli/src/beaconSetup.ts) for this same pattern running in a working app.

> [!IMPORTANT]
> Call `openAutostartSettings()` only from a user-initiated action, not during app startup.

## Background wake-up

When the OS kills your app and a beacon event brings it back, the JS bundle starts completely fresh — no React state, no in-memory store. You need to restore any context your app needs before handling the event.

### Android

With `foregroundService: true`, the process usually stays alive and wake-up restarts are rare. If the user force-kills the app or the OS terminates it under memory pressure, the foreground service is also stopped and no further scanning happens until the app is launched again.

### iOS

Core Location can relaunch your app in the background when a monitored region is crossed. The execution window is short (~5–10 seconds). Check `launchOptions` in your app entry point to detect this case:

```ts
// AppDelegate or your root component on mount
const isBackgroundLaunch =
  launchOptions?.[LocationLaunchOptionsKey.region] != null;
```

If you are using `useMonitorThenRange`, start monitoring as early as possible — before any async work — so the region state is established within the execution window.

### State hydration

React component state does not survive a background relaunch. If your app needs to know about previous beacon context (last known region state, last seen beacon), persist it to `AsyncStorage` or `MMKV` and read it back on startup before your beacon logic runs.

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

## Migrating from react-native-beacons-manager

`react-native-beacons-manager` is no longer maintained and does not support the New Architecture. Here is the equivalent pattern in this library.

### Install

```sh
npm uninstall react-native-beacons-manager
npm install react-native-beacon-kit
```

### Ranging

**Before:**

```ts
import BeaconsManager from 'react-native-beacons-manager';
import { DeviceEventEmitter } from 'react-native';

BeaconsManager.requestAlwaysAuthorization();
BeaconsManager.startRangingBeaconsInRegion('myRegion', 'FDA50693-A4E2-4FB1-AFCF-C6EB07647825');

DeviceEventEmitter.addListener('beaconsDidRange', (data) => {
  console.log(data.beacons);
});
```

**After (hooks):**

```ts
import Beacon, { useBeaconRanging } from 'react-native-beacon-kit';

const { beacons, start } = useBeaconRanging({
  region: { identifier: 'myRegion', uuid: 'FDA50693-A4E2-4FB1-AFCF-C6EB07647825' },
});

// call start() after permissions are granted
```

### Monitoring

**Before:**

```ts
BeaconsManager.startMonitoringForRegion('myRegion', 'FDA50693...');
DeviceEventEmitter.addListener('regionDidEnter', () => { /* ... */ });
DeviceEventEmitter.addListener('regionDidExit', () => { /* ... */ });
```

**After:**

```ts
const { regionState, start } = useBeaconMonitoring({
  region: { identifier: 'myRegion', uuid: 'FDA50693...' },
});
```

### Permissions

`react-native-beacons-manager` had built-in helpers like `requestAlwaysAuthorization()`. This library delegates to [react-native-permissions](https://github.com/zoontek/react-native-permissions). See [Platform setup](#platform-setup) and the [requestPermissions helper](#requesting-permissions) in the quick start.

### What to remove

- Uninstall `react-native-beacons-manager`
- Remove all `DeviceEventEmitter` listener setup for beacons
- Replace `BeaconsManager.requestAlwaysAuthorization()` with the `requestPermissions` helper above

## License

MIT
