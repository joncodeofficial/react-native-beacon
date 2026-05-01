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

## API and core improvements

- [ ] Moving average filter as an alternative to Kalman

---

## Release checklist

- [ ] Add iOS build validation in CI
- [ ] Validate Android permission behavior on Android 12, 13, and 14
- [ ] Validate on real iOS devices
- [ ] Test with multiple beacon manufacturers
- [ ] Maintain a documented hardware validation matrix for release confidence
