# Roadmap

## Next priority: Reliability and validation

This is the most important track before adding more surface area.

### Cross-platform confidence

- [ ] Add iOS build validation in CI
- [ ] Validate on real iPhone hardware
- [ ] Verify Android permissions and behavior on Android 12, 13, and 14
- [ ] Test with multiple beacon vendors:
  - Estimote
  - Kontakt.io
  - Minew

### Test strategy

- [ ] Add stronger cross-platform confidence beyond JS contract tests
- [ ] Add a documented real-device validation matrix for releases

---

## Next priority: Protocol expansion

### Eddystone-UID support

This is the biggest missing capability at the protocol level.

Target outcome:

```ts
{
  type: 'eddystone-uid',
  namespace: 'a1b23c45d67e9fab...',
  instance: '0034567890ab',
  rssi: -65,
  distance: 1.2,
  txPower: -59,
  macAddress: '...',
  timestamp: 123456789,
}
```

Work required:

- [ ] Add Eddystone parser support on Android
- [ ] Design the public reading model first:
  - discriminated union such as `IBeaconReading | EddystoneUidReading`
  - avoid forcing Eddystone into the current `uuid / major / minor` shape
- [ ] Update region/filter types to support Eddystone namespace and instance filtering
- [ ] Document the platform story clearly:
  - Android support expectations
  - iOS limitations or alternative approach if parity is not possible

---

## Mock Provider for testing

Allows injecting fake beacons via code so developers can test UI logic without physical hardware.

- [ ] Design a `MockBeaconProvider` or equivalent injection API
- [ ] Support simulating ranging events with configurable RSSI and distance
- [ ] Support simulating region enter/exit events
- [ ] Document how to use it with Jest and `@testing-library/react-native`

---

## Documentation: background wake-up and state hydration

The library supports background scanning, but there is no guide explaining what to do when the OS kills the app and a beacon event wakes it back up. This is one of the most common sources of confusion for integrators.

### Android

- [ ] Explain the foreground service lifecycle: when it starts, when it stops, and what happens when the user force-kills the app
- [ ] Cover restrictive OEM behavior (Xiaomi, Huawei, Samsung) and when `aggressiveBackground` is needed
- [ ] Explain how to detect that the JS bundle loaded fresh from a background wake-up (no React state, no Redux store)
- [ ] Show how to read persisted state (AsyncStorage / MMKV) on startup to restore the last known beacon context

### iOS

- [ ] Explain how Core Location region monitoring wakes the app in the background
- [ ] Clarify the difference between `didEnterRegion` / `didExitRegion` and `didDetermineState` at launch
- [ ] Explain the `launchOptions` key that signals a background launch triggered by a region event
- [ ] Describe the execution time budget iOS gives the app after a background wake-up

### State hydration patterns

- [ ] Show a Redux example: dispatch a hydration action inside the root component on mount so reducers can seed from persisted storage
- [ ] Show a Zustand example: use `persist` middleware with AsyncStorage / MMKV so the store auto-rehydrates
- [ ] Explain why relying on React component state alone is insufficient in background scenarios

### `aggressiveBackground` deep dive

- [ ] Document exactly which OEMs require it and why
- [ ] Cover the trade-offs: higher battery usage vs. scan reliability
- [ ] Provide a decision guide: when to enable it and when to leave it off

---

## API and core improvements

- [ ] Region-scoped subscription helpers such as `Beacon.onBeaconsRanged('zone-a', callback)`
- [ ] Moving average filter as an alternative to Kalman
- [ ] `useBeaconMap(beaconMap)`

---

## Release checklist

- [ ] Add iOS build validation in CI
- [ ] Validate Android permission behavior on Android 12, 13, and 14
- [ ] Validate on real iOS devices
- [ ] Test with multiple beacon manufacturers
- [ ] Maintain a documented hardware validation matrix for release confidence
